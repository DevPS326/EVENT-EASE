const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, handleWebhook } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/order').post(protect, createOrder);
router.route('/verify').post(protect, verifyPayment);

// No JWT protect — Razorpay server calls this directly.
// Authentication is performed inside the handler via HMAC signature.
router.route('/webhook').post(handleWebhook);

module.exports = router;
