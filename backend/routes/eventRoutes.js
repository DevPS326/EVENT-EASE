const express = require('express');
const router = express.Router();
const {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getOrganizerEvents,
    getEventAnalytics,
    exportAttendeesCSV
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { isOrganizer } = require('../middleware/organizerMiddleware');

router.route('/').get(getAllEvents);
router.route('/create').post(protect, isOrganizer, createEvent);
router.route('/:id').get(getEventById);
router.route('/update/:id').put(protect, isOrganizer, updateEvent);
router.route('/delete/:id').delete(protect, isOrganizer, deleteEvent);
router.route('/organizer').get(protect, isOrganizer, getOrganizerEvents);
router.route('/:id/analytics').get(protect, isOrganizer, getEventAnalytics);
router.route('/:id/attendees/export').get(protect, isOrganizer, exportAttendeesCSV);

module.exports = router;
