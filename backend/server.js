require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');

const authRoutes        = require('./routes/authRoutes');
const venueRoutes       = require('./routes/venueRoutes');
const guestRoutes       = require('./routes/guestRoutes');
const budgetRoutes      = require('./routes/budgetRoutes');
const cateringRoutes    = require('./routes/cateringRoutes');
const vendorRoutes      = require('./routes/vendorRoutes');
const timelineRoutes    = require('./routes/timelineRoutes');
const orchestratorRoutes= require('./routes/orchestratorRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');
const websiteRoutes     = require('./routes/websiteRoutes');
const exportRoutes      = require('./routes/exportRoutes');
const virtualCardRoutes = require('./routes/virtualCardRoutes');
const rsvpRoutes        = require('./routes/rsvpRoutes');
const rsvpPageRoutes    = require('./routes/rsvpPageRoutes');

const app  = express();
const PORT = process.env.PORT || 5009;

// Middleware
app.use(cors({
  origin: (origin, cb) => {
    const allowed = ['http://localhost:5010', 'http://127.0.0.1:5010', 'http://localhost:3000', 'http://localhost:5003'];
    if (!origin || origin === 'null' || allowed.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // large limit for HTML website/card storage

// ── Public routes (no auth) ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/rsvp', rsvpPageRoutes);
app.use('/api/rsvp', rsvpRoutes);

// ── Protected routes (JWT required) ─────────────────────────────────────────
app.use('/api/venues',     venueRoutes);
app.use('/api/guests',     guestRoutes);
app.use('/api/budget',     budgetRoutes);
app.use('/api/catering',   cateringRoutes);
app.use('/api/vendors',    vendorRoutes);
app.use('/api/timeline',   timelineRoutes);
app.use('/api/orchestrate',orchestratorRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/website',    websiteRoutes);
app.use('/api/export',     exportRoutes);
app.use('/api/virtualcard',virtualCardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'HeartBound IQ backend running ✓', port: PORT, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vowiq')
  .then(() => {
    console.log('✓ MongoDB connected');
    app.listen(PORT, () => console.log(`✓ HeartBound IQ server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('✗ MongoDB error:', err.message);
    app.listen(PORT, () => console.log(`✓ HeartBound IQ server running on port ${PORT} (no DB)`));
  });

module.exports = app;

