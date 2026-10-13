# Razorpay booking idempotency — deployment and verification

This patch makes `POST /api/payments/verify` idempotent **per Razorpay order ID and payment ID**.

## Contract

- The first valid, fully paid request creates one Payment record and its tickets in a MongoDB transaction.
- An identical retry returns HTTP 200, `idempotentReplay: true`, and the same `ticketIds`; no stock decrement or extra email is attempted.
- Reusing either identifier for a different user, event, tier, quantity or other payment/order is rejected with HTTP 409.
- A historical Payment without the saved ticket ID mapping is **not** processed again; the API returns HTTP 409 and requires reconciliation.
- MongoDB unique indexes on both fields enforce at-most-once issuance across concurrent workers; in-memory mutexes alone do not.
- Transient/ambiguous failures may return HTTP 503. Retry the **same** signed request; do not create a new Razorpay charge.

## Prerequisites / production rollout

1. Back up the production database. Use MongoDB Atlas or a replica set supporting multi-document transactions.
2. Inspect existing duplicates before deploying. In `mongosh`:

   ```javascript
   db.payments.aggregate([
     { $group: { _id: '$orderId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
     { $match: { count: { $gt: 1 } } }
   ]);
   db.payments.aggregate([
     { $group: { _id: '$paymentId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
     { $match: { count: { $gt: 1 } } }
   ]);
   ```

3. **Do not delete duplicate records blindly.** Reconcile actual Razorpay settlements, issued tickets and any previous users' purchases first. The backend intentionally refuses to start if either unique index cannot be created.
4. After deployment, check `db.payments.getIndexes()` for `uniq_razorpay_order` and `uniq_razorpay_payment`.
5. Run the unit test with `cd backend && node --test tests/paymentIdempotency.test.js` (Node >=18). These tests cover decision logic only, not real MongoDB concurrency.

## Integration test matrix (Razorpay test mode + test database)

Use a fresh **test** order with a successful payment. Preserve the complete signed payload.

| Scenario | Expected |
| --- | --- |
| Send first correct verification | HTTP 200, `idempotentReplay: false`, N new tickets |
| Send exact same payload again | HTTP 200, `idempotentReplay: true`, identical `ticketIds` |
| Send 10 identical requests concurrently | At most N tickets total, one Payment row, stock decremented by N only once; retry any HTTP 409/503 |
| Reuse same order with different paymentId | HTTP 409, no additional tickets |
| Reuse same payment with different event, tier, user or quantity | HTTP 409, no additional tickets |
| Invalid HMAC signature | HTTP 400, no additional tickets |
| Legacy Payment with missing ticket mapping | HTTP 409, manual reconciliation required |
| Sold-out tier / bad amount | Request refused; confirm refund/manual handling separately |

Confirm both `payments` and `tickets` collection counts before/after each test.

## Remaining limitations

- An entirely new Razorpay order/payment is **not** the same idempotency key. Preventing multiple *separate* charges requires a server-side checkout intent and order-creation idempotency.
- The order-creation endpoint currently accepts an amount from the client. The verification endpoint recalculates the amount from the DB, but checkout intent should eventually bind user + event + tier + quantity at order creation.
- Razorpay captures can succeed while ticket issuance fails (e.g. sold-out event, DB outage). Add reconciliation/refund handling and monitor those failures before processing real transactions at scale.
- Ticket confirmation emails are best-effort after commit, not exactly-once. Production-grade guaranteed delivery needs an outbox/worker.
- This code requires staging tests with concurrent requests before claiming production-level idempotency. Unit tests alone are insufficient.
