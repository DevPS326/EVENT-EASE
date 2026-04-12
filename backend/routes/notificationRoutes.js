const express = require('express');
const router  = express.Router();
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/',                protect, getNotifications);
router.patch('/read-all',      protect, markAllRead);       // must come before /:id/read
router.patch('/:id/read',      protect, markRead);

module.exports = router;
