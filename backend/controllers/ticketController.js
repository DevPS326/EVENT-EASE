const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');

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
    console.error('Error fetching user tickets:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

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
      const eventId = ticket.event;
      const ticketTypeId = ticket.ticketType;

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
        console.warn(`Event or ticketType missing when cancelling ticket ${id}. eventId=${eventId}, ticketTypeId=${ticketTypeId}`);
        // No throw — we still remove ticket and user's purchased reference.
      }

      // 4) Remove ticket reference from user's purchasedTickets
      const userUpdateResult = await User.updateOne(
        { _id: req.user.id },
        { $pull: { purchasedTickets: id } }
      ).session(session);

      // userUpdateResult.nModified may be 0 if user didn't have the ticket reference; that's okay but log
      if (userUpdateResult.matchedCount === 0) {
        console.warn(`User not found while removing purchasedTickets entry for user ${req.user.id}`);
      }

      // All operations succeeded within transaction block
    }, {
      // Optional: specify read/write concern, writeConcern: { w: 'majority' } if needed
    });

    // if we reach here, transaction committed
    return res.status(200).json({ message: 'Ticket cancelled successfully' });

  } catch (err) {
    // If we threw structured error, use it; otherwise 500
    console.error('Error cancelling ticket:', err);

    // Attempt abort if session still in transaction (withTransaction auto-aborts on exception, but safe)
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch (e) {
      console.error('Error aborting transaction:', e);
    }

    const status = (err && err.status) ? err.status : 500;
    const message = (err && err.message) ? err.message : 'Server Error';
    return res.status(status).json({ message: `Server Error: ${message}` });

  } finally {
    session.endSession();
  }
};
