// backend/controllers/paymentController.js
'use strict';

const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');
const qrcode = require('qrcode');
const { sendEmail } = require('../utils/emailService');
const { classifyExistingPayment, isDuplicateKeyError } = require('../utils/paymentIdempotency');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function requestError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validSignature(orderId, paymentId, signature) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

// @desc Create Razorpay Order
exports.createOrder = async (req, res) => {
  try {
    if (!req.body.amount) return res.status(400).json({ success: false, message: 'Amount is required' });

    const options = {
      amount: Math.round(req.body.amount * 100), // paise
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
    };

    const order = await instance.orders.create(options);
    return res.json(order);
  } catch (error) {
    console.error('createOrder error:', error);
    return res.status(500).send(error.message || 'Server error');
  }
};

// @desc Verify a paid Razorpay order and issue tickets at most once per payment.
// Unique indexes on Payment.orderId AND Payment.paymentId enforce the invariant
// across parallel requests and across backend instances.
exports.verifyPayment = async (req, res) => {
  const { order_id, payment_id, razorpay_signature, eventId, ticketTypeId, quantity = 1 } = req.body;
  const userId = req.user && req.user.id;
  const count = Number(quantity);

  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (typeof order_id !== 'string' || !order_id ||
      typeof payment_id !== 'string' || !payment_id ||
      !mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(ticketTypeId) ||
      !Number.isSafeInteger(count) || count < 1 || count > 100) {
    return res.status(400).json({ success: false, message: 'Invalid payment or ticket details' });
  }

  if (!validSignature(order_id, payment_id, razorpay_signature)) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  const identity = {
    orderId: order_id, paymentId: payment_id, userId,
    eventId, ticketTypeId, quantity: count
  };
  const lookup = { $or: [{ orderId: order_id }, { paymentId: payment_id }] };

  const respondExisting = (existing) => {
    const outcome = classifyExistingPayment(existing, identity);
    if (outcome.kind === 'replay') {
      return res.status(200).json({
        success: true,
        message: 'Booking already processed',
        idempotentReplay: true,
        ticketIds: outcome.ticketIds
      });
    }
    if (outcome.kind === 'legacy') {
      return res.status(409).json({
        success: false,
        message: 'Payment already processed; existing booking requires reconciliation'
      });
    }
    return res.status(409).json({
      success: false,
      message: 'This Razorpay order or payment was already used for another booking'
    });
  };

  try {
    // Fast path for retries after a successful commit. No tickets or emails are
    // created again. Always verify the signature *before* revealing ticket IDs.
    const existing = await Payment.findOne(lookup).lean();
    if (existing) return respondExisting(existing);

    // Network call stays outside the MongoDB transaction so transient transaction
    // retries do not repeatedly call the payment gateway.
    let paidOrder;
    try {
      paidOrder = await instance.orders.fetch(order_id);
    } catch (_) {
      return res.status(502).json({ success: false, message: 'Unable to verify payment with gateway; retry' });
    }
    if (!paidOrder || paidOrder.id !== order_id ||
        paidOrder.currency !== 'INR' ||
        !Number.isSafeInteger(paidOrder.amount) ||
        paidOrder.amount <= 0 ||
        (paidOrder.amount_paid || 0) < paidOrder.amount) {
      return res.status(400).json({ success: false, message: 'Order is not fully paid or is invalid' });
    }

    let issued = null;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const event = await Event.findById(eventId).session(session);
        if (!event) throw requestError(404, 'Event not found');

        const tier = event.ticketTypes.id(ticketTypeId);
        if (!tier) throw requestError(404, 'Ticket type not found');
        if (tier.available < count) throw requestError(409, 'Not enough tickets available');

        const expectedAmount = tier.price * count;
        if (Math.round(expectedAmount * 100) !== paidOrder.amount) {
          throw requestError(409, 'Payment amount does not match ticket price');
        }

        const user = await User.findById(userId).session(session);
        if (!user) throw requestError(404, 'User not found');

        // Claim the order/payment pair first; duplicate requests cannot both
        // commit because both identifiers have unique database indexes.
        const [payment] = await Payment.create([{
          orderId: order_id,
          paymentId: payment_id,
          signature: razorpay_signature,
          status: 'success',
          user: userId,
          event: eventId,
          ticketType: ticketTypeId,
          quantity: count,
          ticketIds: [],
          amount: expectedAmount
        }], { session });

        // Atomic stock decrement, protected from overselling.
        const updatedEvent = await Event.findOneAndUpdate(
          { _id: eventId, 'ticketTypes._id': ticketTypeId,
            'ticketTypes.available': { $gte: count } },
          { $addToSet: { attendees: userId },
            $inc: { 'ticketTypes.$.available': -count } },
          { new: true, session }
        );
        if (!updatedEvent) throw requestError(409, 'Tickets are no longer available');

        const ticketsToCreate = [];
        const qrCodes = [];

        for (let i = 0; i < count; i++) {
          const ticketId = 'TKT-' + Date.now() + '-' + uuidv4().slice(0, 8);
          const qr = await qrcode.toDataURL(JSON.stringify({
            id: ticketId, evt: event.title, type: tier.name, usr: user.email
          }));
          ticketsToCreate.push({
            event: eventId,
            user: userId,
            ticketType: ticketTypeId,
            ticketTypeName: tier.name,
            price: tier.price,
            eventTitleSnapshot: event.title,
            eventVenueSnapshot: event.venue,
            eventDateSnapshot: event.date,
            ticketId,
            qrCode: qr
          });
          qrCodes.push(qr);
        }

        const created = await Ticket.create(ticketsToCreate, { session });
        const ticketIds = created.map(ticket => ticket._id);
        await User.findByIdAndUpdate(
          userId,
          { $push: { purchasedTickets: { $each: ticketIds } } },
          { session }
        );
        await Payment.updateOne(
          { _id: payment._id },
          { $set: { ticketIds } },
          { session }
        );

        // This value is used only *after* a successful commit.
        issued = { ticketIds, qrCodes, eventTitle: event.title, email: user.email };
      }, { writeConcern: { w: 'majority' } });
    } catch (error) {
      // Another request may have committed while this request was waiting on
      // the unique index. Read its committed result, don't issue tickets again.
      if (isDuplicateKeyError(error)) {
        const existing = await Payment.findOne(lookup).lean();
        if (existing) return respondExisting(existing);
        return res.status(409).json({
          success: false, message: 'Payment is being processed; retry shortly'
        });
      }
      if (error?.hasErrorLabel?.('TransientTransactionError') ||
          error?.hasErrorLabel?.('UnknownTransactionCommitResult')) {
        return res.status(503).json({
          success: false, message: 'Booking status uncertain; retry the same payment details'
        });
      }
      console.error('verifyPayment transaction error:', error);
      return res.status(error.statusCode || 500).json({
        success: false, message: error.statusCode ? error.message : 'Booking failed; retry or contact support'
      });
    } finally {
      await session.endSession();
    }

    // Send once for a newly committed booking; replays do not send new emails.
    // Email delivery is best-effort, not part of the DB transaction.
    Promise.resolve().then(() => sendEmail(
      issued.email,
      'Your Tickets for ' + issued.eventTitle,
      '<h1>Success!</h1><p>You have booked ' + count +
        ' ticket(s) for <strong>' + issued.eventTitle + '</strong>.</p>',
      issued.qrCodes.map((qr, index) => ({
        filename: 'ticket-' + (index + 1) + '.png',
        content: qr.split('base64,')[1],
        encoding: 'base64'
      }))
    )).catch(err => console.error('Email send failed:', err));

    return res.status(200).json({
      success: true,
      message: 'Booking Successful!',
      idempotentReplay: false,
      ticketIds: issued.ticketIds
    });
  } catch (error) {
    console.error('verifyPayment error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify booking; retry' });
  }
};
