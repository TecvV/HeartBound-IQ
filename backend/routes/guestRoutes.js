const express  = require('express');
const router   = express.Router();
const Guest    = require('../models/Guest');
const User     = require('../models/User');
const agent    = require('../agents/guestManagementAgent');
const { protect } = require('../middleware/auth');

const isAllConfirmed = (user) => {
  const c = user?.confirmed || {};
  return !!(c.venue && c.caterer && c.photographer && c.decorator && c.dj);
};


router.use(protect); // all guest routes require auth

// GET /api/guests
router.get('/', async (req, res) => {
  try {
    const guests = await Guest.find({ weddingId: req.weddingId }).sort({ createdAt: -1 });
    res.json({ guests, stats: agent.summarize(guests) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/guests
router.post('/', async (req, res) => {
  const { name, email, phone, dietary, side, notes, inviteWithFamily } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  try {
    const guest = await Guest.create({ weddingId: req.weddingId, name, email: String(email).trim().toLowerCase(), phone, dietary, side, notes, inviteWithFamily: !!inviteWithFamily });
    res.status(201).json({ guest });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/guests/:id
router.put('/:id', async (req, res) => {
  try {
    const payload = { ...req.body };
    // RSVP status/count are only updated by the public RSVP endpoint
    delete payload.rsvpStatus;
    delete payload.rsvpCount;
    delete payload.rsvpToken;
    delete payload.rsvpTokenCreatedAt;
    if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
    const guest = await Guest.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.weddingId },
      payload, { new: true }
    );
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    res.json({ guest });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/guests/:id
router.delete('/:id', async (req, res) => {
  try {
    await Guest.findOneAndDelete({ _id: req.params.id, weddingId: req.weddingId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/guests/card/preview
router.post('/card/preview', async (req, res) => {
  try {
    const user = await User.findById(req.weddingId).select('confirmed');
    if (!isAllConfirmed(user)) {
      return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before generating a wedding card.' });
    }
    const result = await agent.generateCard(req.body);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/guests/invite/all
router.post('/invite/all', async (req, res) => {
  const user = await User.findById(req.weddingId).select('confirmed');
  if (!isAllConfirmed(user)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before sending invites.' });
  }
  try {
    const guests = await Guest.find({ weddingId: req.weddingId, inviteSent: false });
    if (!guests.length) return res.json({ sent: 0, failed: 0, message: 'No pending guests.' });
    const result = await agent.sendBulkInvites(guests, req.body);
    const sentIds = result.results.filter(r => r.success).map(r => r.guestId);
    await Guest.updateMany(
      { _id: { $in: sentIds }, weddingId: req.weddingId },
      { inviteSent: true, inviteSentAt: new Date() }
    );
    res.json({ sent: result.sent, failed: result.failed, cardHtml: result.cardHtml });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/guests/invite/single/:id
router.post('/invite/single/:id', async (req, res) => {
  const user = await User.findById(req.weddingId).select('confirmed');
  if (!isAllConfirmed(user)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before sending invites.' });
  }
  try {
    const guest = await Guest.findOne({ _id: req.params.id, weddingId: req.weddingId });
    if (!guest) return res.status(404).json({ error: 'Guest not found' });
    const html   = await agent.generateCard(req.body).then(r => r.html);
    const result = await agent.sendInvite(guest, req.body, html);
    if (result.success) {
      await Guest.findByIdAndUpdate(req.params.id, { inviteSent: true, inviteSentAt: new Date() });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;



