const express = require('express');
const { protect } = require('../middleware/auth');
const router  = express.Router();
router.use(protect);
const agent = require('../agents/weddingWebsiteAgent');
const User  = require('../models/User');

const isAllConfirmed = (user) => {
  const c = user?.confirmed || {};
  return !!(c.venue && c.caterer && c.photographer && c.decorator && c.dj);
};

// POST /api/website/generate
router.post('/generate', async (req, res) => {
  const user = await User.findById(req.weddingId).select('confirmed pdfFinalized');
  if (!isAllConfirmed(user)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before generating a wedding website.' });
  }
  if (!user?.pdfFinalized) {
    return res.status(400).json({ error: 'Finalize the exported PDF before generating the wedding website.' });
  }

  const { brideName, groomName } = req.body;
  if (!brideName || !groomName)
    return res.status(400).json({ error: 'brideName and groomName required' });

  const apiBase = process.env.PUBLIC_API_BASE || process.env.API_BASE || 'http://localhost:5009';
  const payload = { ...req.body, weddingId: req.weddingId, apiBase };
  const result = await agent.generate(payload);
  if (!result.success) return res.status(500).json({ error: result.error });

  // Save website HTML to user's MongoDB document
  try {
    await User.findByIdAndUpdate(req.weddingId, { $set: { websiteHtml: result.html, websiteData: payload, websiteGeneratedAt: new Date(), websiteFinalized: false, websiteFinalizedAt: null } });
    console.log(`[WebsiteRoutes] Website HTML saved to MongoDB for user ${req.weddingId}`);
  } catch (e) { console.log('[WebsiteRoutes] DB save skipped:', e.message); }

  res.json({ html: result.html });
});

// GET /api/website — fetch saved website
router.get('/', async (req, res) => {
  const userConfirmed = await User.findById(req.weddingId).select('confirmed');
  if (!isAllConfirmed(userConfirmed)) {
    return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before accessing the wedding website.' });
  }
  const userPdf = await User.findById(req.weddingId).select('pdfFinalized');
  if (!userPdf?.pdfFinalized) {
    return res.status(400).json({ error: 'Finalize the exported PDF before accessing the wedding website.' });
  }
  try {
    const user = await User.findById(req.weddingId).select('websiteHtml websiteData websiteGeneratedAt websiteFinalized websiteFinalizedAt pdfFinalized');
    res.json({
      html: user?.websiteHtml || '',
      websiteData: user?.websiteData || null,
      websiteGeneratedAt: user?.websiteGeneratedAt || null,
      websiteFinalized: user?.websiteFinalized || false,
      websiteFinalizedAt: user?.websiteFinalizedAt || null,
    });
  } catch { res.json({ html: '' }); }
});


// POST /api/website/finalize ? finalize website
router.post('/finalize', async (req, res) => {
  try {
    const user = await User.findById(req.weddingId).select('websiteHtml');
    if (!user?.websiteHtml) return res.status(400).json({ error: 'No website generated yet.' });
    const updated = await User.findByIdAndUpdate(
      req.weddingId,
      { $set: { websiteFinalized: true, websiteFinalizedAt: new Date() } },
      { new: true }
    ).select('websiteFinalized websiteFinalizedAt');
    res.json({ websiteFinalized: updated.websiteFinalized, websiteFinalizedAt: updated.websiteFinalizedAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;


