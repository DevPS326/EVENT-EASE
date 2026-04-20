// backend/controllers/reviewController.js
//
// Three responsibilities:
//   createReview  — upsert (attendee can edit); validates past event + ticket ownership
//   getEventReviews — paginated list + rating summary; marks caller's own review
//   deleteReview  — owner-only delete

const logger = require('../utils/logger');
const Review = require('../models/Review');
const Event  = require('../models/Event');
const Ticket = require('../models/Ticket');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute { avgRating, totalReviews, ratingBreakdown } for an event. */
async function getRatingSummary(eventId) {
  const agg = await Review.aggregate([
    { $match: { event: eventId } },
    {
      $group: {
        _id:   null,
        avg:   { $avg: '$rating' },
        total: { $sum: 1 },
        r5:    { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        r4:    { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        r3:    { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        r2:    { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        r1:    { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
  ]);

  if (!agg.length) return { avgRating: 0, totalReviews: 0, ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  const { avg, total, r5, r4, r3, r2, r1 } = agg[0];
  return {
    avgRating:       Math.round(avg * 10) / 10,
    totalReviews:    total,
    ratingBreakdown: { 5: r5, 4: r4, 3: r3, 2: r2, 1: r1 },
  };
}

// ─── Create / Update Review ───────────────────────────────────────────────────

/**
 * @desc  Create or update the caller's review for an event
 * @route POST /api/reviews
 * @access Private
 */
exports.createReview = async (req, res) => {
  const { eventId, rating, comment = '' } = req.body;
  const userId = req.user.id;

  if (!eventId || !rating) {
    return res.status(400).json({ success: false, message: 'eventId and rating are required' });
  }

  const ratingInt = parseInt(rating, 10);
  if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be 1–5' });
  }

  try {
    // 1. Event must exist and be in the past
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (new Date(event.date) >= new Date()) {
      return res.status(400).json({ success: false, message: 'You can only review past events' });
    }

    // 2. User must have a ticket for this event
    const hasTicket = await Ticket.exists({ event: eventId, user: userId });
    if (!hasTicket) {
      return res.status(403).json({ success: false, message: 'You must have attended this event to leave a review' });
    }

    // 3. Upsert — one review per user per event (user can edit)
    const review = await Review.findOneAndUpdate(
      { event: eventId, user: userId },
      { rating: ratingInt, comment: comment.trim().slice(0, 500) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const summary = await getRatingSummary(event._id);

    return res.status(200).json({ success: true, review, ...summary });
  } catch (err) {
    logger.error('createReview error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Get Event Reviews ────────────────────────────────────────────────────────

/**
 * @desc  Get paginated reviews for an event + rating summary
 * @route GET /api/events/:id/reviews
 * @access Public
 */
exports.getEventReviews = async (req, res) => {
  const { id: eventId } = req.params;
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || '10', 10)));
  const skip  = (page - 1) * limit;

  try {
    const [reviews, summary] = await Promise.all([
      Review.find({ event: eventId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name')
        .lean(),
      getRatingSummary(require('mongoose').Types.ObjectId.createFromHexString
        ? require('mongoose').Types.ObjectId.createFromHexString(eventId)
        : new (require('mongoose').Types.ObjectId)(eventId)),
    ]);

    // Mark caller's own review so frontend can pre-fill the form
    const callerId = req.user?.id;
    const enriched = reviews.map((r) => ({
      ...r,
      isOwn: callerId && r.user._id.toString() === callerId,
    }));

    return res.status(200).json({
      success: true,
      reviews:  enriched,
      page,
      ...summary,
    });
  } catch (err) {
    logger.error('getEventReviews error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Delete Review ────────────────────────────────────────────────────────────

/**
 * @desc  Delete caller's own review
 * @route DELETE /api/reviews/:id
 * @access Private
 */
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your review' });
    }
    await review.deleteOne();
    return res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (err) {
    logger.error('deleteReview error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
