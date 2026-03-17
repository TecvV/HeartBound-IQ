const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();
const User = require('../models/User');


const stripNextSteps = (html = '') =>
  html.replace(/<div class="section">\s*<div class="section-title">Next steps<\/div>[\s\S]*?(?=<div class="section">|$)/gi, '');


router.use(protect);

// GET /api/export — fetch saved PDF (HTML) + status
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.weddingId)
      .select('pdfHtml pdfGeneratedAt pdfDownloadedAt pdfFinalized pdfFinalizedAt cardFinalized');
    res.json({
      pdfHtml: stripNextSteps(user?.pdfHtml || ''),
      pdfGeneratedAt: user?.pdfGeneratedAt || null,
      pdfDownloadedAt: user?.pdfDownloadedAt || null,
      pdfFinalized: user?.pdfFinalized || false,
      pdfFinalizedAt: user?.pdfFinalizedAt || null,
      cardFinalized: user?.cardFinalized || false,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/export/save — save latest export HTML (preview) and reset finalization
router.post('/save', async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: 'html required' });
  const cleanedHtml = stripNextSteps(html);
  try {
    const user = await User.findByIdAndUpdate(
      req.weddingId,
      { $set: { pdfHtml: cleanedHtml, pdfGeneratedAt: new Date(), pdfFinalized: false, pdfFinalizedAt: null } },
      { new: true }
    ).select('pdfHtml pdfGeneratedAt pdfFinalized');
    res.json({
      pdfHtml: stripNextSteps(user.pdfHtml),
      pdfGeneratedAt: user.pdfGeneratedAt,
      pdfFinalized: user.pdfFinalized,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/export/mark-downloaded — mark the latest export as downloaded
router.post('/mark-downloaded', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.weddingId,
      { $set: { pdfDownloadedAt: new Date() } },
      { new: true }
    ).select('pdfDownloadedAt');
    res.json({ pdfDownloadedAt: user.pdfDownloadedAt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/export/finalize — finalize PDF
router.post('/finalize', async (req, res) => {
  try {
    const user = await User.findById(req.weddingId).select('pdfHtml pdfDownloadedAt');
    if (!user?.pdfHtml) return res.status(400).json({ error: 'No PDF generated yet.' });
    if (!user?.pdfDownloadedAt) return res.status(400).json({ error: 'Download the PDF before finalizing.' });

    const updated = await User.findByIdAndUpdate(
      req.weddingId,
      { $set: { pdfFinalized: true, pdfFinalizedAt: new Date() } },
      { new: true }
    ).select('pdfFinalized pdfFinalizedAt');

    res.json({ pdfFinalized: updated.pdfFinalized, pdfFinalizedAt: updated.pdfFinalizedAt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;



