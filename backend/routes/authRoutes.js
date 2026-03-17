/**
 * HeartBound IQ — Auth Routes
 * POST /api/auth/signup
 * POST /api/auth/login
 * GET  /api/auth/me
 * PUT  /api/auth/wedding   — save wedding details
 * PUT  /api/auth/plan      — save orchestrator plan
 * PUT  /api/auth/card      — save invitation card HTML
 * PUT  /api/auth/website   — save wedding website HTML
 */
const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const isAllConfirmed = (user) => {
  const c = user?.confirmed || {};
  return !!(c.venue && c.caterer && c.photographer && c.decorator && c.dj);
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// -- POST /api/auth/signup -----------------------------------------------------
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered. Please log in.' });

    const user  = await User.create({ name, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- POST /api/auth/login ------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Incorrect email or password.' });

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- GET /api/auth/me ----------------------------------------------------------
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

// -- PUT /api/auth/wedding — save wedding details ------------------------------
router.put('/wedding', protect, async (req, res) => {
  try {
    const allowed = ['brideName','groomName','weddingDate','city','venue','totalBudget','guestCount','religion'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[`wedding.${k}`] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -- PUT /api/auth/plan — save full orchestrator plan -------------------------
router.put('/plan', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { lastPlan: req.body.plan } },
      { new: true }
    );
    res.json({ message: 'Plan saved.', user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -- PUT /api/auth/card — save invitation card HTML ---------------------------
router.put('/card', protect, async (req, res) => {
  if (!isAllConfirmed(req.user)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before saving a wedding card.' });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { cardHtml: req.body.html } },
      { new: true }
    );
    res.json({ message: 'Card saved.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -- PUT /api/auth/website — save wedding website HTML ------------------------
router.put('/website', protect, async (req, res) => {
  if (!isAllConfirmed(req.user)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before saving a wedding website.' });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { websiteHtml: req.body.html } },
      { new: true }
    );
    res.json({ message: 'Website saved.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;


