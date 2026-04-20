const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/organizerMiddleware');
const { getPlatformStats, getAdminUserStats } = require('../controllers/statsController');

router.get('/platform', getPlatformStats);
router.get('/admin/users', protect, isAdmin, getAdminUserStats);

module.exports = router;
