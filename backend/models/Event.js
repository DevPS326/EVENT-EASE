const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    venue: { type: String, required: true },
    category: { type: String, required: true },
    organizer: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    ticketPrice: { type: Number, default: 0 }, // Kept for backward compatibility
    // attendeesCount: { type: Number, default: 0 }, // OPTIONAL: For faster sorting later
    attendees: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    imageUrl: { type: String, required: true },
    
    // --- NEW FIELD FOR SCHEDULER SAFETY ---
    reminderSent: { type: Boolean, default: false },
    // --------------------------------------

    ticketTypes: [
        {
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
            available: { type: Number, required: true },
        },
    ],
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);