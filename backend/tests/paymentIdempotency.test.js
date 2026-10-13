'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyExistingPayment, isDuplicateKeyError } = require('../utils/paymentIdempotency');

const request = {
  orderId: 'order_abc',
  paymentId: 'pay_abc',
  userId: 'user1',
  eventId: 'event1',
  ticketTypeId: 'tier1',
  quantity: 2
};

const recorded = {
  orderId: 'order_abc',
  paymentId: 'pay_abc',
  user: 'user1',
  event: 'event1',
  ticketType: 'tier1',
  quantity: 2,
  status: 'success',
  ticketIds: ['ticket1', 'ticket2']
};

test('unseen payment is eligible for first-time processing', () => {
  assert.deepEqual(classifyExistingPayment(null, request), { kind: 'missing' });
});

test('identical payment replay returns exactly the previously issued tickets', () => {
  assert.deepEqual(classifyExistingPayment(recorded, request), {
    kind: 'replay', ticketIds: ['ticket1', 'ticket2']
  });
});

test('same payment with changed quantity is rejected', () => {
  assert.equal(classifyExistingPayment(recorded, { ...request, quantity: 1 }).kind, 'conflict');
});

test('same order with different payment identifier is rejected', () => {
  assert.equal(classifyExistingPayment(recorded, { ...request, paymentId: 'pay_other' }).kind, 'conflict');
});

test('same payment with different user/event/ticket tier is rejected', () => {
  for (const key of ['userId', 'eventId', 'ticketTypeId']) {
    assert.equal(classifyExistingPayment(recorded, { ...request, [key]: 'other' }).kind, 'conflict');
  }
});

test('legacy records without ticket references never issue new tickets', () => {
  const { ticketIds, ticketType, quantity, ...oldRow } = recorded;
  assert.equal(classifyExistingPayment(oldRow, request).kind, 'legacy');
});

test('incomplete ticket reference list cannot be replayed as completed', () => {
  assert.equal(classifyExistingPayment({ ...recorded, ticketIds: ['ticket1'] }, request).kind, 'legacy');
});

test('MongoDB duplicate key errors can be recognized', () => {
  assert.equal(isDuplicateKeyError({ code: 11000 }), true);
  assert.equal(isDuplicateKeyError({ cause: { code: 11000 } }), true);
  assert.equal(isDuplicateKeyError({ code: 42 }), false);
});
