// backend/models/Notification.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:    {
      type:     String,
      enum:     ['booking_confirmed', 'waitlist_spot', 'event_update'],
      required: true,
    },
    title:   { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 300 },
    link:    { type: String, default: '' },  // frontend route to navigate on click
    isRead:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fast: unread count + recent list per user
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
