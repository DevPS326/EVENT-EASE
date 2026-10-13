'use strict';

/**
 * A Razorpay order and payment are single-use booking identifiers.
 * Legacy Payment rows may lack ticketIds / ticketType / quantity; never issue
 * new tickets for those rows. Reconcile those bookings manually instead.
 */
function classifyExistingPayment(existing, request) {
  if (!existing) return { kind: 'missing' };

  const sameIdentity =
    existing.orderId === request.orderId &&
    existing.paymentId === request.paymentId &&
    String(existing.user) === String(request.userId) &&
    String(existing.event) === String(request.eventId);

  if (!sameIdentity || existing.status !== 'success') {
    return { kind: 'conflict' };
  }

  if (existing.ticketType != null &&
      String(existing.ticketType) !== String(request.ticketTypeId)) {
    return { kind: 'conflict' };
  }

  if (existing.quantity != null &&
      existing.quantity !== request.quantity) {
    return { kind: 'conflict' };
  }

  if (!existing.ticketType || !existing.quantity ||
      !Array.isArray(existing.ticketIds) ||
      existing.ticketIds.length !== request.quantity) {
    return { kind: 'legacy' };
  }

  return { kind: 'replay', ticketIds: existing.ticketIds };
}

function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === 11000 || error.cause?.code === 11000));
}

module.exports = { classifyExistingPayment, isDuplicateKeyError };
