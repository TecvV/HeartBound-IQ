/**
 * HeartBound IQ — Orchestrator Agent v4
 *
 * - Fetches REAL data from Google Maps for every category
 * - Groq scores all options and picks the OPTIMAL one:
 *   maximising quality (rating) while minimising cost (value/money)
 * - Returns full justification for every pick
 * - Returns all options per category so user can override
 */
const venueAgent    = require('./venueScoutAgent');
const cateringAgent = require('./cateringAgent');
const vendorAgent   = require('./vendorAgent');
const budgetAgent   = require('./budgetTrackerAgent');
const timelineAgent = require('./timelineAgent');
const axios         = require('axios');

class OrchestratorAgent {
  constructor() {
    this.name      = 'OrchestratorAgent';
    this.groqKey   = process.env.GROQ_API_KEY;
    this.groqModel = process.env.GROQ_MODEL || 'llama3-70b-8192';
  }

  async run(brief) {
    console.log(`\n[${this.name}] ══ Starting plan for ${brief.brideName} & ${brief.groomName} ══`);
    const t0 = Date.now();

    const budgetPerHead = brief.totalBudget
      ? Math.round(brief.totalBudget / brief.guestCount * 0.35) : null;

    // Run all data fetching in parallel
    const [venueRes, cateringRes, photoRes, decorRes, djRes, timelineRes] =
      await Promise.allSettled([
        venueAgent.scout({
          city: brief.city, guestCount: brief.guestCount,
          budgetTotal: brief.totalBudget ? Math.round(brief.totalBudget * 0.28) : 1500000,
          weddingDate: brief.weddingDate, preferences: brief.preferences || '',
        }),
        cateringAgent.search({
          city: brief.city, guestCount: brief.guestCount,
          budgetPerHead, cuisines: brief.cuisines || [],
        }),
        vendorAgent.search({ city: brief.city, category: 'Photographer', maxBudget: brief.totalBudget ? Math.round(brief.totalBudget * 0.05) : null, guestCount: brief.guestCount }),
        vendorAgent.search({ city: brief.city, category: 'Decorator',    maxBudget: brief.totalBudget ? Math.round(brief.totalBudget * 0.1)  : null, guestCount: brief.guestCount }),
        vendorAgent.search({ city: brief.city, category: 'DJ / Music',   maxBudget: brief.totalBudget ? Math.round(brief.totalBudget * 0.03) : null, guestCount: brief.guestCount }),
        timelineAgent.generate({
          brideName: brief.brideName, groomName: brief.groomName,
          weddingDate: brief.weddingDate, ceremonyTime: brief.ceremonyTime || '7:00 PM',
          venue: brief.venue || `top venue in ${brief.city}`,
          city: brief.city, religion: brief.religion || 'Hindu',
          guestCount: brief.guestCount,
          hasBaraat: brief.hasBaraat ?? true, hasMehendi: brief.hasMehendi ?? true,
          hasSangeet: brief.hasSangeet ?? true, hasHaldi: brief.hasHaldi ?? false,
        }),
      ]);

    const allVenues  = venueRes.value?.venues       || [];
    const allCaterers= cateringRes.value?.caterers  || [];
    const allPhotos  = photoRes.value?.vendors      || [];
    const allDecors  = decorRes.value?.vendors      || [];
    const allDJs     = djRes.value?.vendors         || [];
    const timeline   = timelineRes.value?.events    || [];
    const tips       = timelineRes.value?.tips      || [];

    // Let Groq make the OPTIMAL picks with full justification
    const picks = await this.groqOptimalPicks(brief, {
      venues: allVenues, caterers: allCaterers,
      photographers: allPhotos, decorators: allDecors, djs: allDJs,
    });

    const topVenue   = picks.venue       || allVenues[0]   || null;
    const topCaterer = picks.caterer     || allCaterers[0] || null;
    const topPhoto   = picks.photographer|| allPhotos[0]   || null;
    const topDecor   = picks.decorator   || allDecors[0]   || null;
    const topDJ      = picks.dj          || allDJs[0]      || null;

    const costs = {
      venue:    topVenue   ? (topVenue.totalEstimatedCost   || (topVenue.pricePerHead||1000)*brief.guestCount)   : 0,
      catering: topCaterer ? (topCaterer.totalEstimatedCost || (topCaterer.pricePerHead||900)*brief.guestCount)  : 0,
      photo:    topPhoto   ? (topPhoto.minPrice || 40000)   : 0,
      decor:    topDecor   ? (topDecor.minPrice || 50000)   : 0,
      dj:       topDJ      ? (topDJ.minPrice || 15000)      : 0,
    };
    costs.subtotal = Object.values(costs).reduce((a,b) => a+b, 0);
    costs.misc     = Math.round(costs.subtotal * 0.08);
    costs.total    = costs.subtotal + costs.misc;

    const budgetSummary = budgetAgent.summarize(
      brief.totalBudget || costs.total,
      [
        topVenue    && { category:'Venue',        description: topVenue.name,    amount: costs.venue    },
        topCaterer  && { category:'Catering',     description: topCaterer.name,  amount: costs.catering },
        topPhoto    && { category:'Photography',  description: topPhoto.name,    amount: costs.photo    },
        topDecor    && { category:'Decoration',   description: topDecor.name,    amount: costs.decor    },
        topDJ       && { category:'DJ / Music',   description: topDJ.name,       amount: costs.dj       },
        costs.misc  && { category:'Miscellaneous',description: 'Buffer (8%)',    amount: costs.misc     },
      ].filter(Boolean)
    );

    const masterSummary = await this.generateMasterSummary(brief, picks, costs, budgetSummary);
    const nextSteps     = this.buildNextSteps(brief, picks);
    const elapsed       = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[${this.name}] ✓ Plan complete in ${elapsed}s\n`);

    return {
      success: true, elapsed, brief,
      masterSummary,
      picks: { venue: topVenue, caterer: topCaterer, photographer: topPhoto, decorator: topDecor, dj: topDJ },
      options: { venues: allVenues, caterers: allCaterers, photographers: allPhotos, decorators: allDecors, djs: allDJs },
      costs, budgetSummary, timeline, tips, nextSteps,
    };
  }

  // ── Groq picks the OPTIMAL vendor in each category with justification ──────
  async groqOptimalPicks(brief, { venues, caterers, photographers, decorators, djs }) {
    if (!this.groqKey || this.groqKey === 'your_groq_api_key_here') {
      return {
        venue:        venues[0]        || null,
        caterer:      caterers[0]      || null,
        photographer: photographers[0] || null,
        decorator:    decorators[0]    || null,
        dj:           djs[0]           || null,
      };
    }

    const fmt = (arr, fields) => arr.slice(0, 6).map((x, i) =>
      `${i+1}. ${x.name} | Rating: ${x.rating}/5 (${x.reviewCount||0} reviews) | ${fields(x)} | Phone: ${x.phone || x.contact || 'not listed'}`
    ).join('\n');

    const prompt = `You are HeartBound IQ's Chief Wedding Planner AI. Your job is to select the SINGLE BEST option in each category for this Indian wedding.

WEDDING BRIEF:
- Couple: ${brief.brideName} & ${brief.groomName}
- City: ${brief.city}, Date: ${brief.weddingDate || 'TBD'}, Guests: ${brief.guestCount}
- Total Budget: ₹${(brief.totalBudget||0).toLocaleString('en-IN')}
- Budget per head limit: ₹${brief.totalBudget ? Math.round(brief.totalBudget/brief.guestCount) : 'open'}
- Religion: ${brief.religion || 'Hindu'}, Cuisines: ${brief.cuisines?.join(', ') || 'any'}

YOUR SELECTION CRITERIA (strictly follow this):
1. MAXIMISE quality: prefer rating ≥ 4.5, more reviews = more reliable
2. MINIMISE cost: prefer options that fit within budget without sacrificing quality
3. OPTIMAL balance: best rating-to-cost ratio wins, not cheapest or most expensive
4. Each pick must serve ${brief.guestCount} guests

VENUE OPTIONS (budget target: ≤₹${brief.totalBudget ? Math.round(brief.totalBudget*0.28/100000).toFixed(1)+'L' : 'open'}):
${fmt(venues, v => `₹${v.pricePerHead||'?'}/head, total est ₹${((v.pricePerHead||1000)*brief.guestCount).toLocaleString('en-IN')}, capacity: ${v.capacity||'unknown'}, amenities: ${v.amenities?.slice(0,3).join(', ')||'unknown'}`)}

CATERER OPTIONS (budget target: ≤₹${brief.totalBudget ? Math.round(brief.totalBudget*0.35/100000).toFixed(1)+'L' : 'open'}):
${fmt(caterers, c => `₹${c.pricePerHead||'?'}/head, cuisines: ${c.cuisines?.join(', ')||'?'}`)}

PHOTOGRAPHER OPTIONS (budget: ≤₹${brief.totalBudget ? Math.round(brief.totalBudget*0.05/1000)+'K' : 'open'}):
${fmt(photographers, p => `${p.priceRange||'?'}, style: ${p.style||'?'}, exp: ${p.experience||'?'}`)}

DECORATOR OPTIONS (budget: ≤₹${brief.totalBudget ? Math.round(brief.totalBudget*0.1/100000).toFixed(1)+'L' : 'open'}):
${fmt(decorators, d => `${d.priceRange||'?'}, style: ${d.style||'?'}, exp: ${d.experience||'?'}`)}

DJ OPTIONS (budget: ≤₹${brief.totalBudget ? Math.round(brief.totalBudget*0.03/1000)+'K' : 'open'}):
${fmt(djs, d => `${d.priceRange||'?'}, style: ${d.style||'?'}`)}

For each category, select the best option (by 1-based index from the list above).
Write a 2-sentence justification proving you maximised quality AND minimised cost.

Respond ONLY as valid JSON:
{
  "venue":        { "index": 1, "justification": "..." },
  "caterer":      { "index": 1, "justification": "..." },
  "photographer": { "index": 1, "justification": "..." },
  "decorator":    { "index": 1, "justification": "..." },
  "dj":           { "index": 1, "justification": "..." }
}`;

    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: this.groqModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800, temperature: 0.2,
      }, {
        headers: { 'Authorization': `Bearer ${this.groqKey}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const parsed = JSON.parse(res.data.choices[0].message.content.match(/\{[\s\S]*\}/)[0]);
      console.log(`[${this.name}] ✓ Groq made optimal picks`);

      const pick = (arr, key) => {
        const idx   = (parsed[key]?.index || 1) - 1;
        const item  = arr[Math.max(0, Math.min(idx, arr.length-1))] || arr[0];
        return item ? { ...item, aiJustification: parsed[key]?.justification || '' } : null;
      };

      return {
        venue:        pick(venues,        'venue'),
        caterer:      pick(caterers,      'caterer'),
        photographer: pick(photographers, 'photographer'),
        decorator:    pick(decorators,    'decorator'),
        dj:           pick(djs,           'dj'),
      };
    } catch (e) {
      console.log(`[${this.name}] Groq picks error: ${e.message} — using top-scored fallback`);
      return {
        venue:        venues[0]        || null,
        caterer:      caterers[0]      || null,
        photographer: photographers[0] || null,
        decorator:    decorators[0]    || null,
        dj:           djs[0]           || null,
      };
    }
  }

  async generateMasterSummary(brief, picks, costs, budgetSummary) {
    if (!this.groqKey || this.groqKey === 'your_groq_api_key_here')
      return this.fallbackSummary(brief, costs, budgetSummary);

    const prompt = `Write a warm, personal 3-sentence wedding plan summary.
Couple: ${brief.brideName} & ${brief.groomName}, ${brief.city}, ${brief.guestCount} guests, ${brief.weddingDate || 'date TBD'}
Budget: ₹${(brief.totalBudget||0).toLocaleString('en-IN')} | Estimated spend: ₹${costs.total.toLocaleString('en-IN')} (${budgetSummary.pctUsed}% used)
Picks: ${picks.venue?.name||'TBD'} (venue), ${picks.caterer?.name||'TBD'} (catering), ${picks.photographer?.name||'TBD'} (photo)
Sentence 1: congratulate and set the scene. Sentence 2: highlight the picks. Sentence 3: budget health. No bullet points.`;

    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: this.groqModel, messages: [{ role: 'user', content: prompt }], max_tokens: 220, temperature: 0.7,
      }, { headers: { 'Authorization': `Bearer ${this.groqKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
      return res.data.choices[0].message.content.trim();
    } catch { return this.fallbackSummary(brief, costs, budgetSummary); }
  }

  fallbackSummary(brief, costs, budgetSummary) {
    return `Your complete wedding plan for ${brief.brideName} & ${brief.groomName} in ${brief.city} is ready, covering all 5 vendor categories with AI-optimised picks for ${brief.guestCount} guests. Each vendor was selected by balancing the highest available rating with the best cost efficiency for your budget. ${budgetSummary.remaining >= 0 ? `The estimated total of ₹${costs.total.toLocaleString('en-IN')} fits within your budget at ${budgetSummary.pctUsed}% utilisation — you're in excellent shape.` : `The estimated total slightly exceeds budget — visit Budget Tracker for AI saving tips.`}`;
  }

  buildNextSteps(brief, picks) {
    return [
      `Call ${picks.venue?.name || 'your venue'} (${picks.venue?.phone || 'find contact on Google Maps'}) to confirm availability for ${brief.weddingDate || 'your date'} and pay the advance.`,
      `Contact ${picks.caterer?.name || 'your caterer'} (${picks.caterer?.phone || picks.caterer?.contact || 'find on Google Maps'}) to finalise the menu and get a written quote.`,
      `Book ${picks.photographer?.name || 'your photographer'} immediately — good photographers book 6–12 months in advance.`,
      `Visit each Agent page to review all options. If you prefer a different vendor, select it there — costs update automatically.`,
      `Add guests in Guest Manager and send digital invitations at least 4 weeks before the wedding.`,
      `Share the Timeline with all vendors at least 2 weeks before the wedding day.`,
    ];
  }
}

module.exports = new OrchestratorAgent();

