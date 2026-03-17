/**
 * HeartBound IQ — Catering Agent v4
 * Data:  Google Maps → Custom Search → Mock
 * LLM:   Groq batch scoring + menu generation
 */
const axios = require('axios');
const cse   = require('./customSearchAgent');

const MOCK_CATERERS = [
  { name:'Shree Annapurna Caterers',   cuisines:['North Indian','Jain / Satvik'],          pricePerHead:850,  rating:4.6, reviewCount:284, minGuests:100, maxGuests:2000, description:'Specialists in traditional Rajasthani and UP-style wedding feasts.', packages:['Basic (₹650/head)','Standard (₹850/head)','Premium (₹1200/head)'], amenities:['Live counters','Dedicated serving staff','Utensils included','Setup & cleanup'], contact:'+91 98765 11001', source:'mock' },
  { name:'Spice Garden Catering Co.',  cuisines:['South Indian','Multi-cuisine'],           pricePerHead:950,  rating:4.8, reviewCount:412, minGuests:200, maxGuests:3000, description:'Award-winning caterers offering South Indian banana-leaf spreads and Continental.', packages:['Silver (₹750/head)','Gold (₹950/head)','Platinum (₹1500/head)'], amenities:['Banana leaf service','Live dosa counter','Dessert station'], contact:'+91 98765 22002', source:'mock' },
  { name:'Bengalee Bhojon House',      cuisines:['Bengali','Multi-cuisine'],                pricePerHead:900,  rating:4.5, reviewCount:178, minGuests:150, maxGuests:1500, description:'Authentic Bengali wedding catering with fish curries and mishti doi.', packages:['Traditional (₹700/head)','Grand (₹900/head)','Royal (₹1400/head)'], amenities:['Mishti counter','Fish & meat specialties','Paan station'], contact:'+91 98765 33003', source:'mock' },
  { name:'Pure Sattvik Catering',      cuisines:['Jain / Satvik','North Indian'],           pricePerHead:780,  rating:4.7, reviewCount:203, minGuests:100, maxGuests:1000, description:'Purely Jain certified cuisine. No onion, no garlic guarantee.', packages:['Basic (₹580/head)','Standard (₹780/head)','Premium (₹1100/head)'], amenities:['Certified Jain kitchen','Fasting menu available','Eco-friendly utensils'], contact:'+91 98765 44004', source:'mock' },
  { name:'Grand Feast Multi-Cuisine',  cuisines:['Multi-cuisine','Continental / Chinese'],  pricePerHead:1400, rating:4.9, reviewCount:567, minGuests:300, maxGuests:5000, description:'Premium multi-cuisine caterers with 8 live counters for large weddings.', packages:['Wedding (₹1400/head)','Elite (₹2200/head)'], amenities:['8 live counters','International chefs','Custom menu','Bar setup support'], contact:'+91 98765 55005', source:'mock' },
  { name:'Desi Tadka Wedding Caterers',cuisines:['North Indian','Multi-cuisine'],           pricePerHead:650,  rating:4.3, reviewCount:341, minGuests:100, maxGuests:2500, description:'Budget-friendly caterers with authentic Punjabi flavors.', packages:['Economy (₹450/head)','Standard (₹650/head)','Deluxe (₹900/head)'], amenities:['Tandoor counter','Unlimited servings','Basic staff'], contact:'+91 98765 66006', source:'mock' },
];

class CateringAgent {
  constructor() {
    this.name      = 'CateringAgent';
    this.mapsKey   = process.env.GOOGLE_MAPS_API_KEY;
    this.groqKey   = process.env.GROQ_API_KEY;
    this.groqModel = process.env.GROQ_MODEL || 'llama3-70b-8192';
  }

  async search(brief) {
    console.log(`[${this.name}] Searching caterers in ${brief.city}…`);
    try {
      const raw      = await this.fetchCaterers(brief);
      const filtered = this.filter(raw, brief);
      const scored   = await this.scoreWithGroq(filtered, brief);
      const ranked   = scored.sort((a, b) => b.aiScore - a.aiScore);
      return { success: true, caterers: ranked, agentNote: this.agentNote(ranked, brief) };
    } catch (err) {
      return { success: false, error: err.message, caterers: [] };
    }
  }

  async fetchCaterers(brief) {
    const { city, cuisines } = brief;
    const cuisineHint = cuisines?.length ? cuisines[0] : '';

    // Google Maps
    if (this.mapsKey && this.mapsKey !== 'your_google_maps_api_key_here') {
      try {
        const q   = `${cuisineHint} wedding catering service ${city}`.trim();
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${this.mapsKey}&region=in&language=en`;
        const res = await axios.get(url, { timeout: 10000 });
        const places = (res.data.results || []).slice(0, 8);
        if (places.length >= 2) {
          console.log(`[${this.name}] ✓ ${places.length} caterers from Google Maps`);
          const mapped = places.map(p => ({
            name:        p.name,
            city,
            source:      'google_maps',
            googlePlaceId: p.place_id,
            cuisines:    cuisines?.length ? cuisines : ['Multi-cuisine'],
            pricePerHead:850 + Math.floor(Math.random() * 600),
            rating:      p.rating || 0,
            reviewCount: p.user_ratings_total || 0,
            minGuests: 100, maxGuests: 2000,
            description: `${p.name} is a catering service in ${city}.`,
            packages: [], amenities: [],
            contact: 'Search on Google Maps',
          }));
          return await this.enrichCaterers(mapped, city);
        }
      } catch (e) {
        console.log(`[${this.name}] Maps error: ${e.message}`);
      }
    }

    // Custom Search
    if (cse.isEnabled()) {
      try {
        const results = await cse.searchVendors('Catering', city);
        if (results.length >= 2) {
          console.log(`[${this.name}] ✓ ${results.length} caterers from CSE`);
          return results.map(r => ({
            ...r, cuisines: cuisines?.length ? cuisines : ['Multi-cuisine'],
            pricePerHead: 900, minGuests: 100, maxGuests: 2000, packages: [], source: 'google_search',
          }));
        }
      } catch (e) {
        console.log(`[${this.name}] CSE error: ${e.message}`);
      }
    }

    console.log(`[${this.name}] Using mock caterer data`);
    return MOCK_CATERERS;
  }

  filter(caterers, brief) {
    const { guestCount, budgetPerHead, cuisines } = brief;
    return caterers.filter(c => {
      const capOk  = (!c.minGuests || guestCount >= c.minGuests * 0.8) && (!c.maxGuests || guestCount <= c.maxGuests);
      const budOk  = !budgetPerHead || c.pricePerHead <= parseInt(budgetPerHead) * 1.3;
      const cuiOk  = !cuisines?.length || cuisines.some(cu => c.cuisines?.includes(cu));
      return capOk && budOk && cuiOk;
    });
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

  async enrichCaterers(caterers, city) {
    const out = [];
    for (const c of caterers) {
      let phone = c.phone || c.contact || null;
      let website = c.website || null;
      let pricePerHead = c.pricePerHead;
      if (c.googlePlaceId) {
        const details = await this.fetchPlaceDetails(c.googlePlaceId);
        if (!phone && details.phone) phone = details.phone;
        if (!website && details.website) website = details.website;
        if (details.priceLevel && (!pricePerHead || pricePerHead === 900)) {
          pricePerHead = { 1: 500, 2: 900, 3: 1400, 4: 2000 }[details.priceLevel] || pricePerHead;
        }
      }
      if (cse.isEnabled() && (!phone || !pricePerHead || pricePerHead === 900)) {
        const extra = await cse.lookupDetails(c.name, city);
        if (!phone && extra.phone) phone = extra.phone;
        if (!website && extra.website) website = extra.website;
        if (extra.priceHint) {
          pricePerHead = cse.estimatePriceFromText(extra.priceHint);
        }
      }
      out.push({ ...c, phone, contact: phone || c.contact, website, pricePerHead });
    }
    return out;
  }

  async scoreWithGroq(caterers, brief) {
    if (!this.groqKey || this.groqKey === 'your_groq_api_key_here') {
      return caterers.map(c => ({
        ...c,
        totalEstimatedCost: (c.pricePerHead || 900) * brief.guestCount,
        aiScore: this.ruleScore(c, brief),
        aiNote:  this.ruleNote(c, brief),
      }));
    }

    const list = caterers.map((c, i) =>
      `${i+1}. ${c.name} | ₹${c.pricePerHead}/head | Cuisines: ${c.cuisines?.join(', ')||'?'} | Rating: ${c.rating}/5 (${c.reviewCount} reviews) | Min guests: ${c.minGuests||100}`
    ).join('\n');

    const prompt = `You are HeartBound IQ's Catering Agent. Score these ${caterers.length} caterers for this Indian wedding.

WEDDING: ${brief.city}, ${brief.guestCount} guests, budget/head: ₹${brief.budgetPerHead||'open'}, preferred cuisines: ${brief.cuisines?.join(', ')||'any'}

CATERERS:
${list}

Score 0-100: higher for cuisine match, budget fit, capacity, rating.
One honest sentence per caterer.

JSON array only:
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
      console.log(`[${this.name}] ✓ Groq scored ${parsed.length} caterers`);
      return caterers.map((c, i) => ({
        ...c,
        totalEstimatedCost: (c.pricePerHead || 900) * brief.guestCount,
        aiScore: parsed[i]?.score || this.ruleScore(c, brief),
        aiNote:  parsed[i]?.note  || this.ruleNote(c, brief),
      }));
    } catch (e) {
      console.log(`[${this.name}] Groq error: ${e.message}`);
      return caterers.map(c => ({
        ...c,
        totalEstimatedCost: (c.pricePerHead || 900) * brief.guestCount,
        aiScore: this.ruleScore(c, brief),
        aiNote:  this.ruleNote(c, brief),
      }));
    }
  }

  ruleScore(c, brief) {
    let s = 50;
    if (c.rating >= 4.7) s += 20; else if (c.rating >= 4.4) s += 12; else if (c.rating >= 4.0) s += 6;
    if (brief.budgetPerHead) {
      const r = c.pricePerHead / parseInt(brief.budgetPerHead);
      if (r <= 0.7) s += 18; else if (r <= 0.9) s += 10; else if (r > 1.2) s -= 15;
    }
    s += Math.min((c.amenities?.length || 0) * 2, 12);
    if (brief.cuisines?.some(cu => c.cuisines?.includes(cu))) s += 8;
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  ruleNote(c, brief) {
    const total = (c.pricePerHead || 900) * brief.guestCount;
    return `${c.name} costs ₹${total.toLocaleString('en-IN')} total at ₹${c.pricePerHead}/head.${c.rating >= 4.5 ? ' Highly rated by couples.' : ' Good value option.'}`;
  }

  agentNote(ranked, brief) {
    if (!ranked.length) return 'No caterers found for your criteria.';
    const top = ranked[0];
    const src = { google_maps:'Google Maps', google_search:'web search', mock:'demo data' }[top.source] || 'demo data';
    return `Found ${ranked.length} caterers in ${brief.city} via ${src}, scored by Groq AI. Top pick: ${top.name} (${top.aiScore}/100) at ₹${top.pricePerHead}/head.`;
  }

  async generateMenu(cuisine, guestCount, preferences) {
    const prompt = `Generate a complete Indian wedding menu for ${cuisine} cuisine, ${guestCount} guests.
Preferences: ${preferences || 'None'}
Respond ONLY as JSON:
{"starters":["..."],"mainCourse":["..."],"breads":["..."],"rice":["..."],"desserts":["..."],"drinks":["..."],"liveCounters":["..."]}`;

    try {
      if (this.groqKey && this.groqKey !== 'your_groq_api_key_here') {
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: this.groqModel, messages: [{ role:'user', content:prompt }], max_tokens:600, temperature:0.5,
        }, { headers:{ 'Authorization':`Bearer ${this.groqKey}`, 'Content-Type':'application/json' }, timeout:20000 });
        return JSON.parse(res.data.choices[0].message.content.match(/\{[\s\S]*\}/)[0]);
      }
    } catch (e) {
      console.log(`[${this.name}] Menu gen error: ${e.message}`);
    }
    return this.fallbackMenu(cuisine);
  }

  fallbackMenu(cuisine) {
    const menus = {
      'North Indian':         { starters:['Paneer Tikka','Dahi Ke Kebab','Aloo Tikki Chaat','Veg Seekh Kebab'], mainCourse:['Dal Makhani','Paneer Butter Masala','Shahi Veg Kofta','Dum Aloo','Mixed Veg Kadhai'], breads:['Butter Naan','Missi Roti','Laccha Paratha'], rice:['Veg Biryani','Jeera Rice'], desserts:['Gulab Jamun','Gajar Halwa','Kheer','Rasgulla'], drinks:['Masala Chaas','Rose Sharbat','Sweet Lassi'], liveCounters:['Chaat Counter','Pani Puri Station','Tandoor Counter'] },
      'South Indian':         { starters:['Medu Vada','Masala Dosa Bites','Rava Idli','Paniyaram'], mainCourse:['Sambar','Rasam','Avial','Kootu','Chettinad Curry'], breads:['Appam','Kerala Porotta','Set Dosa'], rice:['Lemon Rice','Curd Rice','Tamarind Rice'], desserts:['Payasam','Mysore Pak','Kesari','Coconut Ladoo'], drinks:['Filter Coffee','Nannari Sharbat','Butter Milk'], liveCounters:['Dosa Counter','Idiyappam Station','Banana Leaf Service'] },
      'Bengali':              { starters:['Fish Cutlet','Aloo Kabli','Ghugni','Dimer Devil'], mainCourse:['Kosha Mangsho','Machher Jhol','Chingri Malaikari','Shorshe Ilish','Dhokar Dalna'], breads:['Luchi','Radhaballabhi','Puri'], rice:['Gobindobhog Rice','Basanti Pulao'], desserts:['Mishti Doi','Sandesh','Rasgolla','Chanar Payesh'], drinks:['Aam Panna','Thandai','Lassi'], liveCounters:['Paan Counter','Mishti Stall','Fish Fry Station'] },
      'Jain / Satvik':        { starters:['Aloo Tikki (no onion)','Paneer Satvik Tikka','Farali Pattice','Sabudana Vada'], mainCourse:['Satvik Dal','Lauki Kofta','Arbi Masala','Kaddu Sabzi','Paneer Bhurji'], breads:['Plain Roti','Jowar Roti','Puri'], rice:['Plain Steamed Rice','Coconut Rice'], desserts:['Mohanthal','Lapsi','Sheera','Dry Fruit Halwa'], drinks:['Nimbu Pani','Coconut Water','Jaljeera'], liveCounters:['Fasting Food Counter','Dry Fruit Stall','Juice Counter'] },
      'Multi-cuisine':        { starters:['Paneer Tikka','Spring Rolls','Veg Seekh Kebab','Bruschetta'], mainCourse:['Dal Makhani','Pasta Arrabiata','Paneer Butter Masala','Veg Manchurian','Thai Green Curry'], breads:['Butter Naan','Garlic Bread','Laccha Paratha'], rice:['Veg Biryani','Fried Rice'], desserts:['Gulab Jamun','Brownie with Ice Cream','Kheer','Fruit Custard'], drinks:['Fresh Juice','Mocktails','Masala Chaas'], liveCounters:['Chaat Counter','Wok Counter','Pizza/Pasta Station'] },
      'Continental / Chinese':{ starters:['Veg Spring Rolls','Stuffed Mushrooms','Crispy Corn','Veg Dim Sum'], mainCourse:['Pasta in Cream Sauce','Veg Hakka Noodles','Thai Basil Stir Fry','Veg Au Gratin','Kung Pao Vegetables'], breads:['Garlic Bread','Dinner Rolls','Focaccia'], rice:['Veg Fried Rice','Jasmine Steamed Rice'], desserts:['Tiramisu','Chocolate Mousse','Crème Brûlée','Mango Sorbet'], drinks:['Lemonade','Iced Tea','Virgin Mojito'], liveCounters:['Live Pasta Counter','Sushi Station','Wok Counter'] },
    };
    return menus[cuisine] || menus['Multi-cuisine'];
  }
}

module.exports = new CateringAgent();

