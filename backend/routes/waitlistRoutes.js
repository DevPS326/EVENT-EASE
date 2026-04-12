const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { joinWaitlist, leaveWaitlist, getPosition } = require('../controllers/waitlistController');

router.post('/join',     protect, joinWaitlist);
router.delete('/leave',  protect, leaveWaitlist);
router.get('/position',  protect, getPosition);

module.exports = router;
