// backend/controllers/paymentController.js
//
// Thin controller — 3 responsibilities only:
//   1. Parse req.body / req.params / req.headers
//   2. Call the appropriate Service layer function
//   3. Return a standardised HTTP response
//
// No Razorpay SDK, no crypto, no DB calls, no business logic live here.

const PaymentService = require('../services/PaymentService');
const BookingService = require('../services/BookingService');

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
    console.error('createOrder error:', err);
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
    console.error('Webhook secret error:', err);
    return sendError(res, 500, err.message);
  }

  if (!isValid) {
    console.warn('Razorpay webhook: signature mismatch — possible spoofing attempt');
    return sendError(res, 400, 'Invalid webhook signature');
  }

  try {
    await PaymentService.processWebhookEvent(
      req.body && req.body.event,
      req.body && req.body.payload
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Always ACK 200 — Razorpay retries indefinitely on any non-2xx response
    return res.status(200).json({ success: true });
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
      console.error('verifyPayment (free) error:', err);
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
    console.error('verifyPayment error:', err);
    return sendError(res, 500, err.message || 'Server error');
  }
};
