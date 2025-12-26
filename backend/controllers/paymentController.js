// backend/controllers/paymentController.js

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

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc Create Razorpay Order
exports.createOrder = async (req, res) => {
  try {
    if (!req.body.amount) return res.status(400).json({ success: false, message: "Amount is required" });

    const options = {
      amount: Math.round(req.body.amount * 100), // paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await instance.orders.create(options);
    return res.json(order);
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).send(error.message || "Server error");
  }
};

// @desc Verify payment and create ticket (server-side amount verification + snapshots)
exports.verifyPayment = async (req, res) => {
  // We expect quantity to be passed, default to 1 if missing
  const { order_id, payment_id, razorpay_signature, eventId, ticketTypeId, quantity = 1 } = req.body;
  const userId = req.user && req.user.id;

  if (!order_id || !payment_id || !razorpay_signature || !eventId || !ticketTypeId) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Fetch event + ticketType from DB (server source of truth)
    const event = await Event.findById(eventId).session(session);
    if (!event) throw new Error('Event not found');

    const ticketType = event.ticketTypes.id(ticketTypeId);
    if (!ticketType) throw new Error('Ticket type not found');

    // Server-side expected amount (INR)
    const expectedAmount = ticketType.price * Number(quantity); // numeric INR
    if (ticketType.available < quantity) {
      throw new Error(`Only ${ticketType.available} tickets left`);
    }

    // 2) Verify signature authenticity (required)
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(order_id + "|" + payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      throw new Error("Invalid Payment Signature");
    }

    // 3) OPTIONAL but STRONG: Fetch order from Razorpay and validate amounts
    // This prevents manipulation where a client supplies a different amount or a different order id.
    let razorpayOrder;
    try {
      razorpayOrder = await instance.orders.fetch(order_id);
    } catch (err) {
      // If fetch fails, we still abort for safety
      throw new Error("Failed to fetch order from payment gateway");
    }

    // Razorpay stores amounts in paise (integer)
    const expectedAmountPaise = Math.round(expectedAmount * 100);
    // order.amount is the order amount in paise as created; order.amount_paid is total paid in paise
    if (!razorpayOrder || typeof razorpayOrder.amount === 'undefined') {
      throw new Error("Invalid order information from payment gateway");
    }

    // Ensure the ORDER's amount equals or is <= expectedAmountPaise (defensive check)
    // Usually you create the order with exact amount, so this should match.
    if (razorpayOrder.amount !== expectedAmountPaise) {
      // If you create order client-side, this is a sign of mismatch/tampering
      throw new Error("Payment amount does not match expected ticket price");
    }

    // Optionally also check amount_paid is at least order.amount
    if ((razorpayOrder.amount_paid || 0) < razorpayOrder.amount) {
      throw new Error("Payment not completed for the order");
    }

    // 4) Load user
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    // 5) Persist Payment using server-calculated expectedAmount (INR)
    const paymentRecord = await Payment.create([{
      orderId: order_id,
      paymentId: payment_id,
      signature: razorpay_signature,
      status: 'success',
      user: userId,
      event: eventId,
      amount: expectedAmount // store as INR
    }], { session });

    // 6) Create Tickets with snapshot data
    const ticketsToCreate = [];
    const qrCodes = [];

    for (let i = 0; i < quantity; i++) {
      const tempTicketId = `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`; // unique temporary id

      const ticketData = {
        event: eventId,
        user: userId,
        ticketType: ticketTypeId,
        ticketTypeName: ticketType.name,
        price: ticketType.price,
        eventTitleSnapshot: event.title,
        eventVenueSnapshot: event.venue,
        eventDateSnapshot: event.date,
        ticketId: tempTicketId
      };

      const qrData = JSON.stringify({
        id: tempTicketId,
        evt: event.title,
        type: ticketType.name,
        usr: user.email
      });

      ticketData.qrCode = await qrcode.toDataURL(qrData);

      ticketsToCreate.push(ticketData);
      qrCodes.push(ticketData.qrCode);
    }

    const createdTickets = await Ticket.create(ticketsToCreate, { session });
    const ticketIds = createdTickets.map(t => t._id);

    // 7) Update user purchased tickets
    await User.findByIdAndUpdate(userId, { $push: { purchasedTickets: { $each: ticketIds } } }, { session });

    // 8) Update event availability and attendees atomically
    const eventUpdate = await Event.findOneAndUpdate(
      { _id: eventId, 'ticketTypes._id': ticketTypeId, 'ticketTypes.available': { $gte: quantity } },
      {
        $push: { attendees: userId },
        $inc: { 'ticketTypes.$.available': -quantity }
      },
      { new: true, session }
    );

    if (!eventUpdate) {
      throw new Error("Failed to update event availability (possibly insufficient tickets)");
    }

    await session.commitTransaction();
    session.endSession();

    // 9) Send email asynchronously (non-blocking)
    sendEmail(
      user.email,
      `Your Tickets for ${event.title}`,
      `<h1>Success!</h1><p>You have booked ${quantity} ticket(s) for <strong>${event.title}</strong>.</p><p>Find your QR codes attached below.</p>`,
      qrCodes.map((qr, index) => ({
        filename: `ticket-${index + 1}.png`,
        content: qr.split('base64,')[1],
        encoding: 'base64'
      }))
    ).catch(err => console.error("Email send failed:", err));

    return res.status(200).json({
      success: true,
      message: "Booking Successful!",
      ticketIds: ticketIds
    });

  } catch (error) {
    console.error("verifyPayment error:", error);
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch (abortErr) {
      console.error("Error aborting transaction:", abortErr);
    } finally {
      session.endSession();
    }
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
