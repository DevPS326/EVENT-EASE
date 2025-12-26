const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: function() { return !this.googleId; }, select: false },
    googleId: { type: String },
    role: { type: String, enum: ['user', 'organizer', 'admin'], default: 'user' },
    is2FAEnabled: { type: Boolean, default: false },
    twoFACode: String,
    twoFACodeExpires: Date,
    purchasedTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
}, { timestamps: true });

// Encrypt password
UserSchema.pre('save', async function(next) {
    // FIX: Add 'return' to stop execution if password is not modified
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Match password
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);