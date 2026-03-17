/**
 * HeartBound IQ — Budget Tracker Agent
 *
 * Responsibilities:
 *  - Track all wedding expenses by category
 *  - Calculate totals, remaining budget, % used per category
 *  - Generate AI-powered saving suggestions when over budget
 *  - Flag upcoming unpaid items
 */

const axios = require('axios');

const CATEGORIES = ['Venue','Catering','Decoration','Photography','Music & DJ','Attire','Invitations','Transport','Accommodation','Gifts & Favours','Mehendi & Beauty','Pandit & Rituals','Miscellaneous'];

class BudgetTrackerAgent {
  constructor() {
    this.name = 'BudgetTrackerAgent';
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  // ─── Compute summary from entries ────────────────────────────────────────
  summarize(totalBudget, entries) {
    const spent   = entries.reduce((s, e) => s + e.amount, 0);
    const paid    = entries.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
    const unpaid  = spent - paid;
    const remaining = totalBudget - spent;
    const pctUsed   = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;

    const byCategory = {};
    CATEGORIES.forEach(c => { byCategory[c] = { spent:0, count:0 }; });
    entries.forEach(e => {
      if (!byCategory[e.category]) byCategory[e.category] = { spent:0, count:0 };
      byCategory[e.category].spent += e.amount;
      byCategory[e.category].count += 1;
    });

    return { totalBudget, spent, paid, unpaid, remaining, pctUsed, byCategory };
  }

  // ─── AI saving suggestions ────────────────────────────────────────────────
  async getSuggestions(summary) {
    if ((!this.groqKey || this.groqKey === 'your_groq_api_key_here') && (!this.anthropicKey || this.anthropicKey === 'your_anthropic_api_key_here')) {
      return this.fallbackSuggestions(summary);
    }
    try {
      const topCategories = Object.entries(summary.byCategory)
        .filter(([,v]) => v.spent > 0)
        .sort((a,b) => b[1].spent - a[1].spent)
        .slice(0,5)
        .map(([k,v]) => `${k}: ₹${v.spent.toLocaleString('en-IN')}`)
        .join(', ');

      const prompt = `You are HeartBound IQ's Budget Tracker Agent for an Indian wedding.

Budget summary:
- Total budget: 
?${summary.totalBudget.toLocaleString('en-IN')}
- Expected spend (planned): 
?${summary.spent.toLocaleString('en-IN')} (${summary.pctUsed}%)
- Paid so far: 
?${summary.paid.toLocaleString('en-IN')}
- Remaining after expected: 
?${summary.remaining.toLocaleString('en-IN')}
- Top spending categories: ${topCategories}

${summary.remaining < 0 ? 'The couple is OVER BUDGET.' : summary.pctUsed > 80 ? 'Budget is nearly exhausted.' : 'Budget is on track.'}

Give 3 short, practical, India-specific money-saving tips for this wedding. Be specific and actionable.
Respond ONLY as a JSON array of 3 strings. No preamble. Example: ["tip 1","tip 2","tip 3"]`;

      // Try Groq first
      if (this.groqKey && this.groqKey !== 'your_groq_api_key_here') {
        const gr = await axios.post('https://api.groq.com/openai/v1/chat/completions', { model:this.groqModel, messages:[{role:'user',content:prompt}], max_tokens:300 }, { headers:{'Authorization':'Bearer '+this.groqKey,'Content-Type':'application/json'}, timeout:15000 });
        return JSON.parse(gr.data.choices[0].message.content.match(/\[[\s\S]*\]/)[0]);
      }
      const res = await axios.post('https://api.anthropic.com/v1/messages',
        { model:'claude-sonnet-4-20250514', max_tokens:300, messages:[{ role:'user', content:prompt }] },
        { headers:{ 'x-api-key':this.anthropicKey, 'anthropic-version':'2023-06-01', 'Content-Type':'application/json' } }
      );
      const text = res.data.content[0].text;
      return JSON.parse(text.match(/\[[\s\S]*\]/)[0]);
    } catch {
      return this.fallbackSuggestions(summary);
    }
  }

  fallbackSuggestions(summary) {
    const tips = [
      'Book your venue on weekdays or off-season months (Jan–Mar) to save 20–30% on hall charges.',
      'Opt for a buffet-style catering over plated service — saves ₹150–300 per head without compromising quality.',
      'Hire local photographers with strong portfolios over big-city studios to cut photography costs by 40%.',
      'Choose in-house decorators from your venue — they often offer bundled discounts with the booking.',
      'Order wedding cards in bulk from local printers and skip embossing for budget versions.',
      'Consider a single combined venue for all ceremonies (mehndi, sangeet, wedding) to avoid multiple hall bookings.',
    ];
    if (summary.remaining < 0) {
      return [tips[0], tips[1], tips[2]];
    }
    return [tips[3], tips[4], tips[5]];
  }

  get categories() { return CATEGORIES; }
}

module.exports = new BudgetTrackerAgent();

