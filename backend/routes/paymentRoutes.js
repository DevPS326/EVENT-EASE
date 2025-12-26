const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/order').post(protect, createOrder);
router.route('/verify').post(protect, verifyPayment);

module.exports = router;
