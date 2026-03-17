/**
 * HeartBound IQ — Wedding Website Agent (v2 — dark mode + card embed)
 */
const axios = require('axios');

class WeddingWebsiteAgent {
  constructor() { this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.groqKey   = process.env.GROQ_API_KEY;
    this.groqModel = process.env.GROQ_MODEL || "llama3-70b-8192"; }

  async generate(details) {
    const story = await this.getStory(details);
    const html  = this.buildHTML(details, story);
    return { success: true, html };
  }

  async getStory(details) {
    const fallback = {
      headline: `Two hearts, one beautiful journey`,
      story: `${details.brideName} and ${details.groomName} found in each other a best friend, a partner, and a home. Their journey, filled with laughter and cherished memories, now leads to this beautiful celebration of love. We are overjoyed to share this moment with our dearest family and friends.`,
      closing: `Your presence is our greatest gift.`,
    };
    if ((!this.groqKey||this.groqKey==='your_groq_api_key_here')&&(!this.anthropicKey||this.anthropicKey==='your_anthropic_api_key_here')) return fallback;
    try {
      const prompt = `Write warm, romantic content for an Indian wedding website.
Bride: ${details.brideName}, Groom: ${details.groomName}
Location: ${details.venue}, ${details.city}
Date: ${details.weddingDate}
Love story hint: ${details.loveStory || 'college sweethearts who became best friends'}
Respond ONLY as JSON: {"headline":"<6-8 word romantic headline>","story":"<3-sentence warm love story>","closing":"<1 warm closing line>"}`;
      if (this.groqKey && this.groqKey !== 'your_groq_api_key_here') { const gr = await axios.post('https://api.groq.com/openai/v1/chat/completions',{model:this.groqModel,messages:[{role:'user',content:prompt}],max_tokens:300,temperature:0.6},{headers:{'Authorization':'Bearer '+this.groqKey,'Content-Type':'application/json'},timeout:15000}); return JSON.parse(gr.data.choices[0].message.content.match(/\{[\s\S]*\}/)[0]); }
      const res = await axios.post('https://api.anthropic.com/v1/messages',
        { model:'claude-sonnet-4-20250514', max_tokens:300, messages:[{role:'user',content:prompt}] },
        { headers:{'x-api-key':this.anthropicKey,'anthropic-version':'2023-06-01','Content-Type':'application/json'} }
      );
      return JSON.parse(res.data.content[0].text.match(/\{[\s\S]*\}/)[0]);
    } catch { return fallback; }
  }

  buildHTML(d, story) {
    const events = [
      d.hasMehendi && { name:'Mehendi Ceremony',      date:d.mehendiDate||'Day before wedding', time:d.mehendiTime||'4:00 PM',  venue:d.mehendiVenue||d.venue },
      d.hasSangeet && { name:'Sangeet & Celebrations', date:d.sangeetDate||'Evening before',     time:d.sangeetTime||'7:00 PM',  venue:d.sangeetVenue||d.venue },
      { name:'Wedding Ceremony',  date:d.weddingDate||'Wedding Day', time:d.ceremonyTime||'7:00 PM',  venue:d.venue||'Venue TBD' },
      { name:'Reception Dinner',  date:d.weddingDate||'Wedding Day', time:d.receptionTime||'9:00 PM', venue:d.venue||'Venue TBD' },
    ].filter(Boolean);

    const dateStr = d.weddingDate
      ? new Date(d.weddingDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
      : 'Date to be announced';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${d.brideName} & ${d.groomName} — Wedding</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Cinzel:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--rose:#d4728a;--gold:#c9a84c;--dark:#060309;--mid:#0f0814;--card:#130c18;--text:#f2ecf8;--muted:#8a7e96;--border:rgba(201,168,76,0.2)}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif;background:var(--dark);color:var(--text);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--dark)}::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.3);border-radius:3px}

/* NAV */
nav{position:sticky;top:0;z-index:100;background:rgba(6,3,9,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:14px 24px;display:flex;justify-content:space-between;align-items:center}
.nav-brand{font-family:'Cinzel',serif;font-size:15px;color:var(--gold);letter-spacing:0.1em}
.nav-links{display:flex;gap:28px}
nav a{font-size:12px;color:var(--muted);text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;transition:color 0.2s}
nav a:hover{color:var(--rose)}

/* HERO */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 60%,rgba(212,114,138,0.06) 0%,transparent 65%),var(--dark)}
.hero-particles{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.p{position:absolute;border-radius:50%;opacity:0;animation:float linear infinite}
@keyframes float{0%{transform:translateY(100vh) scale(0);opacity:0}10%{opacity:1}90%{opacity:0.3}100%{transform:translateY(-100px) scale(1);opacity:0}}
.hero-mark{font-size:1.8rem;color:var(--gold);display:block;margin-bottom:22px;letter-spacing:0.3em;opacity:0.8}
.hero-names{font-family:'Cinzel',serif;font-size:clamp(2.4rem,8vw,5.5rem);font-weight:400;line-height:1.05;color:var(--text);text-align:center}
.hero-names .bride{display:block;color:#e8c4b8}
.hero-names .amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:0.7em;color:var(--gold);display:block;margin:6px 0}
.hero-names .groom{display:block}
.hero-sep{width:60px;height:1px;background:var(--gold);margin:22px auto;opacity:0.6}
.hero-date{font-size:14px;color:var(--muted);letter-spacing:0.2em;text-transform:uppercase;text-align:center}
.hero-venue{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:16px;color:rgba(201,168,76,0.7);text-align:center;margin-top:8px}
.scroll-hint{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);font-size:11px;color:var(--muted);letter-spacing:0.15em;text-transform:uppercase;animation:bob 2s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(6px)}}

/* SECTIONS */
section{padding:80px 20px;max-width:720px;margin:0 auto}
.s-label{font-size:10px;color:var(--rose);text-transform:uppercase;letter-spacing:0.22em;margin-bottom:10px;font-weight:500}
.s-title{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,5vw,3.2rem);font-weight:300;margin-bottom:18px;line-height:1.2;color:var(--text)}
.s-body{font-size:15px;color:var(--muted);line-height:1.85;max-width:580px}
.s-divider{width:36px;height:1px;background:var(--gold);margin:22px 0;opacity:0.5}

/* STORY section decoration */
.story-quote{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.15rem;color:rgba(201,168,76,0.8);line-height:1.7;padding:16px 20px;border-left:2px solid rgba(201,168,76,0.3);margin-top:20px}

/* EVENTS */
.events{display:flex;flex-direction:column;gap:12px;margin-top:28px;width:100%}
.event-card{background:rgba(201,168,76,0.04);border:1px solid var(--border);padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:16px;transition:border-color 0.2s}
.event-card:hover{border-color:rgba(201,168,76,0.4)}
.event-name{font-family:'Cinzel',serif;font-size:14px;color:var(--text);margin-bottom:5px;letter-spacing:0.05em}
.event-meta{font-size:12px;color:var(--muted)}
.event-time-val{font-family:'Cormorant Garamond',serif;font-size:1.5rem;color:var(--rose);font-style:italic;text-align:right;display:block}
.event-date-sm{font-size:11px;color:var(--muted);text-align:right}

/* INVITATION CARD SECTION */
.invite-section{background:linear-gradient(160deg,#0d0610,#160b1c,#0d0610);border:1px solid rgba(201,168,76,0.4);padding:36px 28px;margin-top:28px;position:relative;text-align:center}
.invite-section::before,.invite-section::after{content:'';position:absolute;width:50px;height:50px;pointer-events:none}
.invite-section::before{top:0;left:0;border-top:2px solid rgba(201,168,76,0.5);border-left:2px solid rgba(201,168,76,0.5)}
.invite-section::after{bottom:0;right:0;border-bottom:2px solid rgba(201,168,76,0.5);border-right:2px solid rgba(201,168,76,0.5)}
.ic-divine{font-size:2rem;color:#B8963E;display:block;margin-bottom:6px}
.ic-divine-txt{font-size:10px;color:rgba(201,168,76,0.6);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:12px;display:block}
.ic-flourish{color:rgba(201,168,76,0.4);font-size:12px;letter-spacing:5px;margin:10px 0;display:block}
.ic-names{font-family:'Cinzel',serif;font-size:clamp(20px,4vw,30px);color:#e8c4b8;line-height:1.15}
.ic-amp{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(16px,3vw,22px);color:rgba(201,168,76,0.7);display:block;margin:5px 0}
.ic-groom{color:#f5e6d0}
.ic-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:16px;border:1px solid rgba(201,168,76,0.2)}
.ic-detail{padding:10px 14px;border-right:1px solid rgba(201,168,76,0.2);border-bottom:1px solid rgba(201,168,76,0.2)}
.ic-detail:nth-child(2n){border-right:none}
.ic-detail:nth-last-child(-n+2){border-bottom:none}
.ic-detail-lbl{font-size:9px;color:rgba(201,168,76,0.5);text-transform:uppercase;letter-spacing:0.15em;display:block;margin-bottom:3px}
.ic-detail-val{font-family:'Cormorant Garamond',serif;font-size:14px;color:#f0e6d0;font-style:italic}

/* RSVP */
.rsvp-wrap{background:rgba(212,114,138,0.05);border:1px solid rgba(212,114,138,0.2);padding:36px 28px;margin-top:28px}
.rsvp-form{display:flex;flex-direction:column;gap:12px;max-width:440px;margin:20px auto 0}
input.ri{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);padding:12px 16px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color 0.2s;width:100%}
input.ri:focus{border-color:var(--rose)}
input.ri::placeholder{color:rgba(138,126,150,0.5)}
.rsvp-btn{background:var(--rose);color:white;border:none;padding:14px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:background 0.15s;width:100%}
.rsvp-btn:hover{background:#b84f68}
.rsvp-btn--ghost{background:transparent;border:1px solid rgba(212,114,138,0.4);color:var(--rose)}
.rsvp-btn--ghost:hover{background:rgba(212,114,138,0.1)}
.rsvp-note{font-size:11px;color:var(--muted);text-align:center;line-height:1.5}.rsvp-err{font-size:12px;color:#ff6b6b;text-align:center;min-height:18px}
.rsvp-ok{display:none;font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-style:italic;color:var(--rose);text-align:center;padding:20px}

/* GALLERY */
.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:24px}
.gallery-item{aspect-ratio:1;background:rgba(201,168,76,0.04);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:2rem;color:rgba(201,168,76,0.25);transition:border-color 0.2s}
.gallery-item:hover{border-color:rgba(201,168,76,0.35)}

/* FOOTER */
footer{text-align:center;padding:40px 20px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
footer .mark{color:var(--gold);font-size:1.3rem;display:block;margin-bottom:8px}
.sep{color:rgba(201,168,76,0.3);margin:0 8px}
</style>
</head>
<body>

<!-- Nav -->
<nav>
  <span class="nav-brand">✦ ${d.brideName} & ${d.groomName}</span>
  <div class="nav-links">
    <a href="#story">Story</a>
    <a href="#invitation">Invitation</a>
    <a href="#events">Events</a>
      </div>
</nav>

<!-- Hero -->
<div class="hero" id="home">
  <div class="hero-particles">
    ${Array(12).fill(0).map((_,i)=>`<div class="p" style="width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;left:${Math.random()*100}%;background:rgba(201,168,76,${0.2+Math.random()*0.4});animation-duration:${8+Math.random()*12}s;animation-delay:${Math.random()*8}s"></div>`).join('')}
  </div>
  <span class="hero-mark">✦ ✦ ✦</span>
  <h1 class="hero-names">
    <span class="bride">${d.brideName}</span>
    <span class="amp">&amp;</span>
    <span class="groom">${d.groomName}</span>
  </h1>
  <div class="hero-sep"></div>
  <p class="hero-date">${dateStr}</p>
  ${d.venue ? `<p class="hero-venue">${d.venue}${d.city?', '+d.city:''}</p>` : ''}
  <span class="scroll-hint">scroll ↓</span>
</div>

<!-- Story -->
<section id="story" style="text-align:left">
  <p class="s-label">Our Story</p>
  <h2 class="s-title">${story.headline}</h2>
  <p class="s-body">${story.story}</p>
  <div class="s-divider"></div>
  <div class="story-quote">"${story.closing}"</div>
</section>

<!-- Invitation Card -->
<section id="invitation" style="text-align:center;padding-top:40px">
  <p class="s-label">The Invitation</p>
  <h2 class="s-title">You are cordially invited</h2>
  <div class="invite-section">
    <span class="ic-divine">ॐ</span>
    <span class="ic-divine-txt">Shri Ganeshaya Namah</span>
    <span class="ic-flourish">❧ ✦ ❧</span>
    <p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(240,220,200,0.6);margin-bottom:14px">With the blessings of our families</p>
    <div class="ic-names">
      <span>${d.brideName}</span>
      <span class="ic-amp">&amp;</span>
      <span class="ic-groom">${d.groomName}</span>
    </div>
    <div class="ic-detail-grid">
      <div class="ic-detail"><span class="ic-detail-lbl">Date</span><span class="ic-detail-val">${dateStr}</span></div>
      <div class="ic-detail"><span class="ic-detail-lbl">Time</span><span class="ic-detail-val">${d.ceremonyTime||'7:00 PM'}</span></div>
      <div class="ic-detail"><span class="ic-detail-lbl">Venue</span><span class="ic-detail-val">${d.venue||'TBD'}</span></div>
      <div class="ic-detail"><span class="ic-detail-lbl">City</span><span class="ic-detail-val">${d.city||''}</span></div>
    </div>
  </div>
</section>

<!-- Gallery -->
<section style="padding-top:40px">
  <p class="s-label">Memories</p>
  <h2 class="s-title">Gallery</h2>
  <p class="s-body" style="margin-bottom:0">Photos will be added soon.</p>
  <div class="gallery">
    ${Array(6).fill(0).map((_,i)=>`<div class="gallery-item">${['💍','🌸','🪔','✦','🌺','💐'][i]}</div>`).join('')}
  </div>
</section>

<!-- Events -->
<section id="events">
  <p class="s-label">Celebrations</p>
  <h2 class="s-title">Join us for these events</h2>
  <div class="events">
    ${events.map(ev=>`<div class="event-card">
      <div>
        <p class="event-name">${ev.name}</p>
        <p class="event-meta">${ev.venue||''}${ev.city?', '+ev.city:''}</p>
      </div>
      <div>
        <span class="event-time-val">${ev.time}</span>
        <span class="event-date-sm">${ev.date}</span>
      </div>
    </div>`).join('')}
  </div>
</section>





<script>
// RSVP removed
</script>
</body>
</html>`;
  }
}

module.exports = new WeddingWebsiteAgent();

