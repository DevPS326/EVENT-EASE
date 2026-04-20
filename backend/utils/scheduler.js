// backend/utils/scheduler.js
//
// Distributed-safe event reminder scheduler.
//
// LOCKING STRATEGY
// ─────────────────
// The naive approach — find all unclaimed events, send emails, then mark sent —
// has a race condition when multiple Node instances run the same cron:
//
//   Instance A: Event.find({ reminderSent: false }) → [evt1, evt2]
//   Instance B: Event.find({ reminderSent: false }) → [evt1, evt2]  ← same list
//   Both send emails → attendees receive duplicate reminders.
//
// The fix is an atomic CLAIM LOOP using findOneAndUpdate:
//   - The filter { reminderSent: false } and the update { reminderSent: true }
//     execute as a single atomic operation at the MongoDB document level.
//   - Only ONE instance can transition a given event from false → true.
//   - Every other instance that tries the same event gets null (filter no
//     longer matches) and moves on.
//   - Claiming BEFORE sending is intentional: a missed reminder (recoverable)
//     is safer than spamming all attendees with duplicate emails.

const logger = require('./logger');
const cron = require('node-cron');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { sendEmail } = require('./emailService');

const startScheduler = () => {
    // Run every 15 minutes (10:00, 10:15, 10:30 …)
    cron.schedule('*/15 * * * *', async () => {
        logger.info('Running Event Reminder Scheduler...');

        const now = new Date();
        // 2-hour lookahead window — wider than the 15-min tick interval so
        // events are never missed even if a tick is slightly delayed.
        const upcomingWindow = new Date(now.getTime() + 120 * 60 * 1000);

        try {
            let processed = 0;

            // ── Atomic claim loop ────────────────────────────��───────────────
            // Each iteration claims exactly one unclaimed event in this window.
            // The loop exits when no unclaimed events remain (findOneAndUpdate
            // returns null). All instances run this loop concurrently; each
            // event is processed by at most one instance.
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const event = await Event.findOneAndUpdate(
                    {
                        date: { $gte: now, $lte: upcomingWindow },
                        reminderSent: false,  // only unclaimed events match
                    },
                    { $set: { reminderSent: true } }, // claim atomically
                    { new: true }                     // return post-update doc
                );

                // null → no more unclaimed events in this window; done
                if (!event) break;

                processed++;
                logger.info(`Claimed reminder lock for: "${event.title}"`);

                // ── Derive unique attendees from Ticket collection ──────────
                // Event.attendees array was removed (Phase 2) to prevent the
                // 16MB document limit. Tickets are the source of truth.
                // reduce() deduplicates users who hold multiple tickets.
                const tickets = await Ticket.find({ event: event._id })
                    .populate('user', 'name email');

                const uniqueUsers = Object.values(
                    tickets.reduce((acc, t) => {
                        if (t.user) acc[t.user._id.toString()] = t.user;
                        return acc;
                    }, {})
                );

                // ── Send reminder emails (parallel, per-error isolated) ─────
                const emailPromises = uniqueUsers.map(user => {
                    const subject = `Reminder: '${event.title}' starts soon!`;
                    const htmlContent = `
                        <p>Hi ${user.name},</p>
                        <p>This is a reminder that <strong>${event.title}</strong> is starting soon.</p>
                        <p><strong>Time:</strong> ${new Date(event.date).toLocaleString()}</p>
                        <p><strong>Venue:</strong> ${event.venue}</p>
                        <p>Get your tickets ready!</p>
                        <p>Team EventEase</p>
                    `;
                    return sendEmail(user.email, subject, htmlContent)
                        .catch(err => logger.error(`Failed to email ${user.email}:`, err.message));
                });

                await Promise.all(emailPromises);
                logger.info(`Reminders sent for: "${event.title}" (${uniqueUsers.length} recipient(s))`);
            }

            if (processed > 0) {
                logger.info(`Scheduler run complete: processed ${processed} event(s).`);
            }

        } catch (error) {
            logger.error('Error in scheduler:', error);
        }
    });
};

module.exports = startScheduler;
