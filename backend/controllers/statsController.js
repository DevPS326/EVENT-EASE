// backend/controllers/statsController.js
const logger = require('../utils/logger');
const Event  = require('../models/Event');
const Ticket = require('../models/Ticket');
const User   = require('../models/User');
const mongoose = require('mongoose');

let cachedStats = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// @desc  Get platform-wide stats (live DB counts)
// @route GET /api/stats/platform
// @access Public
exports.getPlatformStats = async (req, res) => {
  try {
    // Simple in-memory cache to avoid hitting DB on every homepage load
    if (cachedStats && Date.now() < cacheExpiry) {
      return res.json(cachedStats);
    }

    const [totalEvents, totalTicketsSold, totalUsers, totalOrganizers] = await Promise.all([
      Event.countDocuments(),
      Ticket.countDocuments({ status: { $nin: ['cancelled', 'refunded'] } }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: { $in: ['organizer', 'admin'] } }),
    ]);

    cachedStats = { success: true, totalEvents, totalTicketsSold, totalUsers, totalOrganizers };
    cacheExpiry = Date.now() + CACHE_TTL;

    res.json(cachedStats);
  } catch (err) {
    logger.error('[Stats] getPlatformStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc  Admin: list recent users (admin-only)
// @route GET /api/stats/admin/users
// @access Private — admin only
exports.getAdminUserStats = async (req, res) => {
  try {
    const users = await User.find({}, 'name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const roleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, users, roleCounts });
  } catch (err) {
    logger.error('[Stats] getAdminUserStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
