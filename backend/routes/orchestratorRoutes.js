const express    = require('express');
const { protect }= require('../middleware/auth');
const router     = express.Router();
router.use(protect);
const agent    = require('../agents/orchestratorAgent');
const User     = require('../models/User');
const Budget   = require('../models/Budget');
const Timeline = require('../models/Timeline');
const Venue    = require('../models/Venue');
const Caterer  = require('../models/Caterer');
const Vendor   = require('../models/Vendor');
const Guest    = require('../models/Guest');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');

// GET /api/orchestrate — check if plan exists for user
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.weddingId).select('lastPlan planStatus planRunAt wedding selections confirmed websiteUrl allInvitesSentAt cardHtml cardFinalized cardFinalizedAt pdfHtml pdfGeneratedAt pdfDownloadedAt pdfFinalized pdfFinalizedAt websiteHtml websiteData websiteGeneratedAt websiteFinalized websiteFinalizedAt');
    res.json({
      hasPlan:      !!user?.lastPlan,
      planStatus:   user?.planStatus || 'none',
      planRunAt:    user?.planRunAt,
      plan:         user?.lastPlan,
      wedding:      user?.wedding,
      selections:   user?.selections,
      confirmed:    user?.confirmed || {},
      allConfirmed: !!(user?.confirmed?.venue && user?.confirmed?.caterer && user?.confirmed?.photographer && user?.confirmed?.decorator && user?.confirmed?.dj),
      websiteUrl:   user?.websiteUrl || '',
      allInvitesSentAt: user?.allInvitesSentAt || null,
      cardHtml:     user?.cardHtml || '',
      cardFinalized:user?.cardFinalized || false,
      cardFinalizedAt: user?.cardFinalizedAt || null,
      pdfHtml:      user?.pdfHtml || '',
      pdfGeneratedAt: user?.pdfGeneratedAt || null,
      pdfDownloadedAt: user?.pdfDownloadedAt || null,
      pdfFinalized: user?.pdfFinalized || false,
      pdfFinalizedAt: user?.pdfFinalizedAt || null,
      websiteHtml:  user?.websiteHtml || '',
      websiteData:  user?.websiteData || null,
      websiteGeneratedAt: user?.websiteGeneratedAt || null,
      websiteFinalized: user?.websiteFinalized || false,
      websiteFinalizedAt: user?.websiteFinalizedAt || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orchestrate — run full plan
router.post('/', async (req, res) => {
  const { brideName, groomName, city, guestCount } = req.body;
  if (!brideName || !groomName || !city || !guestCount)
    return res.status(400).json({ error: 'brideName, groomName, city and guestCount are required' });

  try {
    // Mark as running
    await User.findByIdAndUpdate(req.weddingId, { $set: { planStatus: 'running' } });

    const result = await agent.run(req.body);
    if (!result.success) {
      await User.findByIdAndUpdate(req.weddingId, { $set: { planStatus: 'none' } });
      return res.status(500).json({ error: result.error });
    }

    const { picks, options } = result;

    // 1. Save full plan + wedding details + initial selections to User
    await User.findByIdAndUpdate(req.weddingId, {
      $set: {
        lastPlan:   result,
        planStatus: 'ready',
        planRunAt:  new Date(),
        'wedding.brideName':    brideName,
        'wedding.groomName':    groomName,
        'wedding.city':         city,
        'wedding.guestCount':   parseInt(guestCount),
        'wedding.weddingDate':  req.body.weddingDate  || '',
        'wedding.totalBudget':  req.body.totalBudget  || 0,
        'wedding.religion':     req.body.religion     || 'Hindu',
        'wedding.cuisines':     req.body.cuisines     || [],
        'wedding.ceremonyTime': req.body.ceremonyTime || '7:00 PM',
        'wedding.hasBaraat':    req.body.hasBaraat    ?? true,
        'wedding.hasMehendi':   req.body.hasMehendi   ?? true,
        'wedding.hasSangeet':   req.body.hasSangeet   ?? true,
        'wedding.hasHaldi':     req.body.hasHaldi     ?? false,
        // Store LLM's initial picks as selections
        'selections.venue':        picks.venue        || null,
        'selections.caterer':      picks.caterer      || null,
        'selections.photographer': picks.photographer || null,
        'selections.decorator':    picks.decorator    || null,
        'selections.dj':           picks.dj           || null,
      }
    });

    // 2. Save all venue options to MongoDB (per user)
    if (options.venues?.length) {
      await Venue.deleteMany({ weddingId: req.weddingId });
      await Venue.insertMany(options.venues.map(v => ({ ...v, weddingId: req.weddingId })));
    }

    // 3. Save all caterer options
    if (options.caterers?.length) {
      await Caterer.deleteMany({ weddingId: req.weddingId });
      await Caterer.insertMany(options.caterers.map(c => ({ ...c, weddingId: req.weddingId })));
    }

    // 4. Save all vendor options
    for (const [key, arr] of [['Photographer', options.photographers], ['Decorator', options.decorators], ['DJ / Music', options.djs]]) {
      if (arr?.length) {
        await Vendor.deleteMany({ weddingId: req.weddingId, category: key });
        await Vendor.insertMany(arr.map(v => ({ ...v, weddingId: req.weddingId, category: key })));
      }
    }

    // 5. Seed Budget with picks
    const entries = [];
    const pc = result.costs;
    if (pc.venue)    entries.push({ category:'Venue',        description: picks.venue?.name    || 'Venue',        vendor: picks.venue?.name    || '', amount: pc.venue,    paid: false });
    if (pc.catering) entries.push({ category:'Catering',     description: picks.caterer?.name  || 'Caterer',      vendor: picks.caterer?.name  || '', amount: pc.catering, paid: false });
    if (pc.photo)    entries.push({ category:'Photography',  description: picks.photographer?.name || 'Photographer', vendor: picks.photographer?.name || '', amount: pc.photo, paid: false });
    if (pc.decor)    entries.push({ category:'Decoration',   description: picks.decorator?.name || 'Decorator',   vendor: picks.decorator?.name || '', amount: pc.decor,    paid: false });
    if (pc.dj)       entries.push({ category:'DJ / Music',   description: picks.dj?.name       || 'DJ',          vendor: picks.dj?.name       || '', amount: pc.dj,       paid: false });
    if (pc.misc)     entries.push({ category:'Miscellaneous',description: 'Buffer / Misc (8%)', vendor: '',       amount: pc.misc, paid: false });
    if (entries.length) {
      await Budget.findOneAndUpdate(
        { weddingId: req.weddingId },
        { $set: { weddingId: req.weddingId, totalBudget: req.body.totalBudget || pc.total, entries } },
        { upsert: true, new: true }
      );
    }

    // 6. Save Timeline
    if (result.timeline?.length) {
      await Timeline.findOneAndUpdate(
        { weddingId: req.weddingId },
        { $set: { weddingId: req.weddingId, brideName, groomName, weddingDate: req.body.weddingDate, events: result.timeline, tips: result.tips || [], brief: req.body } },
        { upsert: true, new: true }
      );
    }

    console.log(`[OrchestratorRoutes] ✓ Full plan saved to MongoDB for user ${req.weddingId}`);
    res.json(result);
  } catch (err) {
    await User.findByIdAndUpdate(req.weddingId, { $set: { planStatus: 'none' } }).catch(()=>{});
    console.error('[OrchestratorRoutes] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orchestrate/select — user overrides a selection
router.put('/select', async (req, res) => {
  const { category, item } = req.body;
  if (!category || !item) return res.status(400).json({ error: 'category and item required' });

  const catMap = { venue:'venue', caterer:'caterer', catering:'caterer', photographer:'photographer', decorator:'decorator', dj:'dj' };
  const key    = catMap[category.toLowerCase()];
  if (!key) return res.status(400).json({ error: `Unknown category: ${category}` });

  try {
    // Update selection
    const resetTools = {
      cardHtml: '', cardFinalized: false, cardFinalizedAt: null,
      pdfHtml: '', pdfGeneratedAt: null, pdfDownloadedAt: null, pdfFinalized: false, pdfFinalizedAt: null,
      websiteHtml: '', websiteData: null, websiteGeneratedAt: null, websiteFinalized: false, websiteFinalizedAt: null,
      allInvitesSentAt: null,
    };
    const resetConfirmed = { [`confirmed.${key}`]: false };
    const user = await User.findByIdAndUpdate(
      req.weddingId,
      { $set: { [`selections.${key}`]: { ...item, confirmedAt: null, aiJustification: `Manually selected by ${req.user.name}` }, ...resetTools, ...resetConfirmed } },
      { new: true }
    ).select('selections lastPlan wedding');

    // Update Budget entry for this category
    const catBudgetMap = { venue:'Venue', caterer:'Catering', photographer:'Photography', decorator:'Decoration', dj:'DJ / Music' };
    const budgetCat    = catBudgetMap[key];
    const amount       = key === 'caterer' || key === 'venue'
      ? (item.pricePerHead || 0) * (user.wedding?.guestCount || 300)
      : (item.minPrice || item.totalEstimatedCost || 0);

    if (amount > 0 && budgetCat) {
      const budget = await Budget.findOne({ weddingId: req.weddingId });
      if (budget) {
        const idx = budget.entries.findIndex(e => e.category === budgetCat);
        if (idx >= 0) {
          budget.entries[idx].description = item.name;
          budget.entries[idx].vendor      = item.name;
          budget.entries[idx].amount      = amount;
        } else {
          budget.entries.push({ category: budgetCat, description: item.name, vendor: item.name, amount, paid: false });
        }
        await budget.save();
      }
    }

    res.json({ success: true, selections: user.selections, message: `${item.name} selected as your ${key}.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/orchestrate — cancel plan and wipe all user data
router.delete('/', async (req, res) => {
  try {
    await Promise.all([
      User.findByIdAndUpdate(req.weddingId, {
        $set: { lastPlan: null, planStatus: 'none', planRunAt: null, selections: {}, websiteHtml: '', cardHtml: '',
          cardFinalized: false, cardFinalizedAt: null,
          pdfHtml: '', pdfGeneratedAt: null, pdfDownloadedAt: null, pdfFinalized: false, pdfFinalizedAt: null,
          websiteData: null, websiteGeneratedAt: null, websiteFinalized: false, websiteFinalizedAt: null,
          'wedding.brideName': '', 'wedding.groomName': '', 'wedding.weddingDate': '', 'wedding.city': '',
          'wedding.totalBudget': 0, 'wedding.guestCount': 0,
        }
      }),
      Budget.deleteOne({ weddingId: req.weddingId }),
      Timeline.deleteOne({ weddingId: req.weddingId }),
      Venue.deleteMany({ weddingId: req.weddingId }),
      Caterer.deleteMany({ weddingId: req.weddingId }),
      Vendor.deleteMany({ weddingId: req.weddingId }),
      Guest.deleteMany({ weddingId: req.weddingId }),
    ]);
    console.log(`[OrchestratorRoutes] ✓ Plan deleted for user ${req.weddingId}`);
    res.json({ success: true, message: 'Your wedding plan has been reset. Start fresh anytime.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

// PUT /api/orchestrate/confirm — finalize a category
router.put('/confirm', async (req, res) => {
  const { category, confirmed } = req.body;
  const cats = ['venue','caterer','photographer','decorator','dj'];
  if (!cats.includes(category))
    return res.status(400).json({ error: `Unknown category: ${category}` });
  try {
    const updateFields = { [`confirmed.${category}`]: confirmed !== false };
    // If confirming, stamp the confirmAt on the selection too
    if (confirmed !== false) {
      updateFields[`selections.${category}.confirmedAt`] = new Date();
    }
    const user = await User.findByIdAndUpdate(
      req.weddingId,
      { $set: updateFields },
      { new: true }
    ).select('confirmed selections wedding');
    res.json({ success: true, confirmed: user.confirmed, allConfirmed: user.allConfirmed() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/orchestrate/website-url — save deployed website URL
router.put('/website-url', async (req, res) => {
  const { url } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.weddingId,
      { $set: { websiteUrl: url } },
      { new: true }
    ).select('websiteUrl');
    res.json({ websiteUrl: user.websiteUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orchestrate/invite-all - send card PDF + website to ALL guests
router.post('/invite-all', async (req, res) => {
  try {
    const user = await User.findById(req.weddingId)
      .select('confirmed wedding selections lastPlan websiteUrl websiteHtml cardHtml allInvitesSentAt cardFinalized pdfHtml pdfFinalized websiteFinalized');

    if (!user.allConfirmed())
      return res.status(400).json({ error: 'All 5 vendor categories must be confirmed before sending invites.' });

    if (!user.cardFinalized)
      return res.status(400).json({ error: 'Finalize the wedding card before sending invites.' });
    if (!user.websiteFinalized)
      return res.status(400).json({ error: 'Finalize the wedding website before sending invites.' });


    const guests = await Guest.find({ weddingId: req.weddingId });
    if (!guests.length)
      return res.status(400).json({ error: 'No guests in list. Add guests in Guest Manager first.' });

    const nodemailer  = require('nodemailer');
    const cardGen     = require('../agents/weddingCardGenerator');
    const isMailReady = process.env.MAIL_USER && process.env.MAIL_USER !== 'your_gmail@gmail.com';

    const w          = user.wedding || {};
    const selectedVenue = user?.selections?.venue?.name || w.venue || user?.lastPlan?.picks?.venue?.name || (user?.lastPlan?.options?.venues && user.lastPlan.options.venues[0] && user.lastPlan.options.venues[0].name) || 'Venue TBD';
    const selectedCity = user?.selections?.venue?.city || w.city || user?.lastPlan?.picks?.venue?.city || '';
    w.venue = selectedVenue;
    w.city = selectedCity;
    const websiteUrl = user.websiteUrl || null;
    const designIdx  = w.cardDesignIndex || 1;
    const baseCardHtml = user.cardHtml || await cardGen.generate({
      brideName: w.brideName, groomName: w.groomName, weddingDate: w.weddingDate,
      ceremonyTime: w.ceremonyTime || '7:00 PM', venue: w.venue || '', city: w.city || '',
      religion: w.religion || 'Hindu', guestName: 'Guest', guestWithFamily: false
    }, designIdx);

    let transporter = null;
    if (isMailReady) {
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
      if (!guest.rsvpToken) {
        guest.rsvpToken = crypto.randomBytes(16).toString('hex');
        guest.rsvpTokenCreatedAt = new Date();
        await guest.save();
      }

      const cardHtml = await cardGen.generate({
        brideName:    w.brideName,
        groomName:    w.groomName,
        weddingDate:  w.weddingDate,
        ceremonyTime: w.ceremonyTime || '7:00 PM',
        venue:        w.venue || '',
        city:         w.city  || '',
        religion:     w.religion || 'Hindu',
        guestName:    guest.name,
        guestWithFamily: !!guest.inviteWithFamily,
        designIndex:  designIdx,
      }, designIdx);

      const rsvpLink = `${(process.env.PUBLIC_BASE_URL || 'http://localhost:5009').replace(/\/$/,'')}/rsvp/${guest.rsvpToken}`;
      const emailBody = buildInviteEmail(guest, w, cardHtml, websiteUrl, rsvpLink);

      const cardPdfBuffer = await renderCardPdfFromHtml(cardHtml);
      const attachments = [
        { filename: 'Wedding-Invitation-Card.pdf', content: cardPdfBuffer, contentType: 'application/pdf', contentDisposition: 'attachment' },
      ];
      if (user.websiteHtml) {
        const websitePdf = await renderCardPdfFromHtml(user.websiteHtml);
        attachments.push({ filename: 'Other details.pdf', content: websitePdf, contentType: 'application/pdf', contentDisposition: 'attachment' });
      }

      if (!transporter) {
        preview++;
        results.push({ guestId: guest._id, email: guest.email, success: true, preview: true });
        continue;
      }

      try {
        await transporter.sendMail({
          from:    process.env.MAIL_FROM || '"HeartBound IQ Weddings" <noreply@HeartBound IQ.com>',
          to:      `"${guest.name}" <${guest.email}>`,
          subject: `You're invited - ${w.brideName} & ${w.groomName}`,
          html:    emailBody,
          attachments,
        });
        sent++;
        await Guest.findByIdAndUpdate(guest._id, { inviteSent: true, inviteSentAt: new Date() });
        results.push({ guestId: guest._id, email: guest.email, success: true });
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        failed++;
        results.push({ guestId: guest._id, email: guest.email, success: false, error: e.message });
      }
    }

    if (!isMailReady) {
      await User.findByIdAndUpdate(req.weddingId, { $set: { allInvitesSentAt: new Date() } });
      return res.json({
        sent: 0, failed: 0, preview, previewMode: true,
        message: `Preview mode: ${preview} personalised invitations prepared. Add MAIL_USER and MAIL_PASS to .env to send real emails.`,
      });
    }

    if (sent > 0) {
      await User.findByIdAndUpdate(req.weddingId, { $set: { allInvitesSentAt: new Date() } });
    }
    res.json({ sent, failed, preview: 0, previewMode: false, results });
  } catch (err) {
    console.error('[InviteAll]', err.message);
    res.status(500).json({ error: err.message });
  }
});
function htmlToText(html) {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/\s+/g,' ')
    .trim();
}

function renderPdfBufferFromHtml(html) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (d) => chunks.push(d));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.font('Times-Roman').fontSize(12).text(htmlToText(html), { align: 'left' });
    doc.end();
  });
}


async function renderCardPdfFromHtml(html) {
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return pdf;
  } catch (e) {
    // fallback to text-only PDF
    return renderPdfBufferFromHtml(html);
  }
}

function buildInviteEmail(guest, w, cardHtml, websiteUrl, rsvpLink) {
  const dateStr = w.weddingDate
    ? new Date(w.weddingDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    : w.weddingDate || 'Date TBD';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
body{margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;color:#222}
.outer{max-width:620px;margin:0 auto;padding:20px;background:#ffffff}
.greeting{background:#0a0005;border:1px solid #1e0f18;padding:28px 28px 20px;text-align:center;margin-bottom:16px}
.greeting *{color:#f5e6d0 !important;font-family:Georgia,serif !important;}
.greeting h1{font-size:15px;color:#c9a84c !important;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:12px}
.greeting p{font-size:15px;color:#f5e6d0 !important;line-height:1.8;font-style:italic;font-weight:600}
.details{background:#ffffff;border:1px solid #ddd;padding:16px 20px;margin-bottom:16px}
.details p{font-size:13px;color:#111;line-height:2;margin:0}
.details strong{color:#111}
.website-btn{display:block;text-align:center;background:#8B0000;color:#FFD700 !important;text-decoration:none;padding:14px 28px;font-size:14px;letter-spacing:0.1em;margin:16px auto 16px;max-width:260px;border-radius:6px}
.footer{text-align:center;font-size:11px;color:#666;padding:12px;letter-spacing:0.1em}
.email-text, .email-text *{font-family:Georgia,serif !important;color:#222 !important;font-size:14px !important;line-height:1.8 !important;font-style:normal !important;font-weight:400 !important;}
.email-text h1{font-size:15px !important;letter-spacing:0.2em !important;text-transform:uppercase !important;color:#c9a84c !important;font-weight:600 !important;}
.email-text .greeting-text{color:#f5e6d0 !important;}

</style></head><body>
<div class="outer">
  <div class="greeting">
    <h1>You Are Cordially Invited</h1>
    <p style="color:#f5e6d0">Dear <strong style="color:#f5e6d0">${guest.inviteWithFamily ? guest.name + ' &amp; Family' : guest.name}</strong>,<br/><br/>
    We are overjoyed to announce the wedding of<br/>
    <strong style="font-size:18px;color:#e8c4b8">${w.brideName}</strong> &amp; <strong style="font-size:18px;color:#f5e6d0">${w.groomName}</strong><br/><br/>
    Your presence and blessings will make our special day truly complete.</p>
  </div>

  <div class="details email-text">
    <p><strong>Date:</strong> ${dateStr}</p>
    <p><strong>Time:</strong> ${w.ceremonyTime || '7:00 PM onwards'}</p>
    <p><strong>Venue:</strong> ${(w.venue || 'Venue TBD')}</p>
    <p><strong>City:</strong> ${w.city || ''}</p>
  </div>

  ${rsvpLink ? `<a href="${rsvpLink}" class="website-btn">RSVP Here</a>` : ''}

  <p class="email-text" style="text-align:center;margin:10px 0 0;">Your personalised invitation card is attached as a PDF.</p>

  <p style="text-align:center;font-size:12px;color:#222;margin:18px 0 0;">Other wedding details are attached as a PDF.</p>

  <div class="footer">
    With love - ${w.brideName} &amp; ${w.groomName}  Made with HeartBound IQ
  </div>
</div>
</body></html>`;
}







