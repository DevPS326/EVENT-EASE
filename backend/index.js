const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
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
app.use(cors()); // To enable Cross-Origin Resource Sharing
app.use(passport.initialize()); // Initialize Passport

// Define API Routes
app.use('/api/auth',      require('./routes/authRoutes'));
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