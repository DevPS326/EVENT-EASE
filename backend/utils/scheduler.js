const cron = require('node-cron');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { sendEmail } = require('./emailService');

const startScheduler = () => {
    // Run every 15 minutes (e.g., 10:00, 10:15, 10:30...)
    cron.schedule('*/15 * * * *', async () => {
        console.log('Running Event Reminder Scheduler...');
        
        const now = new Date();
        // Look for events starting in the next 2 hours
        // (Wider window is safer because we have the reminderSent flag)
        const upcomingWindow = new Date(now.getTime() + 120 * 60 * 1000); 

        try {
            // Find events that start soon AND haven't sent a reminder yet
            const events = await Event.find({
                date: {
                    $gte: now,
                    $lte: upcomingWindow,
                },
                reminderSent: { $ne: true }, // Only if false or undefined
            });

            if (events.length > 0) {
                console.log(`Found ${events.length} events starting soon.`);
            }

            for (const event of events) {
                console.log(`Sending reminders for: ${event.title}`);

                // Derive unique attendees from the Ticket collection.
                // Event.attendees array removed to prevent 16MB document limit.
                // reduce deduplicates users who hold multiple tickets for the same event.
                const tickets = await Ticket.find({ event: event._id }).populate('user', 'name email');
                const uniqueUsers = Object.values(
                    tickets.reduce((acc, t) => {
                        if (t.user) acc[t.user._id.toString()] = t.user;
                        return acc;
                    }, {})
                );

                // Send emails in parallel (catch per-email errors so one failure doesn't block others)
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
                        .catch(err => console.error(`Failed to email ${user.email}:`, err.message));
                });

                await Promise.all(emailPromises);

                // Mark event as notified in DB so we don't spam
                event.reminderSent = true;
                await event.save();
            }
        } catch (error) {
            console.error('Error in scheduler:', error);
        }
    });
};

module.exports = startScheduler;