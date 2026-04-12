const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema({
  event:      { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketType: { type: mongoose.Schema.Types.ObjectId, required: true }, // subdoc _id inside event.ticketTypes
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  status:     { type: String, enum: ['waiting', 'notified', 'expired'], default: 'waiting' },
  notifiedAt: { type: Date },
}, { timestamps: true });

// One entry per user+event+tier
WaitlistSchema.index({ event: 1, ticketType: 1, user: 1 }, { unique: true });
// FIFO position queries: sort by createdAt within event+tier+status
WaitlistSchema.index({ event: 1, ticketType: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model('Waitlist', WaitlistSchema);
