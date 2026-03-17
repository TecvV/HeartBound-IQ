const express = require('express');
const { protect } = require('../middleware/auth');
const router  = express.Router();
router.use(protect);
const agent  = require('../agents/vendorAgent');
const Vendor = require('../models/Vendor');
const Budget = require('../models/Budget');

// POST /api/vendors/search
router.post('/search', async (req, res) => {
  const { city, category, maxBudget, guestCount } = req.body;
  if (!city || !category) return res.status(400).json({ error: 'city and category are required' });
  const brief = { city: city.trim(), category, maxBudget: maxBudget ? parseInt(maxBudget) : null, guestCount: parseInt(guestCount) || 300 };
  const result = await agent.search(brief);
  if (!result.success) return res.status(500).json({ error: result.error });
  try {
    await Vendor.deleteMany({ weddingId: req.weddingId, category });
    if (result.vendors.length) await Vendor.insertMany(result.vendors.map(v => ({ ...v, weddingId: req.weddingId })));
    console.log(`[VendorRoutes] Saved ${result.vendors.length} ${category}s for user ${req.weddingId}`);
  } catch (e) { console.log('[VendorRoutes] DB save skipped:', e.message); }
  res.json({ vendors: result.vendors, agentNote: result.agentNote, brief });
});

// GET /api/vendors?category=Photographer
router.get('/', async (req, res) => {
  try {
    const filter = { weddingId: req.weddingId };
    if (req.query.category) filter.category = req.query.category;
    const vendors = await Vendor.find(filter).sort({ aiScore: -1 });
    res.json({ vendors });
  } catch { res.json({ vendors: [] }); }
});

// POST /api/vendors/select — select vendor and log to budget
router.post('/select', async (req, res) => {
  const { vendor, budget } = req.body;
  if (!vendor) return res.status(400).json({ error: 'vendor data required' });
  const amount = parseInt(budget) || vendor.minPrice || 0;
  try {
    await Budget.findOneAndUpdate(
      { weddingId: req.weddingId },
      { $push: { entries: { category: vendor.category || 'Vendor', description: vendor.name, vendor: vendor.name, amount, paid: false } } },
      { upsert: true, new: true }
    );
  } catch (e) { console.log('[VendorRoutes] Budget log skipped:', e.message); }
  res.json({ success: true, vendor, amount, message: `${vendor.name} selected and logged to Budget Tracker.` });
});

module.exports = router;
