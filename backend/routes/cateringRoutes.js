const express = require('express');
const { protect } = require('../middleware/auth');
const router  = express.Router();
router.use(protect);
const agent   = require('../agents/cateringAgent');
const Caterer = require('../models/Caterer');
const Budget  = require('../models/Budget');

// POST /api/catering/search
router.post('/search', async (req, res) => {
  const { city, guestCount, budgetPerHead, cuisines } = req.body;
  if (!city || !guestCount) return res.status(400).json({ error: 'city and guestCount are required' });
  const brief = { city: city.trim(), guestCount: parseInt(guestCount), budgetPerHead: budgetPerHead ? parseInt(budgetPerHead) : null, cuisines: cuisines || [] };
  const result = await agent.search(brief);
  if (!result.success) return res.status(500).json({ error: result.error });
  try {
    await Caterer.deleteMany({ weddingId: req.weddingId, city: brief.city });
    if (result.caterers.length) await Caterer.insertMany(result.caterers.map(c => ({ ...c, weddingId: req.weddingId })));
    console.log(`[CateringRoutes] Saved ${result.caterers.length} caterers for user ${req.weddingId}`);
  } catch (e) { console.log('[CateringRoutes] DB save skipped:', e.message); }
  res.json({ caterers: result.caterers, agentNote: result.agentNote, brief });
});

// GET /api/catering — fetch saved caterers
router.get('/', async (req, res) => {
  try {
    const caterers = await Caterer.find({ weddingId: req.weddingId }).sort({ aiScore: -1 });
    res.json({ caterers });
  } catch { res.json({ caterers: [] }); }
});

// POST /api/catering/menu
router.post('/menu', async (req, res) => {
  const { cuisine, guestCount, preferences } = req.body;
  if (!cuisine) return res.status(400).json({ error: 'cuisine is required' });
  const menu = await agent.generateMenu(cuisine, guestCount || 300, preferences || '');
  res.json({ menu, cuisine });
});

// POST /api/catering/select — select caterer and log to budget
router.post('/select', async (req, res) => {
  const { caterer, guestCount } = req.body;
  if (!caterer) return res.status(400).json({ error: 'caterer data required' });
  const totalCost = (caterer.pricePerHead || 900) * (guestCount || 300);
  try {
    await Budget.findOneAndUpdate(
      { weddingId: req.weddingId },
      { $push: { entries: { category:'Catering', description:caterer.name, vendor:caterer.name, amount:totalCost, paid:false } } },
      { upsert: true, new: true }
    );
  } catch (e) { console.log('[CateringRoutes] Budget log skipped:', e.message); }
  res.json({ success: true, caterer, totalCost, message: `${caterer.name} selected and logged to Budget Tracker.` });
});

module.exports = router;
