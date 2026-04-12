const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isOrganizer } = require('../middleware/organizerMiddleware');
const { getMyTickets, cancelTicket, checkInTicket } = require('../controllers/ticketController');

router.route('/my').get(protect, getMyTickets);
router.route('/:id/cancel').put(protect, cancelTicket);
router.route('/:ticketId/checkin').patch(protect, isOrganizer, checkInTicket);

module.exports = router;
