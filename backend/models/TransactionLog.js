const mongoose = require('mongoose');

const transactionLogSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  event:       { type: mongoose.Schema.ObjectId, ref: 'Event' },
  ticket:      { type: mongoose.Schema.ObjectId, ref: 'Ticket' },
  type:        { type: String, enum: ['payment', 'refund', 'free_booking'], required: true },
  amount:      { type: Number, required: true },
  status:      { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  gatewayRef:  { type: String }, // Razorpay paymentId or refundId
  meta:        { type: mongoose.Schema.Types.Mixed }, // raw webhook payload or extra context
}, { timestamps: true });

transactionLogSchema.index({ user: 1, createdAt: -1 });
transactionLogSchema.index({ event: 1 });

module.exports = mongoose.model('TransactionLog', transactionLogSchema);
