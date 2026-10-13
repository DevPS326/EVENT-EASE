const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const connectDB = require('./config/db');
const startScheduler = require('./utils/scheduler');
const Payment = require('./models/Payment');

dotenv.config();
require('./config/passport');

const app = express();
app.use(express.json());
app.use(cors());
app.use(passport.initialize());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

app.get('/', (req, res) => {
  res.send('EventEase Backend API is running...');
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();

    // Fail closed: without BOTH unique indexes, concurrent payment requests
    // could create duplicate tickets. Existing duplicate rows must be reviewed
    // and reconciled before these indexes can be created.
    await Payment.collection.createIndex(
      { orderId: 1 },
      { unique: true, name: 'uniq_razorpay_order' }
    );
    await Payment.collection.createIndex(
      { paymentId: 1 },
      { unique: true, name: 'uniq_razorpay_payment' }
    );

    startScheduler();
    app.listen(PORT, () => {
      console.log('Server is running in ' + process.env.NODE_ENV + ' mode on port ' + PORT);
    });
  } catch (error) {
    console.error('Startup blocked: database/payment indexes unavailable:', error);
    process.exit(1);
  }
}

start();
