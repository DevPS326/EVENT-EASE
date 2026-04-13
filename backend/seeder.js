// backend/seeder.js
//
// Production-grade dynamic seeder for EventEase — IIT ISM Dhanbad
//
// Pipeline:
//   1. Connect DB
//   2. Wipe Events + Users (organizer only)
//   3. Create admin organizer (admin@iitism.ac.in)
//   4. Process base events from data/events.json
//      - Convert relativeDaysFromNow → real Date
//      - Convert tiers[] → ticketTypes[] with available = quantity
//   5. Generate 30 additional events programmatically (expansion engine)
//   6. Insert all 50+ events in one batch
//   7. Log + exit

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const path     = require('path');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');
const Event    = require('./models/Event');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Convert a flat tiers array from JSON → ticketTypes schema format */
const buildTicketTypes = (tiers) =>
  tiers.map((t) => ({
    name:      t.name,
    price:     t.price,
    quantity:  t.quantity,
    available: t.quantity,       // start fully available
  }));

// ─── Expansion Engine — 30 programmatically generated events ──────────────────

const EXPANSION_TEMPLATES = [
  // Coding Club recurring
  {
    titleFn: (i) => `Weekly CP Session #${i + 1} — Coding Club ISM`,
    description: 'Weekly competitive programming practice. Problems from Codeforces, LeetCode, and AtCoder. Open to all skill levels. Attend consistently and watch your rating climb.',
    category: 'Tech',
    venue: 'LT-2, CS Department, IIT ISM Dhanbad',
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
    dayOffset: () => rand(1, 60),
    tiers: [{ name: 'Free Entry', price: 0, quantity: 60 }],
  },
  // Open Mic recurring
  {
    titleFn: (i) => `Manthan Open Mic — Edition ${i + 1}`,
    description: 'Monthly open mic night by Manthan Music Club. Bring your instrument, voice, or spoken-word piece. Informal, warm, and always memorable. Chai and biscuits on the house.',
    category: 'Music',
    venue: 'Open Air Theatre, IIT ISM Dhanbad',
    imageUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&q=80',
    dayOffset: () => rand(2, 50),
    tiers: [{ name: 'Open Entry', price: 0, quantity: 200 }],
  },
  // Robotics practice
  {
    titleFn: (i) => `Robotics Lab Session #${i + 1}`,
    description: 'Hands-on robotics build session hosted by Robotics Club ISM. Components, breadboards, and motors available. Bring your ideas and leave with a working prototype.',
    category: 'Tech',
    venue: 'Mechanical Workshop, IIT ISM Dhanbad',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    dayOffset: () => rand(3, 45),
    tiers: [{ name: 'Participant', price: 0, quantity: 25 }],
  },
  // Finance workshops
  {
    titleFn: (i) => `Finance 101 — Session ${i + 1}: ${['Derivatives', 'Equity Valuation', 'Crypto Basics', 'Portfolio Theory', 'IPO Analysis'][i % 5]}`,
    description: 'Finance & Investment Club ISM breaks down complex financial concepts into 90-minute digestible sessions. No prior finance knowledge needed. Just curiosity and a spreadsheet.',
    category: 'Business',
    venue: 'Conference Room, Admin Block, IIT ISM',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
    dayOffset: () => rand(4, 55),
    tiers: [{ name: 'Free Seat', price: 0, quantity: 50 }],
  },
  // Literary events
  {
    titleFn: (i) => `Wordsmith Workshop — ${['Flash Fiction', 'Poetry Slam', 'Screenwriting', 'Technical Writing', 'Creative Non-Fiction'][i % 5]}`,
    description: 'Literary Club ISM\'s weekly writing workshop. Bring a draft or start from scratch. Peer feedback, structured prompts, and a safe space to find your voice as a writer.',
    category: 'Art',
    venue: 'Common Room, Tagore Hall, IIT ISM',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
    dayOffset: () => rand(1, 40),
    tiers: [{ name: 'Free Entry', price: 0, quantity: 40 }],
  },
  // Sports events
  {
    titleFn: (i) => `${['Cricket', 'Football', 'Badminton', 'Table Tennis', 'Basketball', 'Chess'][i % 6]} — Hostel League Match ${i + 1}`,
    description: 'Inter-hostel league match as part of Parakram 2025. Points are on the line. Every game counts toward the overall hostel championship. Spectators and cheer squads welcome.',
    category: 'Sports',
    venue: 'Sports Complex, IIT ISM Dhanbad',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
    dayOffset: () => rand(1, 30),
    tiers: [{ name: 'Free Spectator', price: 0, quantity: 300 }],
  },
]

// ─── Main Seeder ──────────────────────────────────────────────────────────────

const seed = async () => {
  try {
    // ── 1. Wipe existing data ────────────────────────────────────────────────
    await Event.deleteMany({});
    await User.deleteMany({ role: { $in: ['organizer', 'admin'] } });
    console.log('\x1b[31m%s\x1b[0m', '✗  Existing events + organizer accounts cleared');

    // ── 2. Create admin organizer ────────────────────────────────────────────
    // Password is hashed by the User pre-save hook
    const admin = await User.create({
      name:     'ISM Admin',
      email:    'admin@iitism.ac.in',
      password: 'Password@123',
      role:     'organizer',
    });
    console.log('\x1b[33m%s\x1b[0m', `✓  Admin organizer created: ${admin._id}`);

    // ── 3. Process base events from JSON ─────────────────────────────────────
    const baseRaw = require('./data/events.json');

    const baseEvents = baseRaw.map((e) => ({
      title:        e.title,
      description:  e.description,
      category:     e.category,
      venue:        e.venue,
      imageUrl:     e.imageUrl,
      organizer:    admin._id,
      date:         daysFromNow(e.relativeDaysFromNow),
      reminderSent: false,
      ticketTypes:  buildTicketTypes(e.tiers),
    }));

    // ── 4. Expansion engine — 30 generated events ────────────────────────────
    const expandedEvents = [];
    let templateIndex = 0;

    // 5 events per template × 6 templates = 30 generated events
    for (const template of EXPANSION_TEMPLATES) {
      for (let i = 0; i < 5; i++) {
        expandedEvents.push({
          title:        template.titleFn(i),
          description:  template.description,
          category:     template.category,
          venue:        template.venue,
          imageUrl:     template.imageUrl,
          organizer:    admin._id,
          date:         daysFromNow(template.dayOffset()),
          reminderSent: false,
          ticketTypes:  buildTicketTypes(template.tiers),
        });
      }
      templateIndex++;
    }

    // ── 5. Batch insert ──────────────────────────────────────────────────────
    const allEvents = [...baseEvents, ...expandedEvents];
    const inserted  = await Event.insertMany(allEvents);

    // ── 6. Summary ───────────────────────────────────────────────────────────
    const free  = inserted.filter(e => e.ticketTypes.every(t => t.price === 0)).length;
    const paid  = inserted.length - free;
    const cats  = inserted.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {});

    console.log('\n\x1b[32m%s\x1b[0m', '✓  Seed complete');
    console.log('   Total events inserted :', inserted.length);
    console.log('   Base events           :', baseEvents.length);
    console.log('   Generated events      :', expandedEvents.length);
    console.log('   Free events           :', free);
    console.log('   Paid events           :', paid);
    console.log('   Category breakdown    :', cats);
    console.log('\n\x1b[32m%s\x1b[0m', '   Login: admin@iitism.ac.in / Password@123');
    console.log('');

    process.exit(0);

  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '✗  Seeder failed: ' + err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

seed();
