// backend/services/BookingService.js
//
// Owns the complete booking lifecycle:
//   - Idempotency check (pre-transaction read)
//   - ACID transaction wrapping all DB writes
//   - Atomic inventory deduction via $gte guard (sole oversell protection)
//   - Snapshot ticket generation (event details captured at booking time)
//   - Confirmation email dispatch (non-blocking, outside transaction)
//
// Nothing HTTP-specific (req/res) lives here.

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode');

const Payment      = require('../models/Payment');
const Ticket       = require('../models/Ticket');
const Event        = require('../models/Event');
const User         = require('../models/User');
const DiscountCode = require('../models/DiscountCode');
const { sendEmail } = require('../utils/emailService');

// ─── Idempotency ─────────────────────────────────────────────────────────────

/**
 * Check whether a payment has already been fully processed.
 * Call this BEFORE opening a transaction to avoid unnecessary DB locks.
 *
 * @returns {Payment|null}
 */
const checkIdempotency = async (paymentId) => {
  return await Payment.findOne({ paymentId });
};

// ─── Booking Transaction ─────────────────────────────────────────────────────

/**
 * Execute the full booking within a single ACID transaction.
 *
 * Steps (all inside one session):
 *   1. Fetch event — server source of truth for price
 *   2. Validate razorpayOrder amount vs server-calculated price
 *   3. Persist Payment record
 *   4. Generate Ticket documents with snapshot fields
 *   5. Update User.purchasedTickets
 *   6. Atomic inventory deduction with $gte guard
 *
 * On any failure the transaction is aborted and the error is re-thrown
 * so the controller can return the appropriate HTTP status.
 *
 * @param {object}  params
 * @param {string}  params.orderId
 * @param {string}  params.paymentId
 * @param {string}  params.signature
 * @param {string}  params.eventId
 * @param {string}  params.ticketTypeId
 * @param {number}  params.quantity
 * @param {string}  params.userId
 * @param {object}  params.razorpayOrder  Full order object from PaymentService.fetchOrder
 * @returns {{ ticketIds: import('mongoose').Types.ObjectId[] }}
 */
const createBooking = async ({
  orderId,
  paymentId,
  signature,
  eventId,
  ticketTypeId,
  quantity,
  userId,
  razorpayOrder,
  promoCode = null,
}) => {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error('quantity must be a positive integer');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── 1. Fetch event (canonical price and availability source) ──────────
    const event = await Event.findById(eventId).session(session);
    if (!event) throw new Error('Event not found');

    const ticketType = event.ticketTypes.id(ticketTypeId);
    if (!ticketType) throw new Error('Ticket type not found');

    // ── 2. Amount validation (server-calculated vs Razorpay order) ────────
    // Confirms the Razorpay order was created with the correct price.
    // If a promo code was applied, re-validate it here and use the discounted amount.
    let expectedAmount = ticketType.price * qty; // INR (base)
    if (promoCode) {
      const discount = await DiscountCode.findOne({ code: promoCode.toUpperCase().trim(), isActive: true });
      if (discount && !discount.validate()) {
        if (!discount.eventId || discount.eventId.toString() === eventId.toString()) {
          expectedAmount = discount.applyTo(expectedAmount);
        }
      }
    }
    const expectedAmountPaise = Math.round(expectedAmount * 100);

    if (razorpayOrder.amount !== expectedAmountPaise) {
      throw new Error('Payment amount does not match expected ticket price');
    }
    // For free tickets (amount === 0) amount_paid is also 0 — skip the check
    if (razorpayOrder.amount > 0 && (razorpayOrder.amount_paid || 0) < razorpayOrder.amount) {
      throw new Error('Payment not completed for the order');
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    // ── 3. Persist Payment record ─────────────────────────────────────────
    await Payment.create([{
      orderId,
      paymentId,
      signature,
      status:    'success',
      user:      userId,
      event:     eventId,
      amount:    expectedAmount, // server-calculated INR amount (post-discount) — never client-supplied
      promoCode: promoCode || null,
    }], { session });

    // ── 4. Build Ticket documents with snapshot data ───────────────────────
    // Snapshot fields copy event details at booking time so that if the
    // organizer later changes venue/price, existing tickets remain correct.
    const ticketsToCreate = [];
    const qrCodes = [];

    for (let i = 0; i < qty; i++) {
      const tempTicketId = `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`;

      const ticketData = {
        event: eventId,
        user: userId,
        ticketType: ticketTypeId,
        ticketTypeName: ticketType.name,
        price: ticketType.price,           // price snapshot at booking time
        eventTitleSnapshot: event.title,
        eventVenueSnapshot: event.venue,
        eventDateSnapshot: event.date,
        ticketId: tempTicketId,
      };

      const qrData = JSON.stringify({
        id: tempTicketId,
        evt: event.title,
        type: ticketType.name,
        usr: user.email,
      });

      ticketData.qrCode = await qrcode.toDataURL(qrData);
      ticketsToCreate.push(ticketData);
      qrCodes.push(ticketData.qrCode);
    }

    const createdTickets = await Ticket.create(ticketsToCreate, { session });
    const ticketIds = createdTickets.map(t => t._id);

    // ── 5. Update user's purchasedTickets reference list ──────────────────
    await User.findByIdAndUpdate(
      userId,
      { $push: { purchasedTickets: { $each: ticketIds } } },
      { session }
    );

    // ── 6. Atomic inventory deduction — the SOLE oversell guard ───────────
    // No soft/pre-check exists above. If two concurrent requests race here,
    // exactly one matches the $gte filter; the other receives null and this
    // transaction aborts cleanly.
    const eventUpdate = await Event.findOneAndUpdate(
      {
        _id: eventId,
        'ticketTypes._id': ticketTypeId,
        'ticketTypes.available': { $gte: qty },
      },
      { $inc: { 'ticketTypes.$.available': -qty } },
      { new: true, session }
    );

    if (!eventUpdate) throw new Error('Insufficient tickets available');

    await session.commitTransaction();
    session.endSession();

    // ── 7. Increment promo code usedCount (outside transaction, non-blocking) ──
    if (promoCode) {
      DiscountCode.findOneAndUpdate(
        { code: promoCode.toUpperCase().trim() },
        { $inc: { usedCount: 1 } }
      ).catch(err => console.error('Failed to increment promo usedCount:', err));
    }

    // ── 8. Send confirmation email (outside transaction, non-blocking) ────
    sendEmail(
      user.email,
      `Your Tickets for ${event.title}`,
      `<h1>Booking Confirmed!</h1><p>You booked ${qty} ticket(s) for <strong>${event.title}</strong>.</p><p>QR codes attached below.</p>`,
      qrCodes.map((qr, index) => ({
        filename: `ticket-${index + 1}.png`,
        content: qr.split('base64,')[1],
        encoding: 'base64',
      }))
    ).catch(err => console.error('Email send failed:', err));

    return { ticketIds };

  } catch (error) {
    // Abort transaction on any failure, then re-throw for the controller
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch (abortErr) {
      console.error('Error aborting transaction:', abortErr);
    } finally {
      session.endSession();
    }
    throw error;
  }
};

module.exports = { checkIdempotency, createBooking };
