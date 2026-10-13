const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    paymentId: { type: String, required: true },
    signature: { type: String, required: true },
    status: { type: String, enum: ['success', 'failure'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    ticketType: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
    ticketIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }],
    amount: { type: Number, required: true }
}, { timestamps: true });

// Database-enforced idempotency: one booking per order/payment, even across
// multiple server instances. Both indexes must exist before accepting traffic.
PaymentSchema.index({ orderId: 1 }, { unique: true, name: 'uniq_razorpay_order' });
PaymentSchema.index({ paymentId: 1 }, { unique: true, name: 'uniq_razorpay_payment' });

module.exports = mongoose.model('Payment', PaymentSchema);
