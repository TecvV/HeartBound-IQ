const express  = require('express');
const { protect } = require('../middleware/auth');
const router   = express.Router();
const cardGen  = require('../agents/weddingCardGenerator');
router.use(protect);
const User     = require('../models/User');
const Guest    = require('../models/Guest');

const isAllConfirmed = (user) => {
  const c = user?.confirmed || {};
  return !!(c.venue && c.caterer && c.photographer && c.decorator && c.dj);
};

// POST /api/virtualcard/generate — generate one design
router.post('/generate', async (req, res) => {
  const user = await User.findById(req.weddingId).select('confirmed');
  if (!isAllConfirmed(user)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before generating a wedding card.' });
  }
  const { brideName, groomName, designIndex } = req.body;
  if (!brideName || !groomName)
    return res.status(400).json({ error: 'brideName and groomName required' });
  try {
    const html = await cardGen.generate(req.body, designIndex || 1);
    await User.findByIdAndUpdate(req.weddingId, { $set: { cardHtml: html, 'wedding.cardDesignIndex': designIndex || 1, cardFinalized: false, cardFinalizedAt: null } });
    res.json({ html });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/virtualcard/previews — generate ALL 10 designs (small previews)
router.post('/previews', async (req, res) => {
  const user = await User.findById(req.weddingId).select('confirmed');
  if (!isAllConfirmed(user)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before generating a wedding card.' });
  }
  const { brideName, groomName } = req.body;
  if (!brideName || !groomName)
    return res.status(400).json({ error: 'brideName and groomName required' });
  try {
    // Generate all 10 in parallel
    const htmls = await Promise.all(
      Array.from({ length: 10 }, (_, i) => cardGen.generate(req.body, i + 1))
    );
    res.json({ designs: htmls.map((html, i) => ({ index: i + 1, html })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/virtualcard — fetch saved card + design index
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.weddingId).select('cardHtml wedding cardFinalized cardFinalizedAt');
    res.json({ html: user?.cardHtml || '', designIndex: user?.wedding?.cardDesignIndex || 1, cardFinalized: user?.cardFinalized || false, cardFinalizedAt: user?.cardFinalizedAt || null });
  } catch { res.json({ html: '', designIndex: 1 }); }
});


// POST /api/virtualcard/finalize — finalize the current card
router.post('/finalize', async (req, res) => {
  try {
    const user = await User.findById(req.weddingId).select('cardHtml');
    if (!user?.cardHtml) return res.status(400).json({ error: 'No card generated yet.' });
    const updated = await User.findByIdAndUpdate(
      req.weddingId,
      { $set: { cardFinalized: true, cardFinalizedAt: new Date() } },
      { new: true }
    ).select('cardFinalized cardFinalizedAt');
    res.json({ cardFinalized: updated.cardFinalized, cardFinalizedAt: updated.cardFinalizedAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// POST /api/virtualcard/send-all - send personalised card to ALL guests
router.post('/send-all', async (req, res) => {
  const user = await User.findById(req.weddingId).select('confirmed');
  if (!isAllConfirmed(user)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before sending invites.' });
  }
  try {
    const { brideName, groomName, designIndex, ...rest } = req.body;
    if (!brideName || !groomName)
      return res.status(400).json({ error: 'brideName and groomName required' });

    const guests = await Guest.find({ weddingId: req.weddingId });
    if (!guests.length) return res.json({ sent: 0, failed: 0, message: 'No guests in list.' });

    const nodemailer = require('nodemailer');
    const isMailConfigured = process.env.MAIL_USER && process.env.MAIL_USER !== 'your_gmail@gmail.com';

    let transporter = null;
    if (isMailConfigured) {
      transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: false,
        auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      });
    }

    let sent = 0, failed = 0, preview = 0;
    const results = [];

    for (const guest of guests) {
      // Generate personalised card with guest's name
      const personalizedHtml = await cardGen.generate(
        { ...rest, brideName, groomName, guestName: guest.name, designIndex },
        designIndex || 1
      );

      if (!transporter) {
        // Preview mode
        console.log(`[CardRoutes] PREVIEW: would send to ${guest.email}`);
        preview++;
        results.push({ guestId: guest._id, email: guest.email, success: true, preview: true });
        continue;
      }

      try {
        await transporter.sendMail({
          from:    process.env.MAIL_FROM || '"HeartBound IQ Weddings" <noreply@HeartBound IQ.com>',
          to:      `"${guest.name}" <${guest.email}>`,
          subject: `You're invited - ${brideName} & ${groomName} - Wedding Invitation`,
          html:    personalizedHtml,
        });
        sent++;
        results.push({ guestId: guest._id, email: guest.email, success: true });
        // Mark as invited
        await Guest.findByIdAndUpdate(guest._id, { inviteSent: true, inviteSentAt: new Date() });
        await new Promise(r => setTimeout(r, 250)); // rate limit
      } catch (e) {
        failed++;
        results.push({ guestId: guest._id, email: guest.email, success: false, error: e.message });
      }
    }

    if (!isMailConfigured) {
      return res.json({
        sent: 0, failed: 0, preview: preview,
        previewMode: true,
        message: `Preview mode: ${preview} personalised cards generated. Add MAIL_USER and MAIL_PASS to .env to send real emails.`,
        results,
      });
    }

    res.json({ sent, failed, preview: 0, previewMode: false, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;








