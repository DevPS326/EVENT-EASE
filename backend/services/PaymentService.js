// backend/services/PaymentService.js
//
// Owns all Razorpay SDK interactions, HMAC signature logic (both client-flow
// and webhook), and webhook event processing.  Nothing HTTP-specific lives here.

const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Payment = require('../models/Payment');
const Event = require('../models/Event');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Order Creation ──────────────────────────────────────────────────────────

/**
 * Create a Razorpay order using a server-side price calculation.
 * The caller never supplies an amount — price is derived from the DB.
 *
 * @throws {Error} with .statusCode 400 | 404 on validation / not-found errors
 */
const createOrder = async (eventId, ticketTypeId, quantity) => {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    const err = new Error('quantity must be a positive integer');
    err.statusCode = 400;
    throw err;
  }

  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error('Event not found');
    err.statusCode = 404;
    throw err;
  }

  const ticketType = event.ticketTypes.id(ticketTypeId);
  if (!ticketType) {
    const err = new Error('Ticket type not found');
    err.statusCode = 404;
    throw err;
  }

  const serverAmount = ticketType.price * qty; // INR — client cannot influence this

  const order = await instance.orders.create({
    amount: Math.round(serverAmount * 100), // Razorpay expects paise (integer)
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  });

  return order;
};

// ─── Signature Verification ──────────────────────────────────────────────────

/**
 * Verify the Razorpay payment signature for the client-initiated flow.
 * Computed over "orderId|paymentId" using RAZORPAY_KEY_SECRET.
 *
 * @returns {boolean}
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
};

/**
 * Fetch a Razorpay order object for server-to-server amount validation.
 * Used inside verifyPayment to confirm the amount charged matches DB price.
 */
const fetchOrder = async (orderId) => {
  return await instance.orders.fetch(orderId);
};

// ─── Webhook ─────────────────────────────────────────────────────────────────

/**
 * Verify a Razorpay webhook signature over the raw request body bytes.
 * MUST receive the raw Buffer — re-stringified JSON is NOT byte-safe.
 *
 * @throws {Error} if RAZORPAY_WEBHOOK_SECRET is not set in environment
 * @returns {boolean}
 */
const verifyWebhookSignature = (rawBody, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET env var is not configured');
  }
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
};

/**
 * Process a verified Razorpay webhook event payload (idempotent).
 *
 * For payment.captured: creates a fallback Payment record when the
 * client-initiated verifyPayment call never arrived (browser crash, network
 * drop, etc.).  The user/event fields are unknown at webhook time and are
 * stored as placeholder ObjectIds for a reconciliation process to fill in.
 *
 * @param {string} eventType  e.g. 'payment.captured'
 * @param {object} payload    req.body.payload from Razorpay
 */
const processWebhookEvent = async (eventType, payload) => {
  if (!payload) return;

  if (eventType === 'payment.captured') {
    const entity = payload.payment && payload.payment.entity;
    if (!entity) return;

    const { order_id: orderId, id: paymentId, amount } = entity;

    // Idempotency: verifyPayment may have already processed this order
    const existing = await Payment.findOne({ orderId });
    if (!existing) {
      await Payment.create({
        orderId,
        paymentId,
        signature: '',          // webhook has no client-side signature
        status: 'success',
        user: new mongoose.Types.ObjectId(),  // placeholder — reconcile later
        event: new mongoose.Types.ObjectId(), // placeholder — reconcile later
        amount: amount / 100,   // paise → INR
      });
    }
  }
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  fetchOrder,
  verifyWebhookSignature,
  processWebhookEvent,
};
