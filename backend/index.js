const express     = require('express');
const dotenv      = require('dotenv');
const logger      = require('./utils/logger');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const passport    = require('passport');
const rateLimit   = require('express-rate-limit');
const connectDB   = require('./config/db');
const startScheduler = require('./utils/scheduler');

// Load environment variables - MUST BE AT THE TOP
dotenv.config();

// ── Startup env validation ────────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  logger.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

require('./config/passport'); // Import Passport configuration

// Connect to the database
connectDB();

// Start the scheduler
startScheduler();

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP off — frontend handles its own

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Body parsing + raw body for webhook HMAC ─────────────────────────────────
// Raw bytes captured before JSON parsing — required for Razorpay webhook
// HMAC verification (re-stringifying parsed body is NOT byte-safe).
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(passport.initialize());

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
});

// Global limiter — 200 req/min across all routes
const globalLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Rate limit exceeded. Please slow down.' },
});
app.use(globalLimiter);

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',           authLimiter, require('./routes/authRoutes'));
app.use('/api/events',         require('./routes/eventRoutes'));
app.use('/api/payments',       require('./routes/paymentRoutes'));
app.use('/api/tickets',        require('./routes/ticketRoutes'));
app.use('/api/users',          require('./routes/userRoutes'));
app.use('/api/promo',          require('./routes/promoRoutes'));
app.use('/api/waitlist',       require('./routes/waitlistRoutes'));
app.use('/api/reviews',        require('./routes/reviewRoutes'));
app.use('/api/notifications',  require('./routes/notificationRoutes'));
app.use('/api/stats',          require('./routes/statsRoutes'));

app.get('/', (req, res) => res.send('EventEase API is running'));

// ── Global error handler ─────────────────────────────────────────────────────
// Catches unhandled synchronous errors thrown in route handlers.
// Must be defined AFTER all routes (4 args = Express error middleware).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('[Global Error Handler]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));