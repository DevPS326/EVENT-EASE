const logger = require('../utils/logger');
const mongoose = require('mongoose');
const crypto   = require('crypto');
const Ticket       = require('../models/Ticket');
const Event        = require('../models/Event');
const User         = require('../models/User');
const Waitlist     = require('../models/Waitlist');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/emailService');

/**
 * @desc  Check in a ticket by its string ticketId (the TKT-... value in the QR)
 * @route PATCH /api/tickets/:ticketId/checkin
 * @access Private — organizer only (organizerMiddleware applied in route)
 */
exports.checkInTicket = async (req, res) => {
  const { ticketId } = req.params;
  const { qrRaw }    = req.body; // optional: raw QR JSON string for HMAC verification

  try {
    // ── Optional HMAC signature verification ─────────────────────────────
    if (qrRaw) {
      try {
        const parsed = JSON.parse(qrRaw);
        if (parsed.p && parsed.s) {
          const secret   = process.env.QR_SECRET || process.env.JWT_SECRET;
          const expected = crypto.createHmac('sha256', secret).update(parsed.p).digest('hex');
          if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.s))) {
            return res.status(400).json({ success: false, code: 'invalid_token', message: 'QR signature invalid' });
          }
        }
      } catch {
        return res.status(400).json({ success: false, code: 'invalid_token', message: 'Malformed QR data' });
      }
    }

    const ticket = await Ticket.findOne({ ticketId }).populate('event', 'organizer title date');
    if (!ticket) {
      return res.status(404).json({ success: false, code: 'not_found', message: 'Ticket not found' });
    }

    // Verify the calling organizer owns this event
    const eventOrganizerId = ticket.event?.organizer?.toString?.() || ticket.event?.organizer;
    if (eventOrganizerId !== req.user.id && eventOrganizerId !== req.user._id?.toString()) {
      return res.status(403).json({ success: false, message: 'You do not manage this event' });
    }

    // ── Timestamp validation ──────────────────────────────────────────────
    const eventDate = ticket.event?.date || ticket.eventDateSnapshot;
    if (eventDate) {
      const now        = Date.now();
      const eventTime  = new Date(eventDate).getTime();
      if (now < eventTime - 2 * 60 * 60 * 1000) { // more than 2h before event
        return res.status(400).json({ success: false, code: 'too_early', message: 'Check-in opens 2 hours before the event' });
      }
      if (now > eventTime + 6 * 60 * 60 * 1000) { // more than 6h after event
        return res.status(400).json({ success: false, code: 'expired', message: 'Event has ended — check-in window closed' });
      }
    }

    if (ticket.status === 'checked-in' || ticket.status === 'attended') {
      return res.status(200).json({
        success: true,
        alreadyCheckedIn: true,
        checkedInAt: ticket.checkedInAt,
        ticket: {
          ticketId: ticket.ticketId,
          ticketTypeName: ticket.ticketTypeName,
          eventTitle: ticket.event?.title || ticket.eventTitleSnapshot,
        },
      });
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return res.status(400).json({ success: false, code: 'cancelled', message: `Ticket has been ${ticket.status}` });
    }

    ticket.status = 'attended';
    ticket.checkedInAt = new Date();
    await ticket.save();

    return res.status(200).json({
      success: true,
      alreadyCheckedIn: false,
      checkedInAt: ticket.checkedInAt,
      ticket: {
        ticketId: ticket.ticketId,
        ticketTypeName: ticket.ticketTypeName,
        eventTitle: ticket.event?.title || ticket.eventTitleSnapshot,
      },
    });
  } catch (err) {
    logger.error('checkInTicket error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc Get all tickets for logged-in user
 * @route GET /api/tickets/my
 */
exports.getMyTickets = async (req, res) => {
  try {
    // Ensure authentication middleware sets req.user.id
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    // Use lean() if you don't need mongoose documents (faster)
    const tickets = await Ticket.find({ user: req.user.id })
      .populate({ path: 'event', select: 'title date venue imageUrl' })
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const upcomingEvents = [];
    const pastBookings = [];

    tickets.forEach(ticket => {
      const eventTitle = ticket.event ? ticket.event.title : (ticket.eventTitleSnapshot || 'Unknown Event');
      const eventDate = ticket.event ? new Date(ticket.event.date) : (ticket.eventDateSnapshot ? new Date(ticket.eventDateSnapshot) : new Date(0));
      const eventVenue = ticket.event ? ticket.event.venue : (ticket.eventVenueSnapshot || 'Unknown Venue');
      const eventImage = ticket.event ? ticket.event.imageUrl : 'https://via.placeholder.com/400x200?text=Event+Deleted';
      const ticketName = ticket.ticketTypeName || (ticket.ticketType ? ticket.ticketType.name : 'Standard');

      const ticketObj = {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        qrCode: ticket.qrCode,
        price: ticket.price,
        ticketType: { name: ticketName },
        event: {
          title: eventTitle,
          date: eventDate,
          venue: eventVenue,
          imageUrl: eventImage
        }
      };

      if (eventDate > now) {
        upcomingEvents.push({ ticket: ticketObj, event: ticketObj.event, ticketType: ticketObj.ticketType });
      } else {
        pastBookings.push({ ticket: ticketObj, event: ticketObj.event, ticketType: ticketObj.ticketType });
      }
    });

    return res.status(200).json({ upcomingEvents, pastBookings });
  } catch (err) {
    logger.error('Error fetching user tickets:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Waitlist notification helper (non-blocking, called outside transactions) ──
async function notifyWaitlist(eventId, ticketTypeId) {
  const entry = await Waitlist.findOne({ event: eventId, ticketType: ticketTypeId, status: 'waiting' })
    .sort({ createdAt: 1 })
    .populate('user', 'name email')
    .populate('event', 'title');

  if (!entry || !entry.user?.email) return;

  const eventTitle = entry.event?.title || 'your event';
  const bookUrl    = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventId}`;

  await sendEmail(
    entry.user.email,
    `A spot just opened for ${eventTitle}!`,
    `<h2>Good news, ${entry.user.name || 'there'}!</h2>
     <p>A ticket for <strong>${eventTitle}</strong> has just become available.</p>
     <p>Book your spot now before it's gone — this notification was sent to you because you joined the waitlist.</p>
     <p><a href="${bookUrl}" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Book Now</a></p>
     <p style="color:#888;font-size:12px;">Note: availability is not guaranteed — first come, first served.</p>`
  );

  entry.status     = 'notified';
  entry.notifiedAt = new Date();
  await entry.save();

  // In-app notification alongside the email (non-blocking)
  Notification.create({
    user:    entry.user._id,
    type:    'waitlist_spot',
    title:   `Spot Available — ${eventTitle}`,
    message: `A ticket for ${eventTitle} just opened up. Book now before it's gone!`,
    link:    `/events/${eventId}`,
  }).catch(() => {});
}

/**
 * @desc Cancel a ticket (atomic)
 * @route PUT /api/tickets/:id/cancel
 */
exports.cancelTicket = async (req, res) => {
  const { id } = req.params;

  // Basic auth guard
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  // IMPORTANT: MongoDB transactions require replica set (or Atlas). Make sure your DB supports transactions.
  const session = await mongoose.startSession();

  // Hoisted so waitlist notification can access them after the transaction commits
  let cancelledEventId    = null;
  let cancelledTicketTypeId = null;

  try {
    // Use withTransaction: it will retry transient errors and commits/aborts automatically.
    let userRemovedFromEvent = false;
    await session.withTransaction(async () => {
      // 1) Fetch the ticket inside the session
      const ticket = await Ticket.findById(id).session(session);
      if (!ticket) {
        // Throw object with status so outer catch can format response
        throw { status: 404, message: 'Ticket not found' };
      }

      // Authorization
      if (ticket.user.toString() !== req.user.id) {
        throw { status: 403, message: 'Not authorized to cancel this ticket' };
      }

      // Snapshot IDs (in case event or ticketType was removed)
      const eventId      = ticket.event;
      const ticketTypeId = ticket.ticketType;
      cancelledEventId      = eventId;
      cancelledTicketTypeId = ticketTypeId;

      // 2) Delete the ticket (check deletion)
      const delResult = await Ticket.deleteOne({ _id: id }).session(session);
      if (delResult.deletedCount !== 1) {
        throw { status: 500, message: 'Failed to delete ticket' };
      }

      // 3) Increment available for ticketType (attendees array removed from Event schema)
      const eventUpdateResult = await Event.updateOne(
        { _id: eventId, 'ticketTypes._id': ticketTypeId },
        { $inc: { 'ticketTypes.$.available': 1 } }
      ).session(session);

      // It's acceptable if matchedCount === 0 (event or ticketType removed). We just log:
      if (eventUpdateResult.matchedCount === 0) {
        logger.warn(`Event or ticketType missing when cancelling ticket ${id}. eventId=${eventId}, ticketTypeId=${ticketTypeId}`);
        // No throw — we still remove ticket and user's purchased reference.
      }

      // 4) Remove ticket reference from user's purchasedTickets
      const userUpdateResult = await User.updateOne(
        { _id: req.user.id },
        { $pull: { purchasedTickets: id } }
      ).session(session);

      // userUpdateResult.nModified may be 0 if user didn't have the ticket reference; that's okay but log
      if (userUpdateResult.matchedCount === 0) {
        logger.warn(`User not found while removing purchasedTickets entry for user ${req.user.id}`);
      }

      // All operations succeeded within transaction block
    }, {
      // Optional: specify read/write concern, writeConcern: { w: 'majority' } if needed
    });

    // ── Notify first person on waitlist (non-blocking, outside transaction) ──
    if (cancelledEventId && cancelledTicketTypeId) {
      notifyWaitlist(cancelledEventId, cancelledTicketTypeId).catch(() => {});
    }

    return res.status(200).json({ message: 'Ticket cancelled successfully' });

  } catch (err) {
    // If we threw structured error, use it; otherwise 500
    logger.error('Error cancelling ticket:', err);

    // Attempt abort if session still in transaction (withTransaction auto-aborts on exception, but safe)
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch (e) {
      logger.error('Error aborting transaction:', e);
    }

    const status = (err && err.status) ? err.status : 500;
    const message = (err && err.message) ? err.message : 'Server Error';
    return res.status(status).json({ message: `Server Error: ${message}` });

  } finally {
    session.endSession();
  }
};
