// backend/services/RefundService.js
//
// Handles Razorpay refund initiation and cancellation window enforcement.
// All DB state changes happen in the caller (paymentController) to keep
// this service focused on the gateway interaction only.

const logger = require('../utils/logger');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const REFUND_WINDOW_HOURS = 24; // no refunds within 24h of event

/**
 * Enforce the cancellation window rule.
 * @param {Date} eventDate
 * @throws if event is within 24h or already past
 */
const assertRefundWindow = (eventDate) => {
  const now  = Date.now();
  const diff = new Date(eventDate).getTime() - now;
  if (diff < 0) {
    throw new Error('Cannot refund a ticket for a past event');
  }
  if (diff < REFUND_WINDOW_HOURS * 60 * 60 * 1000) {
    throw new Error(`Refunds are not available within ${REFUND_WINDOW_HOURS} hours of the event`);
  }
};

/**
 * Initiate a Razorpay refund for a paid ticket.
 * @param {string} paymentId  - Razorpay payment_id from the original Payment record
 * @param {number} amount     - Amount in INR (converted to paise internally)
 * @param {string} notes      - Human-readable reason
 * @returns {object} Razorpay refund object
 */
const initiateRefund = async (paymentId, amount, notes = 'User-requested cancellation') => {
  if (!paymentId || paymentId.startsWith('free_')) {
    // Free tickets have no Razorpay payment — nothing to refund
    return { id: null, amount: 0, isFree: true };
  }

  const refund = await razorpay.payments.refund(paymentId, {
    amount: Math.round(amount * 100), // paise
    notes:  { reason: notes },
    speed:  'normal',
  });

  return refund;
};

module.exports = { assertRefundWindow, initiateRefund };
