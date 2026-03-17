/**
 * HeartBound IQ — Wedding Card Generator v2
 * 10 distinct card designs, each personalised with wedding details.
 * Design is selected by the user (1–10). Names/date/venue are injected.
 * Groq → Anthropic → fallback for personalised copy.
 */
const axios = require('axios');

const DIVINE_MAP = {
  Hindu:       { sym:'ॐ',  txt:'Shri Ganeshaya Namah',       accent:'#8B0000', gold:'#C8A96E' },
  Muslim:      { sym:'﷽',  txt:'Bismillah ir-Rahman ir-Rahim',accent:'#1a5c3a', gold:'#C8A96E' },
  Sikh:        { sym:'ੴ',  txt:'Ik Onkar',                   accent:'#C8601A', gold:'#C8A96E' },
  Christian:   { sym:'✝',  txt:"God's Blessing",             accent:'#3a1a6e', gold:'#C8A96E' },
  Jain:        { sym:'☸',  txt:'Jai Jinendra',               accent:'#6b2a5a', gold:'#C8A96E' },
  Buddhist:    { sym:'☸',  txt:'Namo Buddhaya',              accent:'#5a4a00', gold:'#C8A96E' },
  'Civil/Court':{ sym:'✦', txt:'A New Beginning',            accent:'#2a3a6e', gold:'#C8A96E' },
};

class WeddingCardGenerator {
  constructor() {
    this.groqKey      = process.env.GROQ_API_KEY;
    this.groqModel    = process.env.GROQ_MODEL || 'llama3-70b-8192';
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  async generate(details, designIndex = 1) {
    const copy   = await this.generateCopy(details);
    const divine = DIVINE_MAP[details.religion] || DIVINE_MAP.Hindu;
    const idx    = Math.max(1, Math.min(10, parseInt(designIndex) || 1));
    return this.buildDesign(idx, details, copy, divine);
  }

  async generateCopy(d) {
    const fb = {
      blessing: 'With the blessings of our families and the Almighty',
      tagline:  'Two souls, one beautiful journey',
      body:     `We joyfully invite you to celebrate the sacred union of ${d.brideName} and ${d.groomName}. Your presence and blessings will make this moment truly complete.`,
      footer:   'With love and warm regards',
    };

    const prompt = `Write warm Indian wedding invitation copy.
Bride: ${d.brideName}, Groom: ${d.groomName}, Date: ${d.weddingDate}, Venue: ${d.venue||''}, ${d.city||''}, Religion: ${d.religion||'Hindu'}
Respond ONLY as JSON (no markdown):
{"blessing":"<12-16 word opening blessing>","tagline":"<5-7 word romantic tagline>","body":"<2-sentence warm invitation>","footer":"<short warm closing>"}`;

    try {
      if (this.groqKey && this.groqKey !== 'your_groq_api_key_here') {
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: this.groqModel, messages:[{role:'user',content:prompt}], max_tokens:200, temperature:0.7,
        }, { headers:{'Authorization':`Bearer ${this.groqKey}`,'Content-Type':'application/json'}, timeout:12000 });
        const parsed = JSON.parse(res.data.choices[0].message.content.match(/\{[\s\S]*\}/)[0]);
        return { ...fb, ...parsed };
      }
      if (this.anthropicKey && this.anthropicKey !== 'your_anthropic_api_key_here') {
        const res = await axios.post('https://api.anthropic.com/v1/messages', {
          model:'claude-sonnet-4-20250514', max_tokens:200, messages:[{role:'user',content:prompt}],
        }, { headers:{'x-api-key':this.anthropicKey,'anthropic-version':'2023-06-01','Content-Type':'application/json'}, timeout:12000 });
        const parsed = JSON.parse(res.data.content[0].text.match(/\{[\s\S]*\}/)[0]);
        return { ...fb, ...parsed };
      }
    } catch {}
    return fb;
  }

  // ── 10 Distinct Designs ───────────────────────────────────────────────────

  buildDesign(idx, d, copy, divine) {
    const designs = [
      this.design1_crimsonGold,
      this.design2_midnightRose,
      this.design3_forestGreen,
      this.design4_royalBlue,
      this.design5_champagne,
      this.design6_darkIndigo,
      this.design7_teakWood,
      this.design8_passionRed,
      this.design9_peacockTeal,
      this.design10_parchment,
    ];
    return designs[idx - 1].call(this, d, copy, divine);
  }

  // ── Shared wrapper ────────────────────────────────────────────────────────
  _wrap(title, bgColor, css, bodyHtml, d) {
    const guestLabel = d.guestName ? (d.guestWithFamily ? `${d.guestName} & Family` : d.guestName) : null;
    const hex = (bgColor || '#000000').replace('#','');
    const r = parseInt(hex.substring(0,2),16) || 0;
    const g = parseInt(hex.substring(2,4),16) || 0;
    const b = parseInt(hex.substring(4,6),16) || 0;
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
    const guestColor = luminance > 0.6 ? '#3a2010' : '#f5e6d0';
    const guestLine = guestLabel
      ? `<p class="guest-line" style="color:${guestColor};font-weight:600;letter-spacing:0.06em">Dear <strong>${guestLabel}</strong>,</p>`
      : '';

    let bodyWithGuest = bodyHtml;
    if (guestLine) {
      if (bodyHtml.includes('class="body"')) {
        bodyWithGuest = bodyHtml.replace(/<div class="body">/, `<div class="body">${guestLine}`);
      } else if (bodyHtml.includes('class="card-inner"')) {
        bodyWithGuest = bodyHtml.replace(/<div class="card-inner">/, `<div class="card-inner">${guestLine}`);
      } else if (bodyHtml.includes('class="ci"')) {
        bodyWithGuest = bodyHtml.replace(/<div class="ci">/, `<div class="ci">${guestLine}`);
      } else {
        bodyWithGuest = bodyHtml.replace(/<div([^>]*)>/, '<div$1>' + guestLine);
      }
    }

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Wedding Invitation ? ${d.brideName} & ${d.groomName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Cinzel:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%}
body{font-family:'DM Sans',sans-serif;background:${bgColor};display:flex;align-items:center;justify-content:center;padding:20px;min-height:100vh}
.card{width:100%;max-width:580px;position:relative}
.guest-line{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:16px;text-align:center;margin:0 0 10px;opacity:1}
${css}
</style></head><body>
${bodyWithGuest}
</body></html>`;
  }

  _detailsBlock(d, rowStyle, labelStyle, valStyle) {
    const dateStr = d.weddingDate
      ? (isNaN(new Date(d.weddingDate)) ? d.weddingDate : new Date(d.weddingDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))
      : '—';
    const rows = [
      ['Date',  dateStr],
      ['Time',  d.ceremonyTime || d.weddingTime || '7:00 PM onwards'],
      ['Venue', d.venue || '—'],
      ['City',  d.city  || '—'],
      d.rsvpDeadline && ['RSVP by', d.rsvpDeadline],
    ].filter(Boolean);
    return `<div style="${rowStyle}">
      ${rows.map(([l,v])=>`<div class="drow"><span class="dlbl" style="${labelStyle}">${l}</span><span class="dval" style="${valStyle}">${v}</span></div>`).join('')}
    </div>`;
  }

  // ── Design 1: Crimson & Gold (Classic Indian) ─────────────────────────────
  design1_crimsonGold(d, copy, divine) {
    return this._wrap('Crimson Gold', '#1a0505', `
.card-inner{background:#fdf6e3;border:2px solid #C8A96E;position:relative;overflow:hidden}
.card-inner::before{content:'';position:absolute;inset:8px;border:1px solid rgba(200,169,110,0.4);pointer-events:none;z-index:1}
.band{background:linear-gradient(135deg,#8B0000,#C41E3A,#8B0000);padding:16px 30px;text-align:center}
.band-t{font-family:'Cinzel',serif;color:#FFD700;font-size:12px;letter-spacing:0.3em}
.body{padding:24px 36px;text-align:center;position:relative;z-index:2}
.sym{font-size:36px;color:${divine.accent};display:block;margin-bottom:4px}
.sym-t{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:12px;color:#6B4C2A;letter-spacing:0.15em;margin-bottom:16px;display:block}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;color:#6B4C2A;font-size:14px;margin-bottom:16px}
.nm{font-family:'Cinzel',serif;font-size:clamp(22px,5vw,36px);color:#8B0000;line-height:1.1}
.amp{font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:#C8A96E;display:block;margin:4px 0;font-style:italic}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;color:#8B6914;font-size:13px;letter-spacing:0.1em;margin-top:8px}
.names-wrap{margin:18px 0;padding:16px;border-top:1px solid rgba(200,169,110,0.4);border-bottom:1px solid rgba(200,169,110,0.4)}
.drow{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(200,169,110,0.15);font-family:'Cormorant Garamond',serif}
.details{background:rgba(139,0,0,0.05);border:1px solid rgba(200,169,110,0.3);padding:16px 20px;margin:16px 0}
.divider{color:#C8A96E;font-size:16px;letter-spacing:6px;margin:12px 0}
.footer-t{font-family:'Cormorant Garamond',serif;font-style:italic;color:#6B4C2A;font-size:13px;margin-top:14px}
.bot-band{background:linear-gradient(135deg,#8B0000,#C41E3A,#8B0000);padding:12px;text-align:center}
.bot-band p{color:rgba(255,220,150,0.8);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:'Cinzel',serif}
.corner{position:absolute;font-size:20px;color:rgba(200,169,110,0.3);z-index:2}
.c-tl{top:14px;left:14px}.c-tr{top:14px;right:14px}.c-bl{bottom:14px;left:14px}.c-br{bottom:14px;right:14px}
`, `<div class="card-inner">
  <span class="corner c-tl">❋</span><span class="corner c-tr">❋</span>
  <span class="corner c-bl">❋</span><span class="corner c-br">❋</span>
  <div class="band"><p class="band-t">✦ Shubh Vivah ✦</p></div>
  <div class="body">
    <span class="sym">${divine.sym}</span>
    <span class="sym-t">${divine.txt}</span>
    <p class="bl">${copy.blessing}</p>
    ${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:#8B6914;margin-bottom:12px;letter-spacing:0.06em">${d.familyNames}</p>`:''}
    <p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:#5a3a1a;font-size:14px;margin-bottom:16px">cordially invite you to the wedding of</p>
    <div class="names-wrap">
      <p class="nm" style="font-style:italic;color:#C41E3A">${d.brideName}</p>
      <span class="amp">&amp;</span>
      <p class="nm">${d.groomName}</p>
      <p class="tag">${copy.tagline}</p>
    </div>
    <p style="font-family:'Cormorant Garamond',serif;font-size:14px;color:#4a3020;line-height:1.8;margin-bottom:12px">${copy.body}</p>
    <div class="divider">❧ ✿ ❧</div>
    <div class="details">${this._detailsBlock(d,'','font-size:11px;color:#8B6914;text-transform:uppercase;letter-spacing:0.1em','font-size:14px;color:#3a2010;font-family:Cormorant Garamond,serif')}</div>
    <p class="footer-t">${copy.footer}</p>
    <p style="font-family:'Cinzel',serif;font-size:18px;color:#C41E3A;margin-top:6px">${d.brideName} &amp; ${d.groomName}</p>
  </div>
  <div class="bot-band"><p>✦ With Love ✦</p></div>
</div>`, d);
  }

  // ── Design 2: Midnight Rose (Dark luxury) ─────────────────────────────────
  design2_midnightRose(d, copy, divine) {
    return this._wrap('Midnight Rose', '#0a0508', `
.card-inner{background:linear-gradient(160deg,#140a10,#1e0f18,#140a10);border:1px solid rgba(224,114,138,0.5);padding:32px 28px;text-align:center;position:relative;overflow:hidden}
.card-inner::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(224,114,138,0.6),transparent)}
.card-inner::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(224,114,138,0.6),transparent)}
.sym{font-size:2.2rem;color:#d4728a;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(212,114,138,0.6);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:18px}
.flourish{color:rgba(212,114,138,0.4);font-size:12px;letter-spacing:5px;margin:12px 0;display:block}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(240,220,200,0.65);margin-bottom:14px}
.nm-wrap{border-top:1px solid rgba(212,114,138,0.25);border-bottom:1px solid rgba(212,114,138,0.25);padding:18px;margin:16px 0;position:relative}
.nm-wrap::before{content:'✦';position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#1e0f18;padding:0 10px;color:rgba(212,114,138,0.6);font-size:12px}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);font-weight:400;line-height:1.1}
.bride{color:#e8c4b8}.groom{color:#f5e6d0}
.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:rgba(212,114,138,0.7);display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(212,114,138,0.6);margin-top:10px}
.drow{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(212,114,138,0.1)}
.dt-box{border:1px solid rgba(212,114,138,0.2);padding:14px 18px;margin:14px 0}
`, `<div class="card-inner">
  <span class="sym">${divine.sym}</span>
  <span class="sym-t">${divine.txt}</span>
  <span class="flourish">❧ ✦ ❧</span>
  <p class="bl">${copy.blessing}</p>
  ${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:rgba(212,114,138,0.7);margin-bottom:10px">${d.familyNames}</p>`:''}
  <p style="font-size:12px;color:rgba(200,180,160,0.55);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">cordially invite you to the wedding of</p>
  <div class="nm-wrap">
    <p class="nm bride">${d.brideName}</p>
    <span class="amp">&amp;</span>
    <p class="nm groom">${d.groomName}</p>
    <p class="tag">${copy.tagline}</p>
  </div>
  <p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(240,220,200,0.6);line-height:1.7;margin-bottom:14px">${copy.body}</p>
  <div class="dt-box">${this._detailsBlock(d,'','font-size:10px;color:rgba(212,114,138,0.55);text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#f0e6d0;font-style:italic')}</div>
  <p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(212,114,138,0.6);margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p>
</div>`, d);
  }

  // ── Design 3: Forest Green & Gold (Nature) ────────────────────────────────
  design3_forestGreen(d, copy, divine) {
    return this._wrap('Forest Green', '#050f08', `
.card-inner{background:linear-gradient(160deg,#071810,#0d2e1a,#071810);border:1px solid rgba(100,200,120,0.35);padding:30px 28px;text-align:center;position:relative}
.card-inner::before,.card-inner::after{content:'';position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(100,200,120,0.4),rgba(212,168,75,0.4),transparent)}
.card-inner::before{top:0}.card-inner::after{bottom:0}
.sym{font-size:2.2rem;color:#5dc87a;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(100,200,120,0.55);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:16px}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(200,240,210,0.65);margin-bottom:14px}
.nm-wrap{border-top:1px solid rgba(100,200,120,0.2);border-bottom:1px solid rgba(100,200,120,0.2);padding:18px;margin:16px 0}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);font-weight:400;line-height:1.1;color:#b8f0c8}
.bride{color:#d4e8b8}.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:rgba(212,168,75,0.7);display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(100,200,120,0.6);margin-top:10px}
.drow{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(100,200,120,0.1)}
.dt-box{border:1px solid rgba(100,200,120,0.2);padding:14px 18px;margin:14px 0;background:rgba(100,200,120,0.04)}
`, `<div class="card-inner">
  <span class="sym">${divine.sym}</span>
  <span class="sym-t">${divine.txt}</span>
  <p class="bl">${copy.blessing}</p>
  ${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:rgba(100,200,120,0.65);margin-bottom:10px">${d.familyNames}</p>`:''}
  <p style="font-size:12px;color:rgba(200,220,210,0.5);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">invite you to the wedding of</p>
  <div class="nm-wrap">
    <p class="nm bride">${d.brideName}</p>
    <span class="amp">&amp;</span>
    <p class="nm">${d.groomName}</p>
    <p class="tag">${copy.tagline}</p>
  </div>
  <p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(200,240,210,0.6);line-height:1.7;margin-bottom:14px">${copy.body}</p>
  <div class="dt-box">${this._detailsBlock(d,'','font-size:10px;color:rgba(100,200,120,0.55);text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#d0f0d8;font-style:italic')}</div>
  <p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(100,200,120,0.55);margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p>
</div>`, d);
  }

  // ── Design 4: Royal Blue (Regal) ──────────────────────────────────────────
  design4_royalBlue(d, copy, divine) {
    return this._wrap('Royal Blue', '#03070f', `
.card-inner{background:linear-gradient(160deg,#060d1f,#0e1c3e,#060d1f);border:1px solid rgba(80,130,230,0.4);padding:30px 28px;text-align:center;position:relative}
.top-band{background:linear-gradient(90deg,#1a3a8a,#2952c8,#1a3a8a);height:5px;margin:-30px -28px 24px}
.bot-band{background:linear-gradient(90deg,#1a3a8a,#2952c8,#1a3a8a);height:5px;margin:20px -28px -30px}
.sym{font-size:2.2rem;color:#6a9ef5;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(80,130,230,0.55);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:16px}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(180,200,250,0.7);margin-bottom:14px}
.nm-wrap{border:1px solid rgba(80,130,230,0.25);padding:18px;margin:16px 0;background:rgba(80,130,230,0.06)}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);font-weight:400;line-height:1.1;color:#b8d0f8}
.bride{color:#c8d8ff}.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:rgba(212,168,75,0.8);display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(80,130,230,0.65);margin-top:10px}
.drow{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(80,130,230,0.12)}
.dt-box{border:1px solid rgba(80,130,230,0.2);padding:14px 18px;margin:14px 0}
`, `<div class="card-inner">
  <div class="top-band"></div>
  <span class="sym">${divine.sym}</span>
  <span class="sym-t">${divine.txt}</span>
  <p class="bl">${copy.blessing}</p>
  ${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:rgba(80,130,230,0.65);margin-bottom:10px">${d.familyNames}</p>`:''}
  <p style="font-size:12px;color:rgba(180,200,250,0.5);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">invite you to the wedding of</p>
  <div class="nm-wrap">
    <p class="nm bride">${d.brideName}</p>
    <span class="amp">&amp;</span>
    <p class="nm">${d.groomName}</p>
    <p class="tag">${copy.tagline}</p>
  </div>
  <p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(180,200,250,0.6);line-height:1.7;margin-bottom:14px">${copy.body}</p>
  <div class="dt-box">${this._detailsBlock(d,'','font-size:10px;color:rgba(80,130,230,0.55);text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#c0d8ff;font-style:italic')}</div>
  <p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(80,130,230,0.55);margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p>
  <div class="bot-band"></div>
</div>`, d);
  }

  // ── Design 5: Champagne (Elegant minimal) ─────────────────────────────────
  design5_champagne(d, copy, divine) {
    return this._wrap('Champagne', '#f5f0e8', `
body{background:#f5f0e8}
.card-inner{background:#fffcf5;border:1.5px solid rgba(180,140,60,0.5);padding:40px 36px;text-align:center;position:relative}
.card-inner::before{content:'';position:absolute;inset:10px;border:1px dashed rgba(180,140,60,0.25);pointer-events:none}
.sym{font-size:2rem;color:#b88c3c;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(140,100,40,0.6);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:18px}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:#7a6040;margin-bottom:14px}
.nm-wrap{margin:20px 0;padding:16px;border-top:1px solid rgba(180,140,60,0.35);border-bottom:1px solid rgba(180,140,60,0.35)}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);font-weight:400;color:#5a3a10;line-height:1.1}
.bride{color:#8B0000}.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:#b88c3c;display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#9a7a40;margin-top:8px}
.drow{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(180,140,60,0.15)}
.dt-box{border:1px solid rgba(180,140,60,0.3);padding:14px 18px;margin:14px 0;background:rgba(180,140,60,0.04)}
`, `<div class="card-inner">
  <span class="sym">${divine.sym}</span>
  <span class="sym-t">${divine.txt}</span>
  <p class="bl">${copy.blessing}</p>
  ${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:#9a7a40;margin-bottom:12px">${d.familyNames}</p>`:''}
  <p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:#6a5030;font-size:14px;margin-bottom:16px">invite you to the wedding of</p>
  <div class="nm-wrap">
    <p class="nm bride">${d.brideName}</p>
    <span class="amp">&amp;</span>
    <p class="nm">${d.groomName}</p>
    <p class="tag">${copy.tagline}</p>
  </div>
  <p style="font-family:'Cormorant Garamond',serif;font-size:14px;color:#5a4030;line-height:1.8;margin-bottom:12px">${copy.body}</p>
  <div class="dt-box">${this._detailsBlock(d,'','font-size:11px;color:#9a7a40;text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#3a2010')}</div>
  <p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:#7a6040;font-size:13px;margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p>
</div>`, d);
  }

  // ── Designs 6–10: shorter but distinct ───────────────────────────────────

  design6_darkIndigo(d, copy, divine) {
    const dRows = this._detailsBlock(d,'','font-size:10px;color:rgba(160,130,230,0.55);text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#d8ccff;font-style:italic');
    return this._wrap('Dark Indigo','#06030f',`
.ci{background:linear-gradient(160deg,#0d0820,#160c38,#0d0820);border:1px solid rgba(140,100,220,0.45);padding:32px 28px;text-align:center;position:relative}
.ci::before,.ci::after{content:'';position:absolute;top:16px;bottom:16px;width:2px;background:linear-gradient(180deg,transparent,rgba(140,100,220,0.3),transparent)}
.ci::before{left:12px}.ci::after{right:12px}
.sym{font-size:2.2rem;color:#a87ef0;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(140,100,220,0.55);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:16px}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(200,180,255,0.7);margin-bottom:14px}
.nm-wrap{border-top:1px solid rgba(140,100,220,0.25);border-bottom:1px solid rgba(140,100,220,0.25);padding:18px;margin:16px 0}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);color:#d4c4ff;line-height:1.1}
.bride{color:#f0c8e8}.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:rgba(212,168,75,0.75);display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(140,100,220,0.6);margin-top:8px}
.drow{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(140,100,220,0.12)}
.dt-box{border:1px solid rgba(140,100,220,0.2);padding:14px 18px;margin:14px 0}
`,`<div class="ci"><span class="sym">${divine.sym}</span><span class="sym-t">${divine.txt}</span>
<p class="bl">${copy.blessing}</p>${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:rgba(140,100,220,0.65);margin-bottom:10px">${d.familyNames}</p>`:''}
<p style="font-size:12px;color:rgba(200,180,255,0.5);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">invite you to the wedding of</p>
<div class="nm-wrap"><p class="nm bride">${d.brideName}</p><span class="amp">&amp;</span><p class="nm">${d.groomName}</p><p class="tag">${copy.tagline}</p></div>
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(200,180,255,0.6);line-height:1.7;margin-bottom:14px">${copy.body}</p>
<div class="dt-box">${dRows}</div>
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(140,100,220,0.55);margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p></div>`,d);
  }

  design7_teakWood(d, copy, divine) {
    const dRows = this._detailsBlock(d,'','font-size:11px;color:#9a7050;text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#2a1a08');
    return this._wrap('Teak Wood','#1a0d05',`
.ci{background:linear-gradient(160deg,#f5e8d0,#fffaf0,#f5e8d0);border:3px double rgba(140,80,20,0.5);padding:32px 28px;text-align:center;position:relative}
.sym{font-size:2rem;color:#8B4513;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(120,70,20,0.6);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:16px}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:#6B4020;margin-bottom:14px}
.nm-wrap{border-top:2px solid rgba(140,80,20,0.3);border-bottom:2px solid rgba(140,80,20,0.3);padding:18px;margin:16px 0}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);color:#5a2a08;line-height:1.1}
.bride{color:#8B0000}.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:#b88040;display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#9a6030;margin-top:8px}
.drow{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(140,80,20,0.15)}
.dt-box{border:1px solid rgba(140,80,20,0.25);padding:14px 18px;margin:14px 0;background:rgba(140,80,20,0.04)}
`,`<div class="ci"><span class="sym">${divine.sym}</span><span class="sym-t">${divine.txt}</span>
<p class="bl">${copy.blessing}</p>${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:#9a7050;margin-bottom:12px">${d.familyNames}</p>`:''}
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:#5a4030;font-size:14px;margin-bottom:16px">cordially invite you to the wedding of</p>
<div class="nm-wrap"><p class="nm bride">${d.brideName}</p><span class="amp">&amp;</span><p class="nm">${d.groomName}</p><p class="tag">${copy.tagline}</p></div>
<p style="font-family:'Cormorant Garamond',serif;font-size:14px;color:#4a3020;line-height:1.8;margin-bottom:12px">${copy.body}</p>
<div class="dt-box">${dRows}</div>
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:#6a5030;font-size:13px;margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p></div>`,d);
  }

  design8_passionRed(d, copy, divine) {
    const dRows = this._detailsBlock(d,'','font-size:10px;color:rgba(255,160,160,0.55);text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#ffe8e8;font-style:italic');
    return this._wrap('Passion Red','#0f0202',`
.ci{background:linear-gradient(160deg,#200505,#3a0808,#200505);border:1px solid rgba(220,60,60,0.45);padding:32px 28px;text-align:center;position:relative;overflow:hidden}
.ci::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(220,60,60,0.06),transparent 60%);pointer-events:none}
.sym{font-size:2.2rem;color:#f07070;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(220,100,100,0.55);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:16px}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(255,200,200,0.7);margin-bottom:14px}
.nm-wrap{border-top:1px solid rgba(220,60,60,0.3);border-bottom:1px solid rgba(220,60,60,0.3);padding:18px;margin:16px 0}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);color:#ffe0e0;line-height:1.1}
.bride{color:#ffb8b8}.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:rgba(212,168,75,0.75);display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(220,100,100,0.6);margin-top:8px}
.drow{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(220,60,60,0.12)}
.dt-box{border:1px solid rgba(220,60,60,0.2);padding:14px 18px;margin:14px 0}
`,`<div class="ci"><span class="sym">${divine.sym}</span><span class="sym-t">${divine.txt}</span>
<p class="bl">${copy.blessing}</p>${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:rgba(220,100,100,0.65);margin-bottom:10px">${d.familyNames}</p>`:''}
<p style="font-size:12px;color:rgba(255,200,200,0.5);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">invite you to the wedding of</p>
<div class="nm-wrap"><p class="nm bride">${d.brideName}</p><span class="amp">&amp;</span><p class="nm">${d.groomName}</p><p class="tag">${copy.tagline}</p></div>
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(255,200,200,0.6);line-height:1.7;margin-bottom:14px">${copy.body}</p>
<div class="dt-box">${dRows}</div>
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(220,100,100,0.55);margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p></div>`,d);
  }

  design9_peacockTeal(d, copy, divine) {
    const dRows = this._detailsBlock(d,'','font-size:10px;color:rgba(60,200,180,0.55);text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#c8f5f0;font-style:italic');
    return this._wrap('Peacock Teal','#030f0e',`
.ci{background:linear-gradient(160deg,#051a18,#0c2e2a,#051a18);border:1px solid rgba(40,180,160,0.4);padding:32px 28px;text-align:center;position:relative}
.ci::before,.ci::after{content:'✦';position:absolute;color:rgba(40,180,160,0.2);font-size:40px}
.ci::before{top:10px;left:14px}.ci::after{bottom:10px;right:14px}
.sym{font-size:2.2rem;color:#3ecfbe;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(40,180,160,0.55);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:16px}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(180,240,230,0.7);margin-bottom:14px}
.nm-wrap{border-top:1px solid rgba(40,180,160,0.25);border-bottom:1px solid rgba(40,180,160,0.25);padding:18px;margin:16px 0}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);color:#b0ece4;line-height:1.1}
.bride{color:#d4f8f0}.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:rgba(212,168,75,0.75);display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(40,180,160,0.6);margin-top:8px}
.drow{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(40,180,160,0.12)}
.dt-box{border:1px solid rgba(40,180,160,0.2);padding:14px 18px;margin:14px 0}
`,`<div class="ci"><span class="sym">${divine.sym}</span><span class="sym-t">${divine.txt}</span>
<p class="bl">${copy.blessing}</p>${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:rgba(40,180,160,0.65);margin-bottom:10px">${d.familyNames}</p>`:''}
<p style="font-size:12px;color:rgba(180,240,230,0.5);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">invite you to the wedding of</p>
<div class="nm-wrap"><p class="nm bride">${d.brideName}</p><span class="amp">&amp;</span><p class="nm">${d.groomName}</p><p class="tag">${copy.tagline}</p></div>
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:rgba(180,240,230,0.6);line-height:1.7;margin-bottom:14px">${copy.body}</p>
<div class="dt-box">${dRows}</div>
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(40,180,160,0.55);margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p></div>`,d);
  }

  design10_parchment(d, copy, divine) {
    const dRows = this._detailsBlock(d,'','font-size:11px;color:#8B6914;text-transform:uppercase;letter-spacing:0.1em','font-family:Cormorant Garamond,serif;font-size:15px;color:#2a1a00');
    return this._wrap('Parchment','#c8b090',`
body{background:#c8b090}
.ci{background:linear-gradient(160deg,#f8edc8,#fff8e8,#f8edc8);border:2px solid rgba(140,90,10,0.5);padding:32px 28px;text-align:center;position:relative;box-shadow:4px 4px 20px rgba(0,0,0,0.3)}
.ci::before{content:'';position:absolute;inset:12px;border:1px solid rgba(140,90,10,0.2);pointer-events:none}
.sym{font-size:2rem;color:#8B4513;display:block;margin-bottom:4px}
.sym-t{font-size:10px;color:rgba(100,60,10,0.6);text-transform:uppercase;letter-spacing:0.2em;display:block;margin-bottom:16px}
.bl{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:#5a3a10;margin-bottom:14px}
.nm-wrap{margin:18px 0;padding:16px;border-top:1.5px solid rgba(140,90,10,0.35);border-bottom:1.5px solid rgba(140,90,10,0.35)}
.nm{font-family:'Cinzel',serif;font-size:clamp(20px,5vw,32px);color:#3a1a00;line-height:1.1}
.bride{color:#8B0000}.amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.5rem;color:#b87820;display:block;margin:5px 0}
.tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:#8B6030;margin-top:8px}
.drow{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(140,90,10,0.15)}
.dt-box{border:1px solid rgba(140,90,10,0.25);padding:14px 18px;margin:14px 0;background:rgba(140,90,10,0.04)}
`,`<div class="ci"><span class="sym">${divine.sym}</span><span class="sym-t">${divine.txt}</span>
<p class="bl">${copy.blessing}</p>${d.familyNames?`<p style="font-family:'Cormorant Garamond',serif;font-size:13px;color:#9a7030;margin-bottom:12px">${d.familyNames}</p>`:''}
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:#5a4020;font-size:14px;margin-bottom:16px">cordially invite you to the wedding of</p>
<div class="nm-wrap"><p class="nm bride">${d.brideName}</p><span class="amp">&amp;</span><p class="nm">${d.groomName}</p><p class="tag">${copy.tagline}</p></div>
<p style="font-family:'Cormorant Garamond',serif;font-size:14px;color:#3a2010;line-height:1.8;margin-bottom:12px">${copy.body}</p>
<div class="dt-box">${dRows}</div>
<p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:#5a4020;font-size:13px;margin-top:14px">${copy.footer} · ${d.brideName} &amp; ${d.groomName}</p></div>`,d);
  }
}

module.exports = new WeddingCardGenerator();

