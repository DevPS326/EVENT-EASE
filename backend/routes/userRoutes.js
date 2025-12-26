const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getDashboardData, addToWishlist, removeFromWishlist, getWishlist, getUserProfile, updateUserProfile } = require('../controllers/userController');

router.route('/dashboard').get(protect, getDashboardData);
router.route('/wishlist').get(protect, getWishlist);
router.route('/wishlist/:eventId').post(protect, addToWishlist).delete(protect, removeFromWishlist);
router.route('/:id').get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;
