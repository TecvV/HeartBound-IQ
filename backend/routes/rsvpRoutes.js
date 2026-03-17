const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');

// POST /api/rsvp ? public RSVP handler (no auth)
router.post('/', async (req, res) => {
  try {
    const { weddingId, email, name, count, status } = req.body || {};
    if (!weddingId || !email)
      return res.status(400).json({ error: 'weddingId and email are required.' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const guest = await Guest.findOne({ weddingId, email: normalizedEmail });
    if (!guest) return res.status(404).json({ error: 'Guest not found for this invitation email.' });

    const nextStatus = status === 'declined' ? 'declined' : 'confirmed';
    const rsvpCount = nextStatus === 'confirmed' ? Math.max(1, Math.min(20, parseInt(count || 1, 10))) : 0;

    guest.rsvpStatus = nextStatus;
    guest.rsvpCount = rsvpCount;
    guest.rsvpRespondedAt = new Date();
    if (name && !guest.name) guest.name = String(name).trim();

    await guest.save();
    res.json({ success: true, rsvpStatus: guest.rsvpStatus, rsvpCount: guest.rsvpCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rsvp/token - RSVP using token (public)
router.post('/token', async (req, res) => {
  try {
    const { token, status, count } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    const guest = await Guest.findOne({ rsvpToken: token });
    if (!guest) return res.status(404).json({ error: 'Invalid RSVP link.' });
    const nextStatus = status === 'declined' ? 'declined' : 'confirmed';
    const rsvpCount = nextStatus === 'confirmed' ? Math.max(1, Math.min(20, parseInt(count || 1, 10))) : 0;
    guest.rsvpStatus = nextStatus;
    guest.rsvpCount = rsvpCount;
    guest.rsvpRespondedAt = new Date();
    await guest.save();
    res.json({ success: true, rsvpStatus: guest.rsvpStatus, rsvpCount: guest.rsvpCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
