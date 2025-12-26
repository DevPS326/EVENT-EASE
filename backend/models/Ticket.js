const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    ticketType: { type: mongoose.Schema.ObjectId, required: true }, 
    
    // --- SNAPSHOT FIELDS (Fixed Item #10 & #18) ---
    // These store the details as they were AT THE TIME OF BOOKING.
    // Even if the organizer updates the event later, the ticket remains valid.
    ticketTypeName: { type: String, required: true }, 
    price: { type: Number, required: true }, // This acts as priceSnapshot
    eventTitleSnapshot: { type: String },
    eventVenueSnapshot: { type: String },
    eventDateSnapshot: { type: Date },
    // ----------------------------------------------

    ticketId: { type: String, unique: true },
    qrCode: { type: String }, 
    status: { type: String, enum: ['booked', 'cancelled', 'checked-in'], default: 'booked' },
}, { timestamps: true });

// Auto-generate unique Ticket ID
TicketSchema.pre('save', function(next) {
    if (!this.ticketId) {
        // Generates something like: EVT-171500000-AB12
        const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.ticketId = `TKT-${Date.now()}-${uniqueSuffix}`;
    }
    next();
});

module.exports = mongoose.model('Ticket', TicketSchema);