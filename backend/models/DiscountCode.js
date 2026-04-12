const mongoose = require('mongoose');

const DiscountCodeSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType:  { type: String, enum: ['percentage', 'flat'], required: true },
  discountValue: { type: Number, required: true, min: 0 }, // % (0-100) or flat INR amount
  eventId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null }, // null = platform-wide
  usageLimit:    { type: Number, default: null },  // null = unlimited
  usedCount:     { type: Number, default: 0 },
  expiresAt:     { type: Date,   default: null },  // null = never expires
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

// Fast lookup by code + active status (hot path on every order creation)
DiscountCodeSchema.index({ code: 1, isActive: 1 });

/**
 * Apply this code to a price and return the discounted amount (>= 0).
 */
DiscountCodeSchema.methods.applyTo = function (originalAmount) {
  if (this.discountType === 'percentage') {
    const pct = Math.min(this.discountValue, 100);
    return Math.max(0, originalAmount * (1 - pct / 100));
  }
  // flat
  return Math.max(0, originalAmount - this.discountValue);
};

/**
 * Validate that this code is currently usable (active, not expired, under limit).
 * Returns null on success, or an error string.
 */
DiscountCodeSchema.methods.validate = function () {
  if (!this.isActive) return 'Promo code is inactive';
  if (this.expiresAt && new Date() > this.expiresAt) return 'Promo code has expired';
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) return 'Promo code usage limit reached';
  return null;
};

module.exports = mongoose.model('DiscountCode', DiscountCodeSchema);
