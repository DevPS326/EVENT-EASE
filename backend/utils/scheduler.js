const cron = require('node-cron');
const Event = require('../models/Event');
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
                reminderSent: { $ne: true } // Only if false or undefined
            }).populate('attendees', 'email name');

            if (events.length > 0) {
                console.log(`Found ${events.length} events starting soon.`);
            }

            for (const event of events) {
                console.log(`Sending reminders for: ${event.title}`);
                
                // Send emails in parallel (but catch errors so one failure doesn't stop others)
                const emailPromises = event.attendees.map(attendee => {
                    const subject = `Reminder: '${event.title}' starts soon!`;
                    const htmlContent = `
                        <p>Hi ${attendee.name},</p>
                        <p>This is a reminder that <strong>${event.title}</strong> is starting soon.</p>
                        <p><strong>Time:</strong> ${new Date(event.date).toLocaleString()}</p>
                        <p><strong>Venue:</strong> ${event.venue}</p>
                        <p>Get your tickets ready!</p>
                        <p>Team EventEase</p>
                    `;
                    return sendEmail(attendee.email, subject, htmlContent)
                        .catch(err => console.error(`Failed to email ${attendee.email}:`, err.message));
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