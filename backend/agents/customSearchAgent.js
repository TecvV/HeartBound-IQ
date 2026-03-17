/**
 * HeartBound IQ — Google Custom Search Agent
 * Fallback when Google Maps returns sparse results (Tier 2/3 cities)
 */
const axios = require('axios');

const CATEGORY_QUERIES = {
  Venue:           (city) => `best wedding venue banquet hall ${city} price booking`,
  Catering:        (city) => `wedding catering service ${city} price per head menu`,
  Photographer:    (city) => `wedding photographer ${city} price packages candid`,
  Decorator:       (city) => `wedding decorator florist ${city} price mandap decor`,
  'DJ / Music':    (city) => `wedding DJ music entertainment ${city} price booking`,
  'Makeup Artist': (city) => `bridal makeup artist ${city} price HD airbrush`,
  'Mehendi Artist':(city) => `wedding mehendi henna artist ${city} price bridal`,
};

class CustomSearchAgent {
  constructor() {
    this.apiKey  = process.env.GOOGLE_CSE_KEY;
    this.cseId   = process.env.GOOGLE_CSE_ID;
    this.detailCache = new Map();
    this.enabled = !!(
      this.apiKey && this.cseId &&
      this.apiKey !== 'your_same_api_key_here' &&
      this.cseId  !== '017xxxxxxxxxxxxxx:xxxxxxxxx' &&
      this.cseId  !== 'your_search_engine_id_here'
    );
    if (this.enabled) console.log('[CustomSearch] ✓ Enabled');
    else              console.log('[CustomSearch] ✗ Not configured — will use mock data');
  }

  isEnabled() { return this.enabled; }

  extractPhone(text) {
    if (!text) return null;
    const m = text.match(/(?:\+91[\s-]*)?[6-9]\d{9}/);
    return m ? m[0].replace(/\s+/g, ' ').trim() : null;
  }

  extractPrice(text) {
    if (!text) return null;
    const m = text.match(/(?:\u20B9|Rs\.?|INR)\s*[\d,]+(?:\s*(?:-|\u2013)\s*(?:\u20B9|Rs\.?|INR)?\s*[\d,]+)?/i);
    return m ? m[0].replace(/\s+/g, ' ').trim() : null;
  }

  parsePriceRange(priceHint) {
    if (!priceHint) return { minPrice: 0, maxPrice: 0 };
    const nums = priceHint.match(/[\d,]+/g);
    if (!nums) return { minPrice: 0, maxPrice: 0 };
    const vals = nums.map(n => parseInt(n.replace(/,/g, ''))).filter(n => !isNaN(n));
    if (!vals.length) return { minPrice: 0, maxPrice: 0 };
    return { minPrice: Math.min(...vals), maxPrice: Math.max(...vals) };
  }

  async lookupDetails(name, city) {
    if (!this.enabled || !name) return {};
    const key = `${name}|${city || ''}`.toLowerCase();
    if (this.detailCache.has(key)) return this.detailCache.get(key);
    const query = `${name} ${city || ''} price per plate phone`;
    try {
      const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: { key: this.apiKey, cx: this.cseId, q: query, num: 1, gl: 'in', hl: 'en' },
        timeout: 8000,
      });
      const item = (res.data.items || [])[0];
      if (!item) {
        this.detailCache.set(key, {});
        return {};
      }
      const snippet = `${item.title || ''} ${item.snippet || ''}`;
      const priceHint = this.extractPrice(snippet);
      const phone = this.extractPhone(snippet);
      const result = { priceHint, phone, website: item.link };
      this.detailCache.set(key, result);
      return result;
    } catch {
      this.detailCache.set(key, {});
      return {};
    }
  }

  async searchVendors(category, city, num = 8) {
    if (!this.enabled) return [];
    const query = CATEGORY_QUERIES[category]
      ? CATEGORY_QUERIES[category](city)
      : `${category} wedding ${city}`;
    console.log(`[CustomSearch] Query: "${query}"`);
    try {
      const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: { key: this.apiKey, cx: this.cseId, q: query, num: Math.min(num,10), gl:'in', hl:'en' },
        timeout: 8000,
      });
      return this.parseResults(res.data.items || [], category, city);
    } catch (err) {
      console.error(`[CustomSearch] Error:`, err.response?.data?.error?.message || err.message);
      return [];
    }
  }

  parseResults(items, category, city) {
    return items.map((item, i) => {
      const snippet    = item.snippet || '';
      const priceMatch = snippet.match(/(?:\u20B9|Rs\.?|INR)\s*[\d,]+(?:\s*(?:-|\u2013)\s*(?:\u20B9|Rs\.?|INR)?\s*[\d,]+)?/i);
      const ratingMatch= snippet.match(/(\d\.\d)\s*(?:\/5|stars?|rating)/i);
      return {
        name:        this.extractName(item.title || '', city),
        city, category,
        source:      'google_search',
        website:      item.link,
        description:  snippet,
        contact:      this.extractPhone(snippet),
        phone:        this.extractPhone(snippet),
        priceHint:    priceMatch ? priceMatch[0] : null,
        rating:       ratingMatch ? parseFloat(ratingMatch[1]) : null,
        searchRank:   i + 1,
        priceRange:   priceMatch ? priceMatch[0] : 'Contact for pricing',
        minPrice:     0, maxPrice: 200000,
        experience:   'N/A', style: category, amenities: [],
        aiScore: 0, aiNote: '',
      };
    }).filter(v => v.name && v.name.length > 3);
  }

  extractName(title, city) {
    return title
      .replace(/[-|–]\s*(YouTube|JustDial|Sulekha|WedMeGood|Facebook|Instagram|IndiaMART|Google).*/i, '')
      .replace(new RegExp(`[,|–-]?\\s*${city}.*`, 'i'), '')
      .replace(/\s*(Wedding|Weddings|Events?|Services?|India)\s*$/i, '')
      .replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  async searchVenues(city, guestCount) {
    if (!this.enabled) return [];
    const results = [];
    for (const q of [
      `wedding banquet hall ${city} capacity booking price`,
      `marriage garden farmhouse resort ${city} wedding`,
    ]) {
      try {
        const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
          params: { key: this.apiKey, cx: this.cseId, q, num: 5, gl:'in' },
          timeout: 6000,
        });
        results.push(...this.parseResults(res.data.items||[], 'Venue', city));
        await new Promise(r => setTimeout(r, 250));
      } catch {}
    }
    const seen = new Set();
    return results.filter(v => {
      const k = v.name.toLowerCase().slice(0,20);
      if (seen.has(k)) return false;
      seen.add(k); return true;
    }).map(v => ({
      ...v,
      capacity: null,
      pricePerHead: this.estimatePriceFromText(v.priceHint),
      venueType: 'banquet_hall', distanceFromCenter: null,
    }));
  }

  estimatePriceFromText(text) {
    if (!text) return 1000;
    const nums = text.match(/[\d,]+/g);
    if (!nums) return 1000;
    const n = parseInt(nums[0].replace(/,/g,''));
    return n < 5000 ? n : Math.round(n / 300);
  }
}

module.exports = new CustomSearchAgent();

