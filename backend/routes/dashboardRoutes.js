const express  = require('express');
const { protect } = require('../middleware/auth');
const router   = express.Router();
router.use(protect);
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

function summarizeBudget(totalBudget, entries) {
  const spent = entries.reduce((s, e) => s + e.amount, 0);
  const paid  = entries.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
  const pctUsed = totalBudget ? Math.round(spent / totalBudget * 100) : 0;
  const remaining = totalBudget - spent;
  const categories = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  return { totalBudget, spent, paid, pctUsed, remaining, categories };
}


// GET /api/dashboard — aggregate all user data from MongoDB
router.get('/', async (req, res) => {
  try {
    const User     = require('../models/User');
    const Guest    = require('../models/Guest');
    const Budget   = require('../models/Budget');
    const Timeline = require('../models/Timeline');
    const Venue    = require('../models/Venue');

    const wid = req.weddingId;

    const [user, guests, budget, timeline, venues] = await Promise.all([
      User.findById(wid).select('wedding lastPlan confirmed websiteUrl allInvitesSentAt'),
      Guest.find({ weddingId: wid }),
      Budget.findOne({ weddingId: wid }),
      Timeline.findOne({ weddingId: wid }),
      Venue.find({ weddingId: wid }).sort({ aiScore: -1 }).limit(3),
    ]);

    const confirmed = user?.confirmed || {};
    const confirmedEntries = filterConfirmedEntries(budget?.entries || [], confirmed);

    const stats = {
      weddingInfo: user?.wedding || {},
      hasPlan: !!user?.lastPlan,
      guests: {
        total:     guests.length,
        confirmed: guests.filter(g => g.rsvpStatus === 'confirmed').length,
        pending:   guests.filter(g => g.rsvpStatus === 'pending').length,
        declined:  guests.filter(g => g.rsvpStatus === 'declined').length,
        invited:   guests.filter(g => g.inviteSent).length,
      },
      budget: budget
        ? summarizeBudget(budget.totalBudget, confirmedEntries)
        : { totalBudget:0, spent:0, paid:0, pctUsed:0, remaining:0, categories:{} },
      timeline: timeline ? {
        total:     timeline.events.length,
        completed: timeline.events.filter(e => e.completed).length,
      } : { total:0, completed:0 },
      vendors: {
        venue:        !!confirmed?.venue,
        catering:     !!confirmed?.caterer,
        photographer: !!confirmed?.photographer,
        decorator:    !!confirmed?.decorator,
        dj:           !!confirmed?.dj,
      },
      topVenues: venues,
      confirmed:   user?.confirmed || {},
      allConfirmed: !!(user?.confirmed?.venue && user?.confirmed?.caterer && user?.confirmed?.photographer && user?.confirmed?.decorator && user?.confirmed?.dj),
      websiteUrl:  user?.websiteUrl || '',
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dashboard/info — update wedding details
router.put('/info', async (req, res) => {
  try {
    const User = require('../models/User');
    const allowed = ['brideName','groomName','weddingDate','city','venue','totalBudget','guestCount','religion'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[`wedding.${k}`] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.weddingId, { $set: updates }, { new: true });
    res.json({ info: user?.wedding });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

