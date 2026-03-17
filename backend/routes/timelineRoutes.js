const express  = require('express');
const { protect } = require('../middleware/auth');
const router   = express.Router();
router.use(protect);
const agent    = require('../agents/timelineAgent');
const Timeline = require('../models/Timeline');

// POST /api/timeline/generate
router.post('/generate', async (req, res) => {
  const brief = req.body;
  if (!brief.brideName || !brief.groomName)
    return res.status(400).json({ error: 'brideName and groomName are required' });

  const result = await agent.generate(brief);
  if (!result.success) return res.status(500).json({ error: result.error });

  try {
    await Timeline.findOneAndUpdate(
      { weddingId: req.weddingId },
      { weddingId: req.weddingId, brideName: brief.brideName, groomName: brief.groomName, weddingDate: brief.weddingDate, events: result.events, tips: result.tips, brief },
      { upsert: true, new: true }
    );
    console.log(`[TimelineRoutes] Saved ${result.events.length} events for user ${req.weddingId}`);
  } catch (e) { console.log('[TimelineRoutes] DB save skipped:', e.message); }

  res.json({ events: result.events, tips: result.tips, agentNote: result.agentNote });
});

// GET /api/timeline
router.get('/', async (req, res) => {
  try {
    const data = await Timeline.findOne({ weddingId: req.weddingId });
    res.json({ timeline: data });
  } catch { res.json({ timeline: null }); }
});

// PUT /api/timeline/events/:id — toggle completed
router.put('/events/:id', async (req, res) => {
  try {
    const tl = await Timeline.findOne({ weddingId: req.weddingId });
    if (!tl) return res.status(404).json({ error: 'Timeline not found' });
    const ev = tl.events.id(req.params.id);
    if (ev) { ev.completed = req.body.completed ?? !ev.completed; await tl.save(); }
    res.json({ timeline: tl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
