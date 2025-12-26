const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyTickets, cancelTicket } = require('../controllers/ticketController');

router.route('/my').get(protect, getMyTickets);
router.route('/:id/cancel').put(protect, cancelTicket);

module.exports = router;
