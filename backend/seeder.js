const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors'); // Optional: for colored console logs
const User = require('./models/User');
const Event = require('./models/Event');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

connectDB();

const seedEvents = async () => {
    try {
        // 1. Clear existing data (Optional: remove if you want to keep old data)
        await Event.deleteMany();
        await User.deleteMany({ email: 'organizer@test.com' }); 

        console.log('Data Destroyed...'.red.inverse);

        // 2. Create a Demo Organizer
        const organizerUser = await User.create({
            name: 'Demo Organizer',
            email: 'organizer@test.com',
            password: 'password123', // Will be hashed by pre-save hook
            role: 'organizer'
        });

        console.log(`Organizer Created: ${organizerUser._id}`.green.inverse);

        // 3. Define Sample Events
        const events = [
            {
                title: "Tech Innovators Summit 2025",
                description: "Join industry leaders to discuss the future of AI, Blockchain, and IoT. Networking sessions included.",
                date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
                venue: "Convention Center, Bangalore",
                category: "Technology",
                organizer: organizerUser._id,
                imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
                ticketTypes: [
                    { name: "Early Bird", price: 499, quantity: 50, available: 50 },
                    { name: "VIP", price: 1499, quantity: 20, available: 20 }
                ]
            },
            {
                title: "Summer Music Festival",
                description: "A weekend of indie rock, pop, and electronic music under the open sky.",
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                venue: "Open Grounds, Mumbai",
                category: "Music",
                organizer: organizerUser._id,
                imageUrl: "https://images.unsplash.com/photo-1459749411177-047381bb3be3?auto=format&fit=crop&w=1000&q=80",
                ticketTypes: [
                    { name: "General Access", price: 999, quantity: 200, available: 200 },
                    { name: "Backstage Pass", price: 2999, quantity: 10, available: 10 }
                ]
            },
            {
                title: "Digital Art Workshop",
                description: "Learn digital painting techniques from pro artists. Tablets provided.",
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                venue: "Art Hub, Delhi",
                category: "Workshop",
                organizer: organizerUser._id,
                imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1000&q=80",
                ticketTypes: [
                    { name: "Standard", price: 299, quantity: 30, available: 30 }
                ]
            },
            {
                title: "Startup Pitch Night",
                description: "Watch early-stage startups pitch to investors. Great for networking.",
                date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
                venue: "Co-work Space, Pune",
                category: "Business",
                organizer: organizerUser._id,
                imageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80",
                ticketTypes: [
                    { name: "Free Entry", price: 0, quantity: 100, available: 100 }
                ]
            },
            {
                title: "Yoga & Mindfulness Retreat",
                description: "A relaxing morning session to rejuvenate your mind and body.",
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                venue: "City Park, Hyderabad",
                category: "Health",
                organizer: organizerUser._id,
                imageUrl: "https://images.unsplash.com/photo-1544367563-121910aace75?auto=format&fit=crop&w=1000&q=80",
                ticketTypes: [
                    { name: "Mat Included", price: 199, quantity: 40, available: 40 }
                ]
            },
            {
                title: "Past Event: Retro Gaming Night",
                description: "This event has already happened. Showing for history tracking.",
                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days AGO
                venue: "Arcade Zone, Chennai",
                category: "Entertainment",
                organizer: organizerUser._id,
                imageUrl: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=1000&q=80",
                ticketTypes: [
                    { name: "Entry", price: 100, quantity: 50, available: 0 } // Sold out/Past
                ]
            }
        ];

        await Event.insertMany(events);

        console.log('Events Imported!'.green.inverse);
        process.exit();

    } catch (error) {
        console.error(`Error: ${error.message}`.red.inverse);
        process.exit(1);
    }
};

seedEvents();