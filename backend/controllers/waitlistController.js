// backend/controllers/waitlistController.js
const Waitlist = require('../models/Waitlist');
const Event    = require('../models/Event');

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
    console.error('joinWaitlist error:', err);
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
    console.error('leaveWaitlist error:', err);
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
    console.error('getPosition error:', err);
    return sendError(res, 500, 'Server error');
  }
};
