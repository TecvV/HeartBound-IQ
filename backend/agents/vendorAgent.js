/**
 * HeartBound IQ — Vendor Agent v4
 * Data:  Google Maps → Custom Search → Mock
 * LLM:   Groq batch scoring (all vendors in one call)
 */
const axios = require('axios');
const cse   = require('./customSearchAgent');

const MOCK_VENDORS = {
  Photographer:    [
    { name:'LensLove Studios',         priceRange:'₹40,000–80,000',   rating:4.8, reviewCount:312, experience:'8 yrs',  style:'Candid + Traditional', amenities:['Pre-wedding shoot','Same-day edit reel','Drone shots','2 photographers'], minPrice:40000, maxPrice:80000 },
    { name:'Frames & Feels Photography',priceRange:'₹25,000–50,000',  rating:4.6, reviewCount:198, experience:'5 yrs',  style:'Candid',               amenities:['Candid + posed','1 videographer','Highlight reel'], minPrice:25000, maxPrice:50000 },
    { name:'Royal Clicks',             priceRange:'₹60,000–1,20,000', rating:4.9, reviewCount:451, experience:'12 yrs', style:'Cinematic + Candid',   amenities:['Cinematic film','Drone','Same-day edit','3 shooters'], minPrice:60000, maxPrice:120000 },
    { name:'Moment Weavers',           priceRange:'₹18,000–35,000',   rating:4.3, reviewCount:134, experience:'3 yrs',  style:'Traditional',          amenities:['Full day coverage','Photo album'], minPrice:18000, maxPrice:35000 },
  ],
  Decorator:       [
    { name:'Blooms & Beyond Decor',    priceRange:'₹50,000–1,50,000', rating:4.7, reviewCount:278, experience:'9 yrs',  style:'Floral + Pastel',   amenities:['Stage decor','Entry gate','Floral mandap','Lighting'], minPrice:50000, maxPrice:150000 },
    { name:'Grandeur Events & Decor',  priceRange:'₹1,00,000–3,00,000',rating:4.9,reviewCount:389, experience:'14 yrs', style:'Luxury / Royal',    amenities:['Full venue decor','LED walls','Floral ceiling'], minPrice:100000, maxPrice:300000 },
    { name:'Desi Dulhan Decor',        priceRange:'₹30,000–70,000',   rating:4.5, reviewCount:167, experience:'6 yrs',  style:'Traditional Indian',amenities:['Mandap setup','Stage backdrop','Marigold decor'], minPrice:30000, maxPrice:70000 },
    { name:'Fairy Lights Studio',      priceRange:'₹20,000–45,000',   rating:4.2, reviewCount:112, experience:'4 yrs',  style:'Boho + Minimal',    amenities:['Fairy light backdrop','Minimal florals'], minPrice:20000, maxPrice:45000 },
  ],
  'DJ / Music':    [
    { name:'DJ Beats India',           priceRange:'₹15,000–40,000',   rating:4.6, reviewCount:224, experience:'7 yrs',  style:'Bollywood + Punjabi', amenities:['Full PA system','LED lights','Fog machine','MC hosting'], minPrice:15000, maxPrice:40000 },
    { name:'SoundWave Entertainment',  priceRange:'₹25,000–60,000',   rating:4.8, reviewCount:341, experience:'10 yrs', style:'Multi-genre',         amenities:['Live band option','Top PA','Lighting rig','Backup DJ'], minPrice:25000, maxPrice:60000 },
    { name:'Dhol Baaje Music Co.',     priceRange:'₹10,000–25,000',   rating:4.4, reviewCount:189, experience:'5 yrs',  style:'Dhol + Folk',         amenities:['Live dhol players','Baraat entry','Shehnaai'], minPrice:10000, maxPrice:25000 },
    { name:'Party Anthem DJs',         priceRange:'₹8,000–18,000',    rating:4.1, reviewCount:98,  experience:'3 yrs',  style:'Bollywood',           amenities:['Basic PA system','2-hr set'], minPrice:8000, maxPrice:18000 },
  ],
  'Makeup Artist': [
    { name:'Glamour by Priya',         priceRange:'₹15,000–35,000',   rating:4.8, reviewCount:412, experience:'8 yrs',  style:'HD + Airbrush',    amenities:['Bridal HD makeup','Hair styling','Touch-up kit','Trial session'], minPrice:15000, maxPrice:35000 },
    { name:'Shehnai Bridal Studio',    priceRange:'₹8,000–20,000',    rating:4.5, reviewCount:267, experience:'5 yrs',  style:'Natural + Dewy',   amenities:['Bridal + bridesmaids','Hair + makeup'], minPrice:8000, maxPrice:20000 },
    { name:'The Bridal Canvas',        priceRange:'₹25,000–55,000',   rating:4.9, reviewCount:534, experience:'12 yrs', style:'Luxury Bridal',    amenities:['Airbrush','Hair extensions','Full-day artist'], minPrice:25000, maxPrice:55000 },
    { name:'Makeup by Neha',           priceRange:'₹5,000–12,000',    rating:4.2, reviewCount:143, experience:'3 yrs',  style:'Traditional',      amenities:['Bridal makeup','Basic hair styling'], minPrice:5000, maxPrice:12000 },
  ],
  'Mehendi Artist':[
    { name:'Heena Creations',          priceRange:'₹8,000–20,000',    rating:4.7, reviewCount:298, experience:'9 yrs',  style:'Rajasthani + Arabic',   amenities:['Bridal full hands & feet','Bridesmaids package'], minPrice:8000, maxPrice:20000 },
    { name:'ArtHenna Studio',          priceRange:'₹5,000–12,000',    rating:4.5, reviewCount:187, experience:'6 yrs',  style:'Arabic',                amenities:['Bridal mehndi','2 artists for big events'], minPrice:5000, maxPrice:12000 },
    { name:'Bridal Mehndi by Sunita',  priceRange:'₹12,000–30,000',   rating:4.9, reviewCount:421, experience:'15 yrs', style:'Intricate Rajasthani',  amenities:['Full bridal + family','Customised portrait mehndi'], minPrice:12000, maxPrice:30000 },
    { name:'Quick Henna Guys',         priceRange:'₹3,000–8,000',     rating:4.0, reviewCount:89,  experience:'2 yrs',  style:'Arabic Minimal',        amenities:['Basic bridal mehndi'], minPrice:3000, maxPrice:8000 },
  ],
};

const MAPS_QUERIES = {
  Photographer:    (c) => `wedding photographer studio ${c}`,
  Decorator:       (c) => `wedding decorator event management ${c}`,
  'DJ / Music':    (c) => `DJ music wedding events ${c}`,
  'Makeup Artist': (c) => `bridal makeup artist beauty salon ${c}`,
  'Mehendi Artist':(c) => `mehendi henna artist bridal ${c}`,
};

class VendorAgent {
  constructor() {
    this.name      = 'VendorAgent';
    this.mapsKey   = process.env.GOOGLE_MAPS_API_KEY;
    this.groqKey   = process.env.GROQ_API_KEY;
    this.groqModel = process.env.GROQ_MODEL || 'llama3-70b-8192';
    this.categories = Object.keys(MOCK_VENDORS);
  }

  async search(brief) {
    const { city, category, maxBudget, guestCount } = brief;
    console.log(`[${this.name}] Searching ${category} in ${city}…`);
    try {
      const raw      = await this.fetchVendors(category, city);
      const filtered = this.filter(raw, maxBudget);
      const scored   = await this.scoreWithGroq(filtered, brief);
      const ranked   = scored.sort((a, b) => b.aiScore - a.aiScore);
      return { success: true, vendors: ranked, agentNote: this.agentNote(ranked, brief) };
    } catch (err) {
      return { success: false, error: err.message, vendors: [] };
    }
  }

  async fetchVendors(category, city) {
    // Google Maps
    if (this.mapsKey && this.mapsKey !== 'your_google_maps_api_key_here' && MAPS_QUERIES[category]) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(MAPS_QUERIES[category](city))}&key=${this.mapsKey}&region=in&language=en`;
        const res = await axios.get(url, { timeout: 10000 });
        const places = (res.data.results || []).slice(0, 6);
        if (places.length >= 2) {
          console.log(`[${this.name}] ✓ ${places.length} ${category}s from Google Maps`);
          const mapped = places.map(p => ({
            name:        p.name,
            city,
            category,
            source:      'google_maps',
            googlePlaceId: p.place_id,
            address:     p.formatted_address || city,
            rating:      p.rating || 0,
            reviewCount: p.user_ratings_total || 0,
            priceRange:  'Contact for pricing',
            minPrice:    0, maxPrice: 200000,
            experience:  'See Google Maps profile',
            style:       category,
            amenities:   [],
          }));
          return await this.enrichVendors(mapped, city);
        }
      } catch (e) {
        console.log(`[${this.name}] Maps error: ${e.message}`);
      }
    }

    // Custom Search
    if (cse.isEnabled()) {
      try {
        const results = await cse.searchVendors(category, city);
        if (results.length >= 2) {
          console.log(`[${this.name}] ✓ ${results.length} ${category}s from CSE`);
          return results.map(r => ({ ...r, minPrice: 0, maxPrice: 200000, experience: 'N/A', style: category, amenities: [] }));
        }
      } catch (e) {
        console.log(`[${this.name}] CSE error: ${e.message}`);
      }
    }

    console.log(`[${this.name}] Using mock data for ${category}`);
    return (MOCK_VENDORS[category] || []).map(v => ({ ...v, city, category, source: 'mock' }));
  }

  filter(vendors, maxBudget) {
    if (!maxBudget) return vendors;
    return vendors.filter(v => !v.minPrice || v.minPrice <= parseInt(maxBudget) * 1.3);
  }

  async fetchPlaceDetails(placeId) {
    if (!this.mapsKey || !placeId) return {};
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number,website&key=${this.mapsKey}&language=en`;
      const res = await axios.get(url, { timeout: 8000 });
      if (res.data.status !== 'OK') return {};
      const r = res.data.result || {};
      return {
        phone: r.formatted_phone_number || r.international_phone_number || null,
        website: r.website || null,
      };
    } catch { return {}; }
  }

  async enrichVendors(vendors, city) {
    const out = [];
    for (const v of vendors) {
      let phone = v.phone || v.contact || null;
      let website = v.website || null;
      let priceRange = v.priceRange;
      let minPrice = v.minPrice || 0;
      let maxPrice = v.maxPrice || 0;
      if (v.googlePlaceId) {
        const details = await this.fetchPlaceDetails(v.googlePlaceId);
        if (!phone && details.phone) phone = details.phone;
        if (!website && details.website) website = details.website;
      }
      if (cse.isEnabled() && (!phone || !priceRange || priceRange === 'Contact for pricing')) {
        const extra = await cse.lookupDetails(v.name, city);
        if (!phone && extra.phone) phone = extra.phone;
        if (!website && extra.website) website = extra.website;
        if (extra.priceHint) {
          priceRange = extra.priceHint;
          const rng = cse.parsePriceRange(extra.priceHint);
          minPrice = rng.minPrice || minPrice;
          maxPrice = rng.maxPrice || maxPrice;
        }
      }
      out.push({ ...v, phone, contact: phone || v.contact, website, priceRange, minPrice, maxPrice });
    }
    return out;
  }

  async scoreWithGroq(vendors, brief) {
    if (!this.groqKey || this.groqKey === 'your_groq_api_key_here') {
      return vendors.map(v => ({ ...v, aiScore: this.ruleScore(v, brief), aiNote: this.ruleNote(v) }));
    }

    const vendorList = vendors.map((v, i) =>
      `${i+1}. ${v.name} | Price: ${v.priceRange||'unknown'} | Rating: ${v.rating}/5 (${v.reviewCount} reviews) | Style: ${v.style} | Experience: ${v.experience}`
    ).join('\n');

    const prompt = `You are HeartBound IQ's Vendor Agent. Score these ${vendors.length} real ${brief.category} vendors for this wedding.

WEDDING: ${brief.city}, ${brief.guestCount||300} guests, max ${brief.category} budget: ₹${brief.maxBudget||'open'}

VENDORS (real data from Google Maps / web):
${vendorList}

Score 0-100 based on: value for money, rating, experience, suitability for Indian wedding.
Write ONE honest sentence per vendor.

Respond ONLY as JSON array (same order):
[{"score":<0-100>,"note":"<1 sentence>"},...]`;

    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: this.groqModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800, temperature: 0.3,
      }, {
        headers: { 'Authorization': `Bearer ${this.groqKey}`, 'Content-Type': 'application/json' },
        timeout: 25000,
      });

      const parsed = JSON.parse(res.data.choices[0].message.content.match(/\[[\s\S]*\]/)[0]);
      console.log(`[${this.name}] ✓ Groq scored ${parsed.length} ${brief.category}s`);

      return vendors.map((v, i) => ({
        ...v,
        aiScore: parsed[i]?.score || this.ruleScore(v, brief),
        aiNote:  parsed[i]?.note  || this.ruleNote(v),
      }));
    } catch (e) {
      console.log(`[${this.name}] Groq error: ${e.message}`);
      return vendors.map(v => ({ ...v, aiScore: this.ruleScore(v, brief), aiNote: this.ruleNote(v) }));
    }
  }

  ruleScore(v, brief) {
    let s = 50;
    if (v.rating >= 4.8) s += 22; else if (v.rating >= 4.5) s += 14; else if (v.rating >= 4.2) s += 7;
    if (brief.maxBudget && v.minPrice) {
      const r = v.minPrice / parseInt(brief.maxBudget);
      if (r <= 0.6) s += 16; else if (r <= 0.9) s += 8; else if (r > 1.2) s -= 12;
    }
    s += Math.min((v.amenities?.length || 0) * 2, 10);
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  ruleNote(v) {
    return `${v.name} offers ${v.style || v.category} at ${v.priceRange || 'competitive rates'} with ${v.experience || 'professional'} experience.${v.rating >= 4.7 ? ' Highly rated — strongly recommended.' : ' Good option for the budget.'}`;
  }

  agentNote(ranked, brief) {
    if (!ranked.length) return `No ${brief.category} vendors found.`;
    const top = ranked[0];
    const src = { google_maps: 'Google Maps', google_search: 'web search', mock: 'demo data' }[top.source] || 'demo data';
    return `Found ${ranked.length} ${brief.category}s in ${brief.city} via ${src}, scored by Groq AI. Top pick: ${top.name} (${top.aiScore}/100).`;
  }
}

module.exports = new VendorAgent();

