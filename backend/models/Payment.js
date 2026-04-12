const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    paymentId: { type: String, required: true },
    signature: { type: String, required: true },
    status: { type: String, enum: ['success', 'failure'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    amount:    { type: Number, required: true },
    promoCode: { type: String, default: null },  // code string if a discount was applied
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);