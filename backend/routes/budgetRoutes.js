const express = require('express');
const router  = express.Router();
const Budget  = require('../models/Budget');
const User    = require('../models/User');
const agent   = require('../agents/budgetTrackerAgent');

const CONFIRM_MAP = {
  'Venue': 'venue',
  'Catering': 'caterer',
  'Photography': 'photographer',
  'Decoration': 'decorator',
  'DJ / Music': 'dj',
};

function filterConfirmedEntries(entries, confirmed) {
  if (!entries || !entries.length) return [];
  return entries.filter(e => {
    const key = CONFIRM_MAP[e.category];
    if (!key) return true;
    return !!confirmed?.[key];
  });
}

const { protect } = require('../middleware/auth');

router.use(protect);

async function getBudget(weddingId) {
  let b = await Budget.findOne({ weddingId });
  if (!b) b = await Budget.create({ weddingId, totalBudget: 1500000, entries: [] });
  return b;
}

// GET /api/budget
router.get('/', async (req, res) => {
  try {
    const budget  = await getBudget(req.weddingId);
    const user    = await User.findById(req.weddingId).select('confirmed');
    const confirmedEntries = filterConfirmedEntries(budget.entries, user?.confirmed || {});
    const summary = agent.summarize(budget.totalBudget, confirmedEntries);
    res.json({ budget, summary, categories: agent.categories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/budget/total
router.put('/total', async (req, res) => {
  const { totalBudget } = req.body;
  if (!totalBudget || totalBudget < 0) return res.status(400).json({ error: 'Invalid total' });
  try {
    const budget  = await Budget.findOneAndUpdate(
      { weddingId: req.weddingId },
      { totalBudget: parseInt(totalBudget) },
      { new: true, upsert: true }
    );
    const user    = await User.findById(req.weddingId).select('confirmed');
    const confirmedEntries = filterConfirmedEntries(budget.entries, user?.confirmed || {});
    res.json({ budget, summary: agent.summarize(budget.totalBudget, confirmedEntries) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/budget/entries
router.post('/entries', async (req, res) => {
  const { category, description, vendor, amount, paid, note } = req.body;
  if (!category || !description || !amount) return res.status(400).json({ error: 'Missing fields' });
  try {
    const budget = await Budget.findOneAndUpdate(
      { weddingId: req.weddingId },
      { $push: { entries: { category, description, vendor: vendor||'', amount: parseFloat(amount), paid: paid||false, note: note||'' } } },
      { new: true, upsert: true }
    );
    const user    = await User.findById(req.weddingId).select('confirmed');
    const confirmedEntries = filterConfirmedEntries(budget.entries, user?.confirmed || {});
    res.status(201).json({ budget, summary: agent.summarize(budget.totalBudget, confirmedEntries) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/budget/entries/:id
router.put('/entries/:id', async (req, res) => {
  try {
    const updates = {};
    Object.keys(req.body).forEach(k => { updates[`entries.$.${k}`] = req.body[k]; });
    const budget = await Budget.findOneAndUpdate(
      { weddingId: req.weddingId, 'entries._id': req.params.id },
      { $set: updates }, { new: true }
    );
    const user    = await User.findById(req.weddingId).select('confirmed');
    const confirmedEntries = filterConfirmedEntries(budget.entries, user?.confirmed || {});
    res.json({ budget, summary: agent.summarize(budget.totalBudget, confirmedEntries) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/budget/entries/:id
router.delete('/entries/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { weddingId: req.weddingId },
      { $pull: { entries: { _id: req.params.id } } },
      { new: true }
    );
    const user    = await User.findById(req.weddingId).select('confirmed');
    const confirmedEntries = filterConfirmedEntries(budget.entries, user?.confirmed || {});
    res.json({ budget, summary: agent.summarize(budget.totalBudget, confirmedEntries) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/budget/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const budget  = await getBudget(req.weddingId);
    const user    = await User.findById(req.weddingId).select('confirmed');
    const confirmedEntries = filterConfirmedEntries(budget.entries, user?.confirmed || {});
    const summary = agent.summarize(budget.totalBudget, confirmedEntries);
    const tips    = await agent.getSuggestions(summary);
    res.json({ tips });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

