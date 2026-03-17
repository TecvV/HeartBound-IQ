/**
 * HeartBound IQ — Venue Scout Agent v4
 * Data:  Google Maps Places API → Google Custom Search → Mock
 * LLM:   Groq (llama3-70b-8192) → Rule-based fallback
 *
 * The LLM receives REAL venue data from Maps and writes
 * personalised scores + recommendations for each venue.
 */
const axios = require('axios');
const cse   = require('./customSearchAgent');

class VenueScoutAgent {
  constructor() {
    this.name      = 'VenueScoutAgent';
    this.mapsKey   = process.env.GOOGLE_MAPS_API_KEY;
    this.groqKey   = process.env.GROQ_API_KEY;
    this.groqModel = process.env.GROQ_MODEL || 'llama3-70b-8192';
  }

  async scout(brief) {
    console.log(`\n[${this.name}] ── Scouting venues in ${brief.city} ──`);
    try {
      const raw      = await this.fetchVenues(brief);
      const filtered = this.filterVenues(raw, brief);
      const scored   = await this.scoreWithGroq(filtered, brief);
      const ranked   = scored.sort((a, b) => b.aiScore - a.aiScore);
      console.log(`[${this.name}] ✓ Complete — ${ranked.length} venues ranked\n`);
      return { success: true, venues: ranked, agentNote: this.agentNote(ranked, brief) };
    } catch (err) {
      console.error(`[${this.name}] Fatal error:`, err.message);
      return { success: false, error: err.message, venues: [] };
    }
  }

  // ── STEP 1: Fetch real venue data ─────────────────────────────────────────
  async fetchVenues(brief) {
    const { city, guestCount } = brief;

    // Priority 1 — Google Maps Places API
    if (this.mapsKey && this.mapsKey !== 'your_google_maps_api_key_here') {
      try {
        console.log(`[${this.name}] Calling Google Maps for venues in ${city}…`);
        const venues = await this.fetchFromMaps(city);
        if (venues.length >= 2) {
          console.log(`[${this.name}] ✓ Got ${venues.length} real venues from Google Maps`);
          return venues;
        }
        console.log(`[${this.name}] Maps returned ${venues.length} results — trying CSE`);
      } catch (e) {
        console.log(`[${this.name}] Maps error: ${e.response?.data?.error_message || e.message}`);
      }
    } else {
      console.log(`[${this.name}] Maps key not set — skipping`);
    }

    // Priority 2 — Google Custom Search
    if (cse.isEnabled()) {
      try {
        console.log(`[${this.name}] Calling Custom Search for venues in ${city}…`);
        const venues = await cse.searchVenues(city, guestCount);
        if (venues.length >= 2) {
          console.log(`[${this.name}] ✓ Got ${venues.length} venues from Custom Search`);
          return venues;
        }
      } catch (e) {
        console.log(`[${this.name}] CSE error: ${e.message}`);
      }
    }

    // Priority 3 — Mock data
    console.log(`[${this.name}] Using mock data (no live API available)`);
    return this.getMockVenues(city);
  }

  async fetchFromMaps(city) {
    const results = [];
    const queries = [
      `wedding banquet hall ${city}`,
      `marriage hall resort ${city}`,
      `wedding venue ${city}`,
    ];

    for (const query of queries) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json` +
          `?query=${encodeURIComponent(query)}&key=${this.mapsKey}&region=in&language=en`;
        const res = await axios.get(url, { timeout: 10000 });

        if (res.data.status !== 'OK' && res.data.status !== 'ZERO_RESULTS') {
          console.log(`[${this.name}] Maps status: ${res.data.status} — ${res.data.error_message||''}`);
        }

        for (const p of (res.data.results || []).slice(0, 5)) {
          if (!results.find(r => r.name === p.name)) {
            results.push({
              name:          p.name,
              city,
              address:       p.formatted_address || `${city}`,
              rating:        p.rating || 0,
              reviewCount:   p.user_ratings_total || 0,
              googlePlaceId: p.place_id,
              latitude:      p.geometry?.location?.lat,
              longitude:     p.geometry?.location?.lng,
              pricePerHead:  this.estimatePPH(p.price_level),
              capacity:      null,
              amenities:     p.types?.filter(t => !['point_of_interest','establishment','food'].includes(t)).map(t => t.replace(/_/g,' ')) || [],
              venueType:     this.detectVenueType(p.name, p.types),
              distanceFromCenter: null,
              source:        'google_maps',
            });
          }
        }
        // small delay between queries
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.log(`[${this.name}] Query error (${query}): ${e.message}`);
      }
    }
    return this.enrichVenues(results, city);
  }

  estimatePPH(priceLevel) {
    return ({ 1: 500, 2: 1000, 3: 2000, 4: 3500 })[priceLevel] || 1000;
  }

  detectVenueType(name, types) {
    const n = (name || '').toLowerCase();
    if (n.includes('farm') || n.includes('garden') || n.includes('lawn')) return 'farmhouse';
    if (n.includes('hotel') || n.includes('inn') || n.includes('suites')) return 'hotel';
    if (n.includes('resort')) return 'resort';
    if (n.includes('heritage') || n.includes('palace') || n.includes('haveli')) return 'heritage';
    if (types?.includes('lodging')) return 'hotel';
    return 'banquet_hall';
  }

  async fetchPlaceDetails(placeId) {
    if (!this.mapsKey || !placeId) return {};
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number,website,price_level&key=${this.mapsKey}&language=en`;
      const res = await axios.get(url, { timeout: 8000 });
      if (res.data.status !== 'OK') return {};
      const r = res.data.result || {};
      return {
        phone: r.formatted_phone_number || r.international_phone_number || null,
        website: r.website || null,
        priceLevel: r.price_level,
      };
    } catch { return {}; }
  }

  async enrichVenues(venues, city) {
    const out = [];
    for (const v of venues) {
      let phone = v.phone || v.contact || null;
      let website = v.website || null;
      let pricePerHead = v.pricePerHead;
      if (v.googlePlaceId) {
        const details = await this.fetchPlaceDetails(v.googlePlaceId);
        if (!phone && details.phone) phone = details.phone;
        if (!website && details.website) website = details.website;
        if (details.priceLevel && (!pricePerHead || pricePerHead === 1000)) {
          pricePerHead = this.estimatePPH(details.priceLevel);
        }
      }
      if (cse.isEnabled() && (!phone || !pricePerHead || pricePerHead === 1000)) {
        const extra = await cse.lookupDetails(v.name, city);
        if (!phone && extra.phone) phone = extra.phone;
        if (!website && extra.website) website = extra.website;
        if (extra.priceHint) {
          pricePerHead = cse.estimatePriceFromText(extra.priceHint);
        }
      }
      out.push({ ...v, phone, contact: phone || v.contact, website, pricePerHead });
    }
    return out;
  }

  getMockVenues(city) {
    return [
      { name:'The Grand Marigold Palace', city, address:`MG Road, ${city}`, capacity:800, pricePerHead:1200, rating:4.7, reviewCount:312, amenities:['AC','Parking','Catering Kitchen','Bridal Suite','Lawn','DJ Setup'], venueType:'banquet_hall', distanceFromCenter:3.2, source:'mock' },
      { name:'Rosewater Farmhouse & Gardens', city, address:`Kanke Road, ${city}`, capacity:500, pricePerHead:950, rating:4.5, reviewCount:187, amenities:['Outdoor Lawn','Generator','Parking','Catering Kitchen'], venueType:'farmhouse', distanceFromCenter:7.1, source:'mock' },
      { name:'Hotel Pinnacle Banquets', city, address:`Station Road, ${city}`, capacity:600, pricePerHead:1800, rating:4.8, reviewCount:501, amenities:['5-Star Catering','Valet','AC','Bridal Room','AV Setup'], venueType:'hotel', distanceFromCenter:1.5, source:'mock' },
      { name:'Sunrise Heritage Resort', city, address:`Harmu Road, ${city}`, capacity:400, pricePerHead:2200, rating:4.9, reviewCount:98, amenities:['Heritage Architecture','Pool','Lawn','In-House Catering'], venueType:'heritage', distanceFromCenter:5.8, source:'mock' },
      { name:'Tulsi Banquet Hall', city, address:`Lalpur, ${city}`, capacity:300, pricePerHead:600, rating:4.1, reviewCount:234, amenities:['AC','Parking','Basic Kitchen'], venueType:'banquet_hall', distanceFromCenter:2.9, source:'mock' },
      { name:'Emerald Valley Resort', city, address:`Ormanjhi, ${city}`, capacity:700, pricePerHead:1600, rating:4.6, reviewCount:145, amenities:['Outdoor + Indoor','Swimming Pool','Parking','Catering'], venueType:'resort', distanceFromCenter:12.4, source:'mock' },
    ];
  }

  filterVenues(venues, brief) {
    const { guestCount, budgetTotal } = brief;
    const maxPPH = budgetTotal ? (budgetTotal / guestCount) * 1.25 : Infinity;
    return venues.filter(v =>
      (!v.capacity || v.capacity >= guestCount * 0.8) &&
      (!v.pricePerHead || v.pricePerHead <= maxPPH)
    );
  }

  // ── STEP 2: Groq processes every venue and writes scores + recommendations ─
  async scoreWithGroq(venues, brief) {
    if (!this.groqKey || this.groqKey === 'your_groq_api_key_here') {
      console.log(`[${this.name}] No Groq key — using rule-based scoring`);
      return venues.map(v => ({
        ...v,
        totalEstimatedCost: (v.pricePerHead || 1000) * brief.guestCount,
        aiScore:            this.ruleScore(v, brief),
        aiRecommendation:   this.ruleNote(v, brief),
      }));
    }

    console.log(`[${this.name}] Sending ${venues.length} venues to Groq for scoring…`);

    // Send ALL venues in ONE Groq call for efficiency
    const venueList = venues.map((v, i) =>
      `${i+1}. ${v.name} | ${v.address||v.city} | ₹${v.pricePerHead||'?'}/head | Rating: ${v.rating}/5 (${v.reviewCount} reviews) | Type: ${v.venueType} | Amenities: ${v.amenities?.join(', ')||'unknown'}`
    ).join('\n');

    const prompt = `You are HeartBound IQ's AI Venue Scout. Score these ${venues.length} real wedding venues for this couple.

WEDDING BRIEF:
- Couple's city: ${brief.city}
- Guest count: ${brief.guestCount}
- Total budget: ₹${(brief.budgetTotal||0).toLocaleString('en-IN')}
- Budget per head limit: ₹${brief.budgetTotal ? Math.round(brief.budgetTotal/brief.guestCount) : 'open'}
- Wedding date: ${brief.weddingDate || 'Flexible'}
- Preferences: ${brief.preferences || 'None specified'}

VENUES TO SCORE (real data from Google Maps):
${venueList}

Score each venue from 0-100 based on: budget fit, rating, suitability for Indian wedding, amenities, location.
Write ONE honest sentence recommendation for each.

Respond ONLY as a JSON array (same order as above):
[
  {"score": <0-100>, "recommendation": "<1-2 sentences for the couple>"},
  ...
]`;

    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model:       this.groqModel,
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  1000,
        temperature: 0.3,
      }, {
        headers: { 'Authorization': `Bearer ${this.groqKey}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const text    = res.data.choices[0].message.content;
      const parsed  = JSON.parse(text.match(/\[[\s\S]*\]/)[0]);
      console.log(`[${this.name}] ✓ Groq scored all ${parsed.length} venues`);

      return venues.map((v, i) => {
        const result = parsed[i] || {};
        const totalCost = (v.pricePerHead || 1000) * brief.guestCount;
        return {
          ...v,
          totalEstimatedCost: totalCost,
          aiScore:            result.score       || this.ruleScore(v, brief),
          aiRecommendation:   result.recommendation || this.ruleNote(v, brief),
        };
      });

    } catch (e) {
      console.log(`[${this.name}] Groq error: ${e.message} — using rule-based fallback`);
      return venues.map(v => ({
        ...v,
        totalEstimatedCost: (v.pricePerHead || 1000) * brief.guestCount,
        aiScore:            this.ruleScore(v, brief),
        aiRecommendation:   this.ruleNote(v, brief),
      }));
    }
  }

  ruleScore(v, brief) {
    let s = 50;
    if (v.rating >= 4.5) s += 20; else if (v.rating >= 4.0) s += 10;
    if (brief.budgetTotal) {
      const r = (v.pricePerHead||1000) * brief.guestCount / brief.budgetTotal;
      if (r <= 0.5) s += 20; else if (r <= 0.7) s += 10; else if (r > 1.0) s -= 20;
    }
    s += Math.min((v.amenities?.length||0) * 2, 10);
    if (v.distanceFromCenter && v.distanceFromCenter <= 5) s += 5;
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  ruleNote(v, brief) {
    const total = (v.pricePerHead||1000) * brief.guestCount;
    const pct   = brief.budgetTotal ? Math.round(total/brief.budgetTotal*100) : null;
    return `${v.name} costs ₹${total.toLocaleString('en-IN')} total${pct ? ` (${pct}% of budget)` : ''}.${v.rating >= 4.5 ? ' Highly rated by couples.' : ' Decent option for the price.'}`;
  }

  agentNote(venues, brief) {
    if (!venues.length) return 'No venues found for your criteria.';
    const top = venues[0];
    const src = { google_maps: 'Google Maps', google_search: 'web search', mock: 'demo data' }[top.source] || 'demo data';
    const llm = this.groqKey && this.groqKey !== 'your_groq_api_key_here' ? 'Groq AI' : 'rule-based scoring';
    return `Found ${venues.length} venues in ${brief.city} via ${src}, scored by ${llm}. Top pick: ${top.name} (${top.aiScore}/100) — est. ₹${top.totalEstimatedCost?.toLocaleString('en-IN')}.`;
  }
}

module.exports = new VenueScoutAgent();

