const express = require('express');
const { protect } = require('../middleware/auth');
const router  = express.Router();
router.use(protect);
const agent = require('../agents/venueScoutAgent');
const Venue = require('../models/Venue');

// POST /api/venues/scout — run agent, save results per user
router.post('/scout', async (req, res) => {
  const { city, guestCount, budgetTotal, weddingDate, preferences } = req.body;
  if (!city || !guestCount || !budgetTotal)
    return res.status(400).json({ error: 'city, guestCount, and budgetTotal are required' });

  const brief = { city: city.trim(), guestCount: parseInt(guestCount), budgetTotal: parseInt(budgetTotal), weddingDate: weddingDate||null, preferences: preferences||'' };
  const result = await agent.scout(brief);
  if (!result.success) return res.status(500).json({ error: result.error });

  // Save per-user to MongoDB
  try {
    await Venue.deleteMany({ weddingId: req.weddingId, city: brief.city });
    if (result.venues.length > 0) {
      await Venue.insertMany(result.venues.map(v => ({
        ...v,
        weddingId: req.weddingId,
        phone: v.phone || v.contact || v.contactPhone || null,
        contactPhone: v.phone || v.contact || v.contactPhone || null,
      })));
    }
    console.log(`[VenueRoutes] Saved ${result.venues.length} venues to MongoDB for user ${req.weddingId}`);
  } catch (e) { console.log('[VenueRoutes] DB save skipped:', e.message); }

  res.json({ agentNote: result.agentNote, venues: result.venues, brief });
});

// GET /api/venues — fetch user's saved venues from MongoDB
router.get('/', async (req, res) => {
  try {
    const filter = { weddingId: req.weddingId };
    if (req.query.city) filter.city = new RegExp(req.query.city, 'i');
    const venues = await Venue.find(filter).sort({ aiScore: -1 });
    res.json({ venues });
  } catch { res.json({ venues: [] }); }
});

module.exports = router;
