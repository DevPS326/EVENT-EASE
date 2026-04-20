const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { addToWishlist, removeFromWishlist, getWishlist, getUserProfile, updateUserProfile, getMyProfile } = require('../controllers/userController');

// Self-profile — authenticated user's own data without knowing their _id
router.route('/profile').get(protect, getMyProfile);
router.route('/wishlist').get(protect, getWishlist);
router.route('/wishlist/:eventId').post(protect, addToWishlist).delete(protect, removeFromWishlist);
// Must come AFTER static routes (profile, dashboard, wishlist) to avoid /:id swallowing them
router.route('/:id').get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;
