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
const localAllowedOrigins = [
  'http://localhost:5010',
  'http://127.0.0.1:5010',
  'http://localhost:3000',
  'http://localhost:5003',
];
const envOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((val) => val.trim())
  .filter(Boolean);
const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
const allowedOrigins = new Set([...localAllowedOrigins, ...envOrigins, ...(vercelOrigin ? [vercelOrigin] : [])]);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === 'null') return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
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

// MongoDB (serverless-friendly)
let initPromise = null;
async function initDb() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
  if (!initPromise) {
    initPromise = mongoose
      .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vowiq')
      .then(() => {
        console.log('??? MongoDB connected');
      })
      .catch((err) => {
        console.error('??? MongoDB error:', err.message);
      });
  }
  await initPromise;
}

async function startServer() {
  await initDb();
  app.listen(PORT, () => console.log(`??? HeartBound IQ server running on port ${PORT}`));
}

if (process.env.VERCEL) {
  module.exports = async (req, res) => {
    await initDb();
    return app(req, res);
  };
} else {
  startServer();
}

