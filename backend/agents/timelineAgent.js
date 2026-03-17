/**
 * HeartBound IQ — Timeline Agent v3 — Groq → Anthropic → fallback
 */
const axios = require('axios');

class TimelineAgent {
  constructor() {
    this.name         = 'TimelineAgent';
    this.groqKey      = process.env.GROQ_API_KEY;
    this.groqModel    = process.env.GROQ_MODEL || 'llama3-70b-8192';
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  async generate(brief) {
    console.log(`[${this.name}] Generating timeline for ${brief.brideName} & ${brief.groomName}…`);
    try {
      const events = await this.buildSchedule(brief);
      const tips   = this.vendorTips(brief);
      return { success:true, events, tips, agentNote:`Generated a ${events.length}-event timeline for ${brief.brideName} & ${brief.groomName}'s wedding.` };
    } catch (err) {
      console.error(`[${this.name}] Error:`, err.message);
      return { success:false, error:err.message, events:[], tips:[] };
    }
  }

  async buildSchedule(brief) {
    const useLLM = (this.groqKey && this.groqKey !== 'your_groq_api_key_here') ||
                   (this.anthropicKey && this.anthropicKey !== 'your_anthropic_api_key_here');
    if (!useLLM) return this.fallbackSchedule(brief);

    const prompt = `Build a complete Indian wedding day schedule as JSON array.

Wedding: ${brief.brideName} & ${brief.groomName}, ceremony at ${brief.ceremonyTime||'7:00 PM'}, venue: ${brief.venue||'TBD'}, ${brief.city}, religion: ${brief.religion||'Hindu'}, ${brief.guestCount} guests
Events: ${[brief.hasHaldi&&'Haldi',brief.hasMehendi&&'Mehendi',brief.hasSangeet&&'Sangeet',brief.hasBaraat&&'Baraat','Main Ceremony','Reception'].filter(Boolean).join(', ')}
Vendors: Photographer(${brief.photographerName||'TBD'}), Caterer(${brief.catererName||'TBD'}), Decorator(${brief.decoratorName||'TBD'})

Return ONLY a JSON array of 14-18 events:
[{"id":1,"time":"HH:MM AM/PM","duration":"X min","event":"name","description":"1-2 sentences","category":"prep|ceremony|vendor|food|celebration|buffer","assignedTo":"Bride/Groom/Both/Vendor","priority":"high|medium|low"}]`;

    try {
      let text;
      if (this.groqKey && this.groqKey !== 'your_groq_api_key_here') {
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model:this.groqModel, messages:[{role:'user',content:prompt}], max_tokens:2000, temperature:0.3,
        }, { headers:{'Authorization':`Bearer ${this.groqKey}`,'Content-Type':'application/json'}, timeout:30000 });
        text = res.data.choices[0].message.content;
      } else {
        const res = await axios.post('https://api.anthropic.com/v1/messages', {
          model:'claude-sonnet-4-20250514', max_tokens:2000, messages:[{role:'user',content:prompt}],
        }, { headers:{'x-api-key':this.anthropicKey,'anthropic-version':'2023-06-01','Content-Type':'application/json'}, timeout:30000 });
        text = res.data.content[0].text;
      }
      const parsed = JSON.parse(text.match(/\[[\s\S]*\]/)[0]);
      return parsed.map((e,i) => ({ ...e, id:i+1, completed:false }));
    } catch (e) {
      console.log(`[${this.name}] LLM error, using fallback: ${e.message}`);
      return this.fallbackSchedule(brief);
    }
  }

  fallbackSchedule(brief) {
    const ct  = brief.ceremonyTime || '7:00 PM';
    const [ts, mer] = ct.split(' ');
    const [h, m]    = ts.split(':').map(Number);
    const base      = (mer==='PM'&&h!==12?h+12:h)*60+(m||0);
    const toTime    = (off) => { const t=base+off, hh=Math.floor(t/60)%24, mm=t%60, ap=hh>=12?'PM':'AM', h12=hh%12||12; return `${h12}:${mm.toString().padStart(2,'0')} ${ap}`; };
    const events = []; let id=1;
    const add=(off,dur,event,desc,cat,who,pri='medium')=>events.push({id:id++,time:toTime(off),duration:dur,event,description:desc,category:cat,assignedTo:who,priority:pri,completed:false});

    add(-480,'60 min',"Bride's hair & makeup begins","Bridal team assembles. Photographer arrives to capture getting-ready moments.",'prep','Bride','high');
    add(-420,'30 min','Groom gets ready','Groom and family dress up. Sherwani/suit fitting check.','prep','Groom','medium');
    add(-390,'30 min','Decorator final setup','Decorator completes stage, mandap, and entrance decor.','vendor','Decorator','high');
    add(-360,'45 min','Caterer kitchen setup','Catering team sets up live counters, starters, beverage stations.','vendor','Caterer','high');
    if (brief.hasHaldi) add(-300,'60 min','Haldi ceremony','Turmeric paste applied by family members. Fun pre-wedding ritual.','ceremony','Both','medium');
    add(-180,'30 min','Bridal portraits','Photographer captures solo bridal portraits before guests arrive.','prep','Bride','high');
    add(-150,'45 min','Guest arrival & welcome','Guests arrive and are welcomed. Starters and welcome drinks served.','food','Both','medium');
    add(-120,'20 min','Pre-ceremony family photos','Group family portraits with both families.','prep','Both','medium');
    if (brief.hasBaraat) {
      add(-90,'45 min','Baraat procession arrives','Groom arrives with baraat. DJ plays, dhol beats, dancing. Bride\'s family welcomes at entrance.','celebration','Groom','high');
      add(-45,'20 min','Jaimala / Varmala ceremony','Bride and groom exchange flower garlands amidst cheers.','ceremony','Both','high');
    }
    add(0,'90 min','Main ceremony begins',`Pandit starts ${brief.religion||'Hindu'} wedding rituals. Pheras, mangalsutra, and sindoor ceremony.`,'ceremony','Both','high');
    add(90,'30 min','Register signing','Legal documentation signed. Marriage certificate issued.','ceremony','Both','high');
    add(120,'30 min','Couple & family portraits','Formal photography with immediate and extended families.','prep','Both','medium');
    add(150,'30 min','Reception dinner begins','Buffet opens. All live counters operational.','food','Both','high');
    if (brief.hasSangeet) add(180,'60 min','Sangeet & celebrations','Dance performances by family. DJ plays Bollywood hits. Couple\'s first dance.','celebration','Both','medium');
    add(210,'30 min','Cake cutting & sweet moments','Wedding cake cutting. Mithai distributed.','celebration','Both','medium');
    add(240,'30 min','Bidaai / Farewell','Emotional farewell of bride with her family.','ceremony','Bride','high');
    add(270,'30 min','Wrap-up & vendor checkout','Vendors pack up. Final payments settled.','buffer','Both','low');
    return events;
  }

  vendorTips(brief) {
    return [
      `Share this timeline with ${brief.photographerName||'your photographer'} at least 3 days before — they need to plan shot lists for each event.`,
      `${brief.catererName||'Your caterer'} needs the dinner start time confirmed 48 hrs in advance to ensure hot food is ready on time.`,
      'Add 15-minute buffers between all ceremony events — Indian weddings almost always run late.',
      'Assign a dedicated family coordinator (not the couple) to manage vendor arrival check-ins on the wedding day.',
      'Print 5 physical copies of this timeline for the photographer, caterer, decorator, family coordinator, and yourself.',
      'Confirm venue open/close times — many venues have a hard curfew for music at 10 PM.',
    ];
  }
}

module.exports = new TimelineAgent();

