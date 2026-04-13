const express   = require('express');
const dotenv    = require('dotenv');
const cors      = require('cors');
const passport  = require('passport');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const startScheduler = require('./utils/scheduler');

// Load environment variables - MUST BE AT THE TOP
dotenv.config();

require('./config/passport'); // Import Passport configuration

// Connect to the database
connectDB();

// Start the scheduler
startScheduler();

const app = express();

// Use Middlewares
// Capture the raw request body bytes before JSON parsing.
// Required for Razorpay webhook HMAC verification — re-stringifying the
// parsed body is NOT byte-safe (key ordering may differ) and would fail.
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.options('*', cors(corsOptions)); // handle preflight for all routes
app.use(cors(corsOptions));          // apply CORS policy to all routes
app.use(passport.initialize()); // Initialize Passport

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Auth routes: 20 attempts per 15 minutes per IP.
// Tighter than the usual 100 to slow credential-stuffing / brute-force attacks.
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              20,
  standardHeaders:  true,           // Return rate-limit info in RateLimit-* headers
  legacyHeaders:    false,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
});

// Define API Routes
app.use('/api/auth',      authLimiter, require('./routes/authRoutes'));
app.use('/api/events',    require('./routes/eventRoutes'));
app.use('/api/payments',  require('./routes/paymentRoutes'));
app.use('/api/tickets',   require('./routes/ticketRoutes'));
app.use('/api/users',     require('./routes/userRoutes'));
app.use('/api/promo',     require('./routes/promoRoutes'));
app.use('/api/waitlist',  require('./routes/waitlistRoutes'));
app.use('/api/reviews',        require('./routes/reviewRoutes'));
app.use('/api/notifications',  require('./routes/notificationRoutes'));

// A simple test route
app.get('/', (req, res) => {
    res.send('EventEase Backend API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`));