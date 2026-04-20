// backend/controllers/paymentController.js
//
// Thin controller — 3 responsibilities only:
//   1. Parse req.body / req.params / req.headers
//   2. Call the appropriate Service layer function
//   3. Return a standardised HTTP response
//
// No Razorpay SDK, no crypto, no DB calls, no business logic live here.

const logger = require('../utils/logger');
const PaymentService    = require('../services/PaymentService');
const BookingService    = require('../services/BookingService');
const RefundService     = require('../services/RefundService');
const Ticket            = require('../models/Ticket');
const Payment           = require('../models/Payment');
const Event             = require('../models/Event');
const TransactionLog    = require('../models/TransactionLog');
const Notification      = require('../models/Notification');

// Consistent error response helper
const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

// ─── Create Razorpay Order ───────────────────────────────────────────────────

// @desc    Create Razorpay Order (server-side price calculation)
// @route   POST /api/payments/order
// @access  Private
exports.createOrder = async (req, res) => {
  const { eventId, ticketTypeId, quantity = 1, promoCode = null } = req.body;

  if (!eventId || !ticketTypeId) {
    return sendError(res, 400, 'eventId and ticketTypeId are required');
  }

  try {
    const order = await PaymentService.createOrder(eventId, ticketTypeId, quantity, promoCode);

    // Free ticket: PaymentService bypassed Razorpay — return immediately so the
    // frontend skips the Razorpay checkout UI and goes straight to verifyPayment
    // with isFree: true.
    if (order.isFree || order.amount === 0) {
      return res.status(200).json({
        isFree:   true,
        amount:   0,
        currency: 'INR',
        id:       order.id,
        promoCode: order.promoCode || null,
      });
    }

    return res.status(200).json(order);
  } catch (err) {
    logger.error('createOrder error:', err);
    return sendError(res, err.statusCode || 500, err.message || 'Server error');
  }
};

// ─── Razorpay Webhook ────────────────────────────────────────────────────────

// @desc    Razorpay server-to-server webhook
// @route   POST /api/payments/webhook
// @access  Public (HMAC-authenticated inside handler, NOT JWT)
exports.handleWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) return sendError(res, 400, 'Missing x-razorpay-signature header');
  if (!req.rawBody) return sendError(res, 400, 'Raw body unavailable for verification');

  let isValid;
  try {
    isValid = PaymentService.verifyWebhookSignature(req.rawBody, signature);
  } catch (err) {
    logger.error('Webhook secret error:', err);
    return sendError(res, 500, err.message);
  }

  if (!isValid) {
    logger.warn('Razorpay webhook: signature mismatch — possible spoofing attempt');
    return sendError(res, 400, 'Invalid webhook signature');
  }

  try {
    await PaymentService.processWebhookEvent(
      req.body && req.body.event,
      req.body && req.body.payload
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Webhook processing error:', err);
    // Always ACK 200 — Razorpay retries indefinitely on any non-2xx response
    return res.status(200).json({ success: true });
  }
};

// ─── Refund ──────────────────────────────────────────────────────────────────

// @desc    Cancel a ticket and initiate Razorpay refund
// @route   POST /api/payments/refund
// @access  Private
exports.requestRefund = async (req, res) => {
  const { ticketId } = req.body;
  const userId = req.user?.id;

  if (!ticketId) return sendError(res, 400, 'ticketId is required');
  if (!userId)   return sendError(res, 401, 'Unauthorized');

  try {
    const ticket = await Ticket.findById(ticketId).populate('event', 'title date');
    if (!ticket)                           return sendError(res, 404, 'Ticket not found');
    if (ticket.user.toString() !== userId) return sendError(res, 403, 'Not authorized');
    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return sendError(res, 400, 'Ticket is already cancelled or refunded');
    }

    // Enforce refund window
    try {
      RefundService.assertRefundWindow(ticket.event?.date || ticket.eventDateSnapshot);
    } catch (winErr) {
      return sendError(res, 400, winErr.message);
    }

    // Find original payment record to get the Razorpay paymentId
    const payment = await Payment.findOne({ event: ticket.event._id, user: userId })
      .sort({ createdAt: -1 });

    const razorpayPaymentId = payment?.paymentId || null;
    const refundAmount      = ticket.price;

    const refund = await RefundService.initiateRefund(
      razorpayPaymentId,
      refundAmount,
      `Cancellation for ${ticket.event?.title || ticket.eventTitleSnapshot}`
    );

    // Update ticket status
    ticket.status       = 'refunded';
    ticket.refundId     = refund.id || null;
    ticket.refundAmount = refundAmount;
    await ticket.save();

    // Log the transaction (non-blocking)
    TransactionLog.create({
      user:       userId,
      event:      ticket.event._id,
      ticket:     ticket._id,
      type:       'refund',
      amount:     refundAmount,
      status:     'success',
      gatewayRef: refund.id || null,
    }).catch(() => {});

    // In-app notification
    Notification.create({
      user:    userId,
      type:    'refund_processed',
      title:   'Refund Initiated',
      message: refundAmount > 0
        ? `Your refund of ₹${refundAmount} for ${ticket.event?.title || ticket.eventTitleSnapshot} has been initiated.`
        : `Your free ticket for ${ticket.event?.title || ticket.eventTitleSnapshot} has been cancelled.`,
      link: '/dashboard',
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: refundAmount > 0 ? 'Refund initiated successfully' : 'Free ticket cancelled',
      refundId: refund.id || null,
      amount: refundAmount,
    });

  } catch (err) {
    logger.error('requestRefund error:', err);
    return sendError(res, 500, err.message || 'Server error processing refund');
  }
};

// ─── Verify Payment & Create Tickets ────────────────────────────────────────

// @desc    Verify payment signature and run booking transaction
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  const {
    isFree,
    order_id,
    payment_id,
    razorpay_signature,
    eventId,
    ticketTypeId,
    quantity = 1,
    promoCode = null,
  } = req.body;
  const userId = req.user && req.user.id;

  if (!eventId || !ticketTypeId) {
    return sendError(res, 400, 'Missing required fields');
  }
  if (!userId) return sendError(res, 401, 'Unauthorized');

  // ── Free ticket fast-path (no Razorpay signature or order fetch needed) ──
  if (isFree) {
    const freeOrderId  = `free_${Date.now()}`;
    const freePaymentId = `free_pay_${Date.now()}`;
    try {
      const { ticketIds } = await BookingService.createBooking({
        orderId:      freeOrderId,
        paymentId:    freePaymentId,
        signature:    'free',
        eventId,
        ticketTypeId,
        quantity,
        userId,
        razorpayOrder: { amount: 0, amount_paid: 0 },
        promoCode,
      });
      return res.status(200).json({ success: true, message: 'Booking Successful!', ticketIds });
    } catch (err) {
      logger.error('verifyPayment (free) error:', err);
      return sendError(res, 500, err.message || 'Server error');
    }
  }

  if (!order_id || !payment_id || !razorpay_signature) {
    return sendError(res, 400, 'Missing required fields');
  }

  // ── 1. HMAC signature verification (pure crypto, no DB) ────────────────
  // First gate: attacker without a valid Razorpay signature gets 400 here
  // and never reaches the inventory or idempotency checks.
  if (!PaymentService.verifyPaymentSignature(order_id, payment_id, razorpay_signature)) {
    return sendError(res, 400, 'Invalid payment signature');
  }

  // ── 2. Idempotency gate (read-only, no transaction opened) ────────────
  // Double-click or webhook retry returns 200 immediately — no DB writes,
  // no duplicate tickets.
  const existing = await BookingService.checkIdempotency(payment_id);
  if (existing) {
    return res.status(200).json({ success: true, message: 'Payment already processed' });
  }

  // ── 3. Server-to-server Razorpay order fetch ───────────────────────────
  // BookingService validates the amount internally — we just supply the data.
  let razorpayOrder;
  try {
    razorpayOrder = await PaymentService.fetchOrder(order_id);
  } catch (err) {
    return sendError(res, 500, 'Failed to fetch order from payment gateway');
  }
  if (!razorpayOrder || typeof razorpayOrder.amount === 'undefined') {
    return sendError(res, 500, 'Invalid order information from payment gateway');
  }

  // ── 4. ACID booking transaction ────────────────────────────────────────
  // All DB writes (Payment, Ticket × qty, inventory decrement) happen inside
  // a single session. BookingService handles abort on any failure.
  try {
    const { ticketIds } = await BookingService.createBooking({
      orderId:  order_id,
      paymentId: payment_id,
      signature: razorpay_signature,
      eventId,
      ticketTypeId,
      quantity,
      userId,
      razorpayOrder,
      promoCode,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking Successful!',
      ticketIds,
    });
  } catch (err) {
    logger.error('verifyPayment error:', err);
    return sendError(res, 500, err.message || 'Server error');
  }
};
