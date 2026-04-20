const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { createOrder, verifyPayment, handleWebhook, requestRefund } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/order', protect, [
  body('eventId').isMongoId().withMessage('Valid eventId required'),
  body('ticketTypeId').isMongoId().withMessage('Valid ticketTypeId required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be ≥ 1'),
], validate, createOrder);

router.route('/verify').post(protect, verifyPayment);

router.post('/refund', protect, [
  body('ticketId').isMongoId().withMessage('Valid ticketId required'),
], validate, requestRefund);

// No JWT protect — Razorpay server calls this directly.
// Authentication is performed inside the handler via HMAC signature.
router.route('/webhook').post(handleWebhook);

module.exports = router;
