// backend/models/Review.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    event:   { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    user:    { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    rating:  {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number 1–5' },
    },
    comment: { type: String, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

// One review per user per event
reviewSchema.index({ event: 1, user: 1 }, { unique: true });
// Fast event-scoped list sorted by newest
reviewSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
