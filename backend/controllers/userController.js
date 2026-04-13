const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

// @desc    Get user dashboard data (upcoming events, past bookings)
// @route   GET /api/users/dashboard
exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        const tickets = await Ticket.find({ user: userId })
            .populate({
                path: 'event',
                select: 'title date venue imageUrl',
                populate: {
                    path: 'organizer',
                    select: 'name email'
                }
            })
            .populate('ticketType');

        const now = new Date();
        const upcomingEvents = [];
        const pastBookings = [];

        tickets.forEach(ticket => {
            if (ticket.event.date > now) {
                upcomingEvents.push({ ticket, event: ticket.event, ticketType: ticket.ticketType });
            } else {
                pastBookings.push({ ticket, event: ticket.event, ticketType: ticket.ticketType });
            }
        });

        res.status(200).json({ upcomingEvents, pastBookings });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get own profile (no _id needed — resolved from JWT)
// @route   GET /api/users/profile
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('[UserController] getMyProfile error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user profile
// @route   GET /api/users/:id
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.name = req.body.name || user.name;

            // IIT ISM domain restriction — prevent email change to non-campus address
            if (req.body.email !== undefined) {
                const emailNormalized = req.body.email.trim().toLowerCase();
                if (!emailNormalized.endsWith('@iitism.ac.in')) {
                    return res.status(403).json({
                        message: 'Only IIT ISM emails (@iitism.ac.in) are allowed.',
                    });
                }
                user.email = emailNormalized;
            }

            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Add event to user's wishlist
// @route   POST /api/users/wishlist/:eventId
exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.wishlist.includes(eventId)) {
            user.wishlist.push(eventId);
            await user.save();
        }

        res.status(200).json({ message: 'Event added to wishlist', wishlist: user.wishlist });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Remove event from user's wishlist
// @route   DELETE /api/users/wishlist/:eventId
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.wishlist = user.wishlist.filter(id => id.toString() !== eventId);
        await user.save();

        res.status(200).json({ message: 'Event removed from wishlist', wishlist: user.wishlist });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get user's wishlist
// @route   GET /api/users/wishlist
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate('wishlist');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user.wishlist);
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ message: "Server Error" });
    }
};
