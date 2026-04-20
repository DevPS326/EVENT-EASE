// backend/controllers/waitlistController.js
const logger = require('../utils/logger');
const Waitlist     = require('../models/Waitlist');
const Event        = require('../models/Event');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/emailService');

const sendError = (res, status, msg) => res.status(status).json({ success: false, message: msg });

// ─── Join waitlist ───────────────────────────────────────────────────────────
// @route  POST /api/waitlist/join
// @access Private
exports.joinWaitlist = async (req, res) => {
  const { eventId, ticketTypeId } = req.body;
  const userId = req.user.id;

  if (!eventId || !ticketTypeId) {
    return sendError(res, 400, 'eventId and ticketTypeId are required');
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) return sendError(res, 404, 'Event not found');

    const tier = event.ticketTypes.id(ticketTypeId);
    if (!tier) return sendError(res, 404, 'Ticket tier not found');

    // If there's suddenly availability, don't let them join the waitlist
    if (tier.available > 0) {
      return sendError(res, 400, 'Tickets are available — no need to join the waitlist');
    }

    // upsert-safe: insertOne; unique index prevents duplicates
    const entry = await Waitlist.create({ event: eventId, ticketType: ticketTypeId, user: userId });

    // Return their position
    const position = await Waitlist.countDocuments({
      event: eventId,
      ticketType: ticketTypeId,
      status: 'waiting',
      createdAt: { $lte: entry.createdAt },
    });

    return res.status(201).json({ success: true, position });
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 409, 'You are already on the waitlist for this tier');
    }
    logger.error('joinWaitlist error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// ─── Leave waitlist ──────────────────────────────────────────────────────────
// @route  DELETE /api/waitlist/leave
// @access Private
exports.leaveWaitlist = async (req, res) => {
  const { eventId, ticketTypeId } = req.body;
  const userId = req.user.id;

  try {
    const result = await Waitlist.deleteOne({ event: eventId, ticketType: ticketTypeId, user: userId });
    if (result.deletedCount === 0) return sendError(res, 404, 'You are not on this waitlist');
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('leaveWaitlist error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// ─── Get user's position on a specific waitlist ──────────────────────────────
// @route  GET /api/waitlist/position?eventId=&ticketTypeId=
// @access Private
exports.getPosition = async (req, res) => {
  const { eventId, ticketTypeId } = req.query;
  const userId = req.user.id;

  if (!eventId || !ticketTypeId) {
    return sendError(res, 400, 'eventId and ticketTypeId are required');
  }

  try {
    const entry = await Waitlist.findOne({ event: eventId, ticketType: ticketTypeId, user: userId });
    if (!entry) return res.status(200).json({ onWaitlist: false });

    const position = await Waitlist.countDocuments({
      event: eventId,
      ticketType: ticketTypeId,
      status: 'waiting',
      createdAt: { $lte: entry.createdAt },
    });

    const total = await Waitlist.countDocuments({ event: eventId, ticketType: ticketTypeId, status: 'waiting' });

    return res.status(200).json({ onWaitlist: true, position, total, status: entry.status });
  } catch (err) {
    logger.error('getPosition error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// ─── Auto-promotion helper ───────────────────────────────────────────────────
/**
 * Notify the next person in FIFO waitlist order that a spot has opened.
 * Call this OUTSIDE transactions (non-blocking, fire-and-forget safe).
 *
 * @param {string|ObjectId} eventId
 * @param {string|ObjectId} ticketTypeId
 */
exports.notifyNextInWaitlist = async (eventId, ticketTypeId) => {
  try {
    const nextUser = await Waitlist.findOne({
      event:      eventId,
      ticketType: ticketTypeId,
      status:     'waiting',
    })
      .sort({ createdAt: 1 })          // FIFO — earliest joiner first
      .populate('user',  'name email')
      .populate('event', 'title');

    if (!nextUser || !nextUser.user?.email) return; // no one waiting

    // Atomic status update — prevents double-notification on concurrent calls
    const claimed = await Waitlist.findOneAndUpdate(
      { _id: nextUser._id, status: 'waiting' },    // re-check status atomically
      { $set: { status: 'notified', notifiedAt: new Date() } },
      { new: true }
    );
    if (!claimed) return; // another process already notified this entry

    const eventTitle = nextUser.event?.title || 'your event';
    const bookUrl    = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventId}`;

    // Email notification
    await sendEmail(
      nextUser.user.email,
      `A spot just opened for ${eventTitle}!`,
      `<h2>Good news, ${nextUser.user.name || 'there'}!</h2>
       <p>A ticket for <strong>${eventTitle}</strong> has just become available.</p>
       <p><a href="${bookUrl}" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Book Now</a></p>
       <p style="color:#888;font-size:12px;">Availability is not guaranteed — first come, first served.</p>`
    );

    // In-app notification (non-blocking)
    Notification.create({
      user:    nextUser.user._id,
      type:    'waitlist_spot',
      title:   `Spot Available — ${eventTitle}`,
      message: `A ticket for ${eventTitle} just opened up. Book now!`,
      link:    `/events/${eventId}`,
    }).catch(() => {});

    logger.info(`[Waitlist] Notified ${nextUser.user.email} for "${eventTitle}"`);
  } catch (err) {
    logger.error('[Waitlist] notifyNextInWaitlist error:', err.message);
  }
};
