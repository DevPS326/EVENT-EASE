// backend/controllers/notificationController.js
const Notification = require('../models/Notification');

// ─── Get notifications ────────────────────────────────────────────────────────

/**
 * @desc  Get recent notifications for the authenticated user
 * @route GET /api/notifications
 * @access Private
 */
exports.getNotifications = async (req, res) => {
  const userId = req.user.id;
  const limit  = Math.min(30, Math.max(1, parseInt(req.query.limit || '20', 10)));

  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user: userId, isRead: false }),
    ]);

    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Mark one as read ─────────────────────────────────────────────────────────

/**
 * @desc  Mark a single notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
exports.markRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, notification: notif });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Mark all as read ─────────────────────────────────────────────────────────

/**
 * @desc  Mark all notifications as read for the authenticated user
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('markAllRead error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
