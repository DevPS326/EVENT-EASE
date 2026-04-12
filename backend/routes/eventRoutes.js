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

// ── Static / prefixed routes FIRST (must come before /:id) ──────────────────
router.get('/',                                             getAllEvents);
router.post('/create',    protect, isOrganizer,            createEvent);

// /organizer MUST be declared before /:id — otherwise Express catches it as a param
router.get('/organizer',  protect, isOrganizer,            getOrganizerEvents);

// ── Parameterised routes ─────────────────────────────────────────────────────
router.get('/:id',                                         getEventById);
router.put('/:id',        protect, isOrganizer,            updateEvent);
router.delete('/:id',     protect, isOrganizer,            deleteEvent);
router.get('/:id/analytics',          protect, isOrganizer, getEventAnalytics);
router.get('/:id/attendees/export',   protect, isOrganizer, exportAttendeesCSV);

// ── Legacy paths (kept for backward-compat with any existing client calls) ──
router.put('/update/:id',    protect, isOrganizer, updateEvent);
router.delete('/delete/:id', protect, isOrganizer, deleteEvent);

module.exports = router;
