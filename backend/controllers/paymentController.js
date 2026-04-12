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

// @desc    Create Razorpay Order
// @route   POST /api/payments/order
// @access  Private
//
// SECURITY: The client NEVER supplies an amount. We query the DB for the
// canonical ticket price and calculate the total server-side. This prevents
// a client from sending amount:1 to purchase a ₹600 ticket.
exports.createOrder = async (req, res) => {
  const { eventId, ticketTypeId, quantity = 1 } = req.body;

  if (!eventId || !ticketTypeId) {
    return res.status(400).json({ success: false, message: "eventId and ticketTypeId are required" });
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ success: false, message: "quantity must be a positive integer" });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const ticketType = event.ticketTypes.id(ticketTypeId);
    if (!ticketType) return res.status(404).json({ success: false, message: "Ticket type not found" });

    // Server-calculated amount — client-supplied amount is ignored entirely
    const serverAmount = ticketType.price * qty; // INR

    const options = {
      amount: Math.round(serverAmount * 100), // Razorpay expects paise (integer)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await instance.orders.create(options);
    return res.status(200).json(order);

  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// @desc    Razorpay server-to-server webhook handler
// @route   POST /api/payments/webhook
// @access  Public — authenticated via HMAC, NOT JWT
//
// This is a safety-net handler. Razorpay calls this endpoint directly when a
// payment event fires on their end (e.g., browser crash after payment, network
// failure before verifyPayment completes). HMAC is verified over the raw body
// bytes captured by the express.json verify callback in index.js.
exports.handleWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET env var is not set');
    return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
  }

  // Raw body buffer was captured by the express.json verify callback.
  // HMAC must be computed over the exact bytes received — not a re-stringified parse.
  const rawBody = req.rawBody;
  if (!rawBody) {
    return res.status(400).json({ success: false, message: 'Raw body unavailable for verification' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.warn('Razorpay webhook: signature mismatch — possible spoofing attempt');
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  // Signature verified — safe to process the event payload
  const eventType = req.body && req.body.event;

  try {
    if (eventType === 'payment.captured') {
      const paymentEntity = req.body.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      // Idempotency: if verifyPayment already created this record, skip
      const existing = await Payment.findOne({ orderId });
      if (!existing) {
        // Fallback: record the captured payment so reconciliation jobs can
        // detect orders that completed on Razorpay but whose verifyPayment
        // call never arrived (browser crash, network drop, etc.)
        await Payment.create({
          orderId,
          paymentId,
          signature: signature,
          status: 'success',
          // user/event unknown at this point — reconciliation job fills them in
          user: new mongoose.Types.ObjectId(),
          event: new mongoose.Types.ObjectId(),
          amount: paymentEntity.amount / 100, // paise → INR
        });
      }
    }

    // Always ACK with 200 — Razorpay retries on any non-2xx response
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Webhook processing error:', err);
    // Return 200 to prevent Razorpay from flooding with retries on transient errors
    return res.status(200).json({ success: true });
  }
};

// @desc    Verify payment and create tickets
// @route   POST /api/payments/verify
// @access  Private
//
// Security order of operations:
//   1. HMAC signature verification  — pure crypto, no DB, stops bad actors first
//   2. Idempotency gate             — prevents duplicate tickets on retry/double-click
//   3. Razorpay order fetch         — server-to-server amount validation
//   4. ACID transaction             — atomic inventory ($gte guard) + ticket creation
exports.verifyPayment = async (req, res) => {
  const { order_id, payment_id, razorpay_signature, eventId, ticketTypeId, quantity = 1 } = req.body;
  const userId = req.user && req.user.id;

  if (!order_id || !payment_id || !razorpay_signature || !eventId || !ticketTypeId) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ success: false, message: "quantity must be a positive integer" });
  }

  // ─── STEP 1: HMAC Signature Verification ─────────────────────────────────
  // Performed BEFORE any DB access so an attacker cannot probe inventory counts
  // ("Only N tickets left" error) without possessing a valid Razorpay signature.
  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(order_id + "|" + payment_id)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "Invalid payment signature" });
  }

  // ─── STEP 2: Idempotency Gate ─────────────────────────────────────────────
  // If this payment_id was already processed (double-click, webhook retry, etc.)
  // return a 200 immediately — no DB writes, no duplicate tickets.
  const existingPayment = await Payment.findOne({ paymentId: payment_id });
  if (existingPayment) {
    return res.status(200).json({
      success: true,
      message: "Payment already processed",
    });
  }

  // ─── STEP 3: ACID Transaction ─────────────────────────────────────────────
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch event — server source of truth for price and availability
    const event = await Event.findById(eventId).session(session);
    if (!event) throw new Error('Event not found');

    const ticketType = event.ticketTypes.id(ticketTypeId);
    if (!ticketType) throw new Error('Ticket type not found');

    // Server-calculated expected amount (must match what createOrder produced)
    const expectedAmount = ticketType.price * qty; // INR

    // ─── STEP 4: Razorpay server-to-server order validation ──────────────
    // Fetches the order directly from Razorpay to verify the amount that was
    // actually charged matches what our DB says it should be.
    let razorpayOrder;
    try {
      razorpayOrder = await instance.orders.fetch(order_id);
    } catch (err) {
      throw new Error("Failed to fetch order from payment gateway");
    }

    if (!razorpayOrder || typeof razorpayOrder.amount === 'undefined') {
      throw new Error("Invalid order information from payment gateway");
    }

    const expectedAmountPaise = Math.round(expectedAmount * 100);
    if (razorpayOrder.amount !== expectedAmountPaise) {
      throw new Error("Payment amount does not match expected ticket price");
    }

    if ((razorpayOrder.amount_paid || 0) < razorpayOrder.amount) {
      throw new Error("Payment not completed for the order");
    }

    // Fetch the purchasing user inside the transaction
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    // ─── STEP 5: Persist Payment record ──────────────────────────────────
    await Payment.create([{
      orderId: order_id,
      paymentId: payment_id,
      signature: razorpay_signature,
      status: 'success',
      user: userId,
      event: eventId,
      amount: expectedAmount, // server-calculated INR amount, never client-supplied
    }], { session });

    // ─── STEP 6: Build Tickets with snapshot data ─────────────────────────
    // Snapshot fields copy event details at booking time. If the organizer
    // later changes venue/price, existing tickets remain correct.
    const ticketsToCreate = [];
    const qrCodes = [];

    for (let i = 0; i < qty; i++) {
      const tempTicketId = `TKT-${Date.now()}-${uuidv4().slice(0, 8)}`;

      const ticketData = {
        event: eventId,
        user: userId,
        ticketType: ticketTypeId,
        ticketTypeName: ticketType.name,
        price: ticketType.price,
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

    // Update user's purchasedTickets reference array
    await User.findByIdAndUpdate(
      userId,
      { $push: { purchasedTickets: { $each: ticketIds } } },
      { session }
    );

    // ─── STEP 7: Atomic Inventory Deduction — the SOLE availability guard ──
    // The $gte filter is the single source of truth for oversell prevention.
    // There is no soft/pre-check above. If two concurrent requests race here,
    // exactly one will match the filter; the other gets null and aborts.
    const eventUpdate = await Event.findOneAndUpdate(
      {
        _id: eventId,
        'ticketTypes._id': ticketTypeId,
        'ticketTypes.available': { $gte: qty },
      },
      {
        $inc: { 'ticketTypes.$.available': -qty },
      },
      { new: true, session }
    );

    if (!eventUpdate) {
      throw new Error("Insufficient tickets available");
    }

    await session.commitTransaction();
    session.endSession();

    // Send confirmation email non-blocking so it never delays the HTTP response
    sendEmail(
      user.email,
      `Your Tickets for ${event.title}`,
      `<h1>Booking Confirmed!</h1><p>You booked ${qty} ticket(s) for <strong>${event.title}</strong>.</p><p>QR codes attached below.</p>`,
      qrCodes.map((qr, index) => ({
        filename: `ticket-${index + 1}.png`,
        content: qr.split('base64,')[1],
        encoding: 'base64',
      }))
    ).catch(err => console.error("Email send failed:", err));

    return res.status(200).json({
      success: true,
      message: "Booking Successful!",
      ticketIds,
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
