// backend/controllers/eventController.js
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { stringify } = require('csv-stringify');
const { sendEmail } = require('../utils/emailService');

// ----------------- CREATE EVENT ----------------- //
// @desc    Create a new event
// @route   POST /api/events/create
exports.createEvent = async (req, res) => {
    const { title, description, date, venue, category, ticketTypes, imageUrl } = req.body;

    try {
        // --- VALIDATION BLOCK ---
        if (!title || !description || !date || !venue || !ticketTypes || !imageUrl) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const eventDate = new Date(date);
        if (isNaN(eventDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        
        if (eventDate < new Date()) {
            return res.status(400).json({ message: 'Event date cannot be in the past' });
        }

        if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
            return res.status(400).json({ message: 'At least one ticket tier is required' });
        }

        const formattedTickets = ticketTypes.map((type, index) => {
            if (!type || typeof type !== 'object') {
                throw new Error(`Invalid ticket type at position ${index + 1}`);
            }

            const name = (type.name || '').toString().trim();
            const price = Number(type.price);
            const quantity = Number(type.quantity);

            if (!name) throw new Error(`Name required for ticket tier ${index + 1}`);
            if (isNaN(price) || price < 0) throw new Error(`Invalid price for ticket tier ${index + 1}`);
            if (isNaN(quantity) || quantity < 1) throw new Error(`Invalid quantity for ticket tier ${index + 1}`);

            return {
                name,
                price,
                quantity,
                available: quantity
            };
        });

        const event = new Event({
            title: title.toString().trim(),
            description: description.toString().trim(),
            date: eventDate,
            venue: venue.toString().trim(),
            category: (category || 'general').toString().trim(),
            ticketTypes: formattedTickets,
            imageUrl: imageUrl.toString().trim(),
            organizer: req.user.id
        });

        const createdEvent = await event.save();
        res.status(201).json(createdEvent);

    } catch (error) {
        // Handle validation errors specifically
        if (error.message && (error.message.includes('Invalid') || error.message.includes('required'))) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Error creating event:', error);
        res.status(500).json({ message: "Server Error: " + error.message });
    }
};

// ----------------- GET ALL EVENTS (FIXED FILTER LOGIC) ----------------- //
// @desc    Get all events with filtering and sorting
// @route   GET /api/events
exports.getAllEvents = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, startDate, endDate, sortBy, order } = req.query;
        let matchStage = {};

        // 1. Build Filter Query (Match Stage)
        if (search) {
            matchStage.$or = [
                { title: { $regex: search, $options: 'i' } },
                { venue: { $regex: search, $options: 'i' } },
            ];
        }

        // --- FIX: Ignore 'All Categories' so it doesn't filter out everything ---
        if (category && category !== 'All Categories' && category !== '') {
            matchStage.category = category;
        }

        if (minPrice || maxPrice) {
            matchStage['ticketTypes.price'] = {};
            if (minPrice) matchStage['ticketTypes.price'].$gte = parseFloat(minPrice);
            if (maxPrice) matchStage['ticketTypes.price'].$lte = parseFloat(maxPrice);
        }

        if (startDate || endDate) {
            matchStage.date = {};
            if (startDate) matchStage.date.$gte = new Date(startDate);
            if (endDate) matchStage.date.$lte = new Date(endDate);
        }

        // 2. Build Aggregation Pipeline
        const pipeline = [
            { $match: matchStage },
            // Compute attendeesCount from the Ticket collection.
            // The Event.attendees array has been removed to prevent the 16MB document limit
            // on large events; ticket sales are the authoritative source of attendance.
            {
                $lookup: {
                    from: 'tickets',
                    localField: '_id',
                    foreignField: 'event',
                    as: '_ticketSales',
                }
            },
            { $addFields: { attendeesCount: { $size: '$_ticketSales' } } },
            { $unset: '_ticketSales' }, // drop raw array immediately — keep only the count
        ];

        // 3. Sorting
        const sortDirection = order === 'desc' ? -1 : 1;
        if (sortBy === 'popularity') {
            pipeline.push({ $sort: { attendeesCount: sortDirection } });
        } else {
            // Default sort by date
            pipeline.push({ $sort: { date: sortDirection } });
        }

        // 4. Lookup Organizer (Populate)
        pipeline.push(
            {
                $lookup: {
                    from: 'users',
                    localField: 'organizer',
                    foreignField: '_id',
                    as: 'organizer'
                }
            },
            { 
                $unwind: { 
                    path: '$organizer', 
                    preserveNullAndEmptyArrays: true 
                } 
            },
            // Project only necessary fields (exclude password/sensitive data)
            {
                $project: {
                    title: 1, description: 1, date: 1, venue: 1, category: 1,
                    imageUrl: 1, ticketTypes: 1, attendeesCount: 1,
                    'organizer._id': 1, 'organizer.name': 1, 'organizer.email': 1
                }
            }
        );

        const events = await Event.aggregate(pipeline);
        res.json(events);

    } catch (error) {
        console.error('Error fetching all events:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ----------------- GET SINGLE EVENT ----------------- //
// @desc    Get single event by ID
// @route   GET /api/events/:id
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('organizer', 'name email');
        if (event) {
            res.json(event);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        console.error('Error fetching event by ID:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ----------------- UPDATE EVENT ----------------- //
// @desc    Update an event
// @route   PUT /api/events/update/:id
exports.updateEvent = async (req, res) => {
    const { title, description, date, venue, category, ticketTypes, imageUrl } = req.body;

    try {
        const event = await Event.findById(req.params.id);

        if (event) {
            if (event.organizer.toString() !== req.user.id) {
                return res.status(401).json({ message: 'User not authorized' });
            }

            const originalDate = new Date(event.date);
            const originalVenue = event.venue;

            event.title = title || event.title;
            event.description = description || event.description;
            event.date = date || event.date;
            event.venue = venue || event.venue;
            event.category = category || event.category;
            event.imageUrl = imageUrl || event.imageUrl;

            // Handle ticketTypes update safely
            if (ticketTypes) {
                if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
                    return res.status(400).json({ message: 'ticketTypes must be a non-empty array' });
                }
                const validated = ticketTypes.map((type, index) => {
                    const name = (type.name || '').toString().trim();
                    const price = Number(type.price);
                    const quantity = Number(type.quantity);

                    if (!name) throw new Error(`Name required for tier ${index + 1}`);
                    if (isNaN(price) || price < 0) throw new Error(`Invalid price for tier ${index + 1}`);
                    if (isNaN(quantity) || quantity < 1) throw new Error(`Invalid quantity for tier ${index + 1}`);

                    // Preserve sold count: available = new quantity minus already-sold tickets
                    const existing   = event.ticketTypes.find(t => t.name === name);
                    const soldCount  = existing ? Math.max(0, (existing.quantity || 0) - (existing.available || 0)) : 0;
                    const available  = Math.max(0, quantity - soldCount);

                    return { name, price, quantity, available };
                });
                event.ticketTypes = validated;
            }

            const updatedEvent = await event.save();

            // Send notification if critical info changed
            if (originalDate.getTime() !== new Date(updatedEvent.date).getTime() || originalVenue !== updatedEvent.venue) {
                // Derive attendees from the Ticket collection (attendees array removed from Event)
                const attendeeUserIds = await Ticket.find({ event: updatedEvent._id }).distinct('user');
                const attendees = await User.find({ _id: { $in: attendeeUserIds } }, 'name email');

                await Promise.all(attendees.map(attendee => {
                    const subject = `Event Update: ${updatedEvent.title}`;
                    const htmlContent = `
                        <p>Hi ${attendee.name},</p>
                        <p>The event <strong>${updatedEvent.title}</strong> has been updated:</p>
                        <p><strong>New Date & Time:</strong> ${new Date(updatedEvent.date).toLocaleString()}</p>
                        <p><strong>New Venue:</strong> ${updatedEvent.venue}</p>
                        <p>Best regards,<br>The EventEase Team</p>
                    `;
                    return sendEmail(attendee.email, subject, htmlContent).catch(e => console.error(e));
                }));
            }

            res.json(updatedEvent);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        console.error('Error updating event:', error);
        if (error.message && (error.message.includes('Invalid') || error.message.includes('required'))) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Server Error" });
    }
};

// ----------------- DELETE EVENT (With Cleanup) ----------------- //
// @desc    Delete an event
// @route   DELETE /api/events/delete/:id
exports.deleteEvent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const event = await Event.findById(req.params.id).session(session);

        if (!event) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.organizer.toString() !== req.user.id) {
            await session.abortTransaction();
            session.endSession();
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Capture ticket IDs and unique attendee user IDs BEFORE deletion.
        // Previously this used event.attendees (removed) and also had a bug where
        // ticket IDs were queried AFTER Ticket.deleteMany (returning nothing).
        const ticketsForEvent = await Ticket.find({ event: event._id }, '_id user').session(session);
        const ticketIds = ticketsForEvent.map(t => t._id);
        const uniqueUserIds = [...new Set(ticketsForEvent.map(t => t.user.toString()))];
        const attendees = await User.find({ _id: { $in: uniqueUserIds } }, 'name email').session(session);

        // Delete related Tickets
        await Ticket.deleteMany({ event: event._id }).session(session);

        // Remove ticket references from users' purchasedTickets
        if (ticketIds.length > 0) {
            await User.updateMany(
                { _id: { $in: uniqueUserIds } },
                { $pull: { purchasedTickets: { $each: ticketIds } } }
            ).session(session);
        }

        await event.deleteOne({ session });

        await session.commitTransaction();
        session.endSession();

        // Send Emails (Non-blocking)
        attendees.forEach(attendee => {
            const subject = `Event Cancellation: ${event.title}`;
            const htmlContent = `
                <p>Hi ${attendee.name},</p>
                <p>We regret to inform you that <strong>${event.title}</strong> has been cancelled.</p>
                <p>Contact support for refunds.</p>
                <p>The EventEase Team</p>
            `;
            sendEmail(attendee.email, subject, htmlContent).catch(err => console.error(err));
        });

        res.json({ message: 'Event and related data removed' });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error deleting event:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ----------------- ORGANIZER EVENTS ----------------- //
// @desc    Get all events created by the logged-in organizer
// @route   GET /api/events/organizer
exports.getOrganizerEvents = async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user.id })
            .populate('organizer', 'name email')
            .sort({ createdAt: -1 }); // Sort by newest created
        res.json(events);
    } catch (error) {
        console.error('Error fetching organizer events:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ----------------- ANALYTICS ----------------- //
// @desc    Get analytics for a specific event
// @route   GET /api/events/:id/analytics
exports.getEventAnalytics = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const tickets = await Ticket.find({ event: req.params.id });
        let totalRevenue = 0;
        const ticketTypeSales = {};

        // Initialize sales map
        event.ticketTypes.forEach(type => {
            ticketTypeSales[type.name] = { 
                sold: 0, 
                revenue: 0, 
                price: type.price, 
                totalQuantity: type.quantity, 
                available: type.available 
            };
        });

        // Calculate
        tickets.forEach(ticket => {
            let typeName = ticket.ticketTypeName;

            if (!typeName) {
                const type = event.ticketTypes.id(ticket.ticketType);
                if (type) typeName = type.name;
            }

            if (typeName && ticketTypeSales[typeName]) {
                ticketTypeSales[typeName].sold += 1;
                ticketTypeSales[typeName].revenue += ticket.price;
                totalRevenue += ticket.price;
            }
        });

        res.json({
            totalTicketsSold: tickets.length,
            totalRevenue,
            ticketTypeSales,
            eventCapacity: event.ticketTypes.reduce((acc, type) => acc + (type.quantity || 0), 0),
            ticketsAvailable: event.ticketTypes.reduce((acc, type) => acc + (type.available || 0), 0),
        });

    } catch (error) {
        console.error('Error fetching event analytics:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ----------------- EXPORT CSV ----------------- //
// @desc    Export attendee list as CSV
// @route   GET /api/events/:id/attendees/export
exports.exportAttendeesCSV = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

        const Payment = require('../models/Payment');

        const [tickets, payments] = await Promise.all([
            Ticket.find({ event: req.params.id }).populate('user', 'name email'),
            Payment.find({ event: req.params.id }, 'orderId promoCode').lean(),
        ]);

        // Build a map from orderId → promoCode for quick lookup
        // Tickets don't store orderId, so we match by ticketId prefix or just pull all payments
        // Since Payment.event is indexed, this is fast even for large events
        const promoByTicketId = {};
        payments.forEach(p => {
            if (p.promoCode) promoByTicketId[p._id.toString()] = p.promoCode;
        });

        const data = tickets.map(ticket => ({
            'Ticket ID':      ticket.ticketId || ticket._id.toString(),
            'User Name':      ticket.user ? ticket.user.name : 'N/A',
            'User Email':     ticket.user ? ticket.user.email : 'N/A',
            'Ticket Type':    ticket.ticketTypeName || 'Standard',
            'Price Paid':     ticket.price === 0 ? 'Free' : `₹${ticket.price}`,
            'Purchase Date':  ticket.createdAt ? ticket.createdAt.toLocaleString('en-IN') : 'N/A',
            'Status':         ticket.status,
            'Check-In Time':  ticket.checkedInAt ? ticket.checkedInAt.toLocaleString('en-IN') : '—',
            'Promo Code':     promoByTicketId[ticket._id.toString()] || '—',
        }));

        const columns = [
            { key: 'Ticket ID',     header: 'Ticket ID' },
            { key: 'User Name',     header: 'User Name' },
            { key: 'User Email',    header: 'User Email' },
            { key: 'Ticket Type',   header: 'Ticket Type' },
            { key: 'Price Paid',    header: 'Price Paid' },
            { key: 'Purchase Date', header: 'Purchase Date' },
            { key: 'Status',        header: 'Status' },
            { key: 'Check-In Time', header: 'Check-In Time' },
            { key: 'Promo Code',    header: 'Promo Code' },
        ];

        stringify(data, { header: true, columns }, (err, output) => {
            if (err) throw err;
            const safeName = event.title.replace(/[^a-zA-Z0-9]/g, '_');
            const dateStr  = new Date().toISOString().slice(0, 10);
            res.header('Content-Type', 'text/csv');
            res.attachment(`${safeName}_attendees_${dateStr}.csv`);
            res.send(output);
        });

    } catch (error) {
        console.error('Error exporting attendees:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};