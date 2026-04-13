const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/User');
const Event = require('./models/Event');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedEvents = async () => {
    try {
        await Event.deleteMany();
        await User.deleteMany({ email: 'admin@iitism.ac.in' });

        console.log('Data Destroyed...'.red.inverse);

        // Demo organizer — valid IIT ISM domain
        const organizerUser = await User.create({
            name: 'ISM Admin',
            email: 'admin@iitism.ac.in',
            password: 'password123', // hashed by pre-save hook
            role: 'organizer',
        });

        console.log(`Organizer Created: ${organizerUser._id}`.green.inverse);

        const events = [
            {
                title: 'Tech Conclave 2025',
                description: 'Annual tech fest featuring AI, Blockchain, and Robotics workshops by IIT ISM student clubs.',
                date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                venue: 'Seminar Hall, IIT ISM Dhanbad',
                category: 'Tech',
                organizer: organizerUser._id,
                imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
                ticketTypes: [
                    { name: 'Student Pass', price: 99,  quantity: 200, available: 200 },
                    { name: 'Pro Pass',     price: 299, quantity: 50,  available: 50  },
                ],
            },
            {
                title: 'Illuminations — Annual Cultural Fest',
                description: 'Music, dance, drama, and art competitions. The biggest cultural event on campus.',
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                venue: 'Main Ground, IIT ISM Dhanbad',
                category: 'Music',
                organizer: organizerUser._id,
                imageUrl: 'https://images.unsplash.com/photo-1459749411177-047381bb3be3?auto=format&fit=crop&w=1000&q=80',
                ticketTypes: [
                    { name: 'General Entry', price: 0,   quantity: 500, available: 500 },
                    { name: 'VIP Seating',   price: 199, quantity: 30,  available: 30  },
                ],
            },
            {
                title: 'Design Thinking Workshop',
                description: 'Hands-on workshop by the Product Design Club. Learn prototyping with Figma.',
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                venue: 'CS Block Lab 3, IIT ISM Dhanbad',
                category: 'Workshop',
                organizer: organizerUser._id,
                imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1000&q=80',
                ticketTypes: [
                    { name: 'Registered Student', price: 0, quantity: 40, available: 40 },
                ],
            },
            {
                title: 'E-Summit Startup Pitch',
                description: 'Entrepreneurship Cell presents the annual startup pitching competition.',
                date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                venue: 'Auditorium, IIT ISM Dhanbad',
                category: 'Business',
                organizer: organizerUser._id,
                imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80',
                ticketTypes: [
                    { name: 'Free Entry', price: 0, quantity: 150, available: 150 },
                ],
            },
            {
                title: 'Inter-Hostel Sports Meet',
                description: 'Annual athletics, cricket, football, and chess inter-hostel championships.',
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                venue: 'Sports Complex, IIT ISM Dhanbad',
                category: 'Sports',
                organizer: organizerUser._id,
                imageUrl: 'https://images.unsplash.com/photo-1544367563-121910aace75?auto=format&fit=crop&w=1000&q=80',
                ticketTypes: [
                    { name: 'Student Entry', price: 0, quantity: 300, available: 300 },
                ],
            },
            {
                title: '[Past] Freshers Welcome Night',
                description: 'Annual freshers night — archived for history tracking.',
                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                venue: 'Open Air Theatre, IIT ISM Dhanbad',
                category: 'Music',
                organizer: organizerUser._id,
                imageUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=1000&q=80',
                ticketTypes: [
                    { name: 'Entry', price: 0, quantity: 400, available: 0 },
                ],
            },
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
