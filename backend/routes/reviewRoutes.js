const express = require('express');
const router  = express.Router();
const { createReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/',     protect, createReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
