import React, { useState } from 'react';
import { useOrchestrator } from '../hooks/useOrchestrator';
import { useBudget } from '../hooks/useBudget';
import { usePlan } from '../context/PlanContext';

const CUISINES  = ['North Indian','South Indian','Bengali','Jain / Satvik','Multi-cuisine','Continental / Chinese'];
const RELIGIONS = ['Hindu','Muslim','Sikh','Christian','Jain','Buddhist','Civil/Court'];
const fmt  = n => n ? `Rs ${Math.round(n).toLocaleString('en-IN')}` : '-';
const fmtL = n => n >= 100000 ? `Rs ${(n/100000).toFixed(1)}L` : fmt(n);
const scoreColor = s => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--rose)';

const STEPS = [
  { label:'Venue Scout'   },
  { label:'Catering'      },
  { label:'Photography'  },
  { label:'Decoration'   },
  { label:'DJ / Music'   },
  { label:'Timeline'     },
];

function PickCard({ title, pick, cost, onSwitch }) {
  if (!pick) return null;
  return (
    <div className="card" style={{ padding:'16px 18px', border:'1px solid var(--border-rose)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10, color:'var(--rose)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{title} - AI Pick</p>
          <p style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)', marginBottom:2 }}>{pick.name}</p>
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>
            {pick.address || pick.city || ''}
            {pick.phone || pick.contact ? ` | Phone: ${pick.phone || pick.contact}` : ''}
          </p>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
            {pick.priceRange || (pick.pricePerHead ? `Rs ${pick.pricePerHead}/head` : '')}
            {pick.rating ? ` | Rating ${pick.rating} (${pick.reviewCount} reviews)` : ''}
          </p>
        </div>
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <span style={{ display:'block', fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:300, color:scoreColor(pick.aiScore||75), lineHeight:1 }}>{pick.aiScore||'-'}</span>
          <span style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>score</span>
        </div>
      </div>

      {pick.aiJustification && (
        <div style={{ background:'var(--gold-dim)', border:'1px solid rgba(212,168,75,0.2)', borderLeft:'3px solid var(--gold)', borderRadius:'0 6px 6px 0', padding:'8px 12px', marginBottom:10 }}>
          <p style={{ fontSize:10, color:'var(--gold)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>Why AI chose this</p>
          <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>{pick.aiJustification}</p>
        </div>
      )}

      {pick.aiRecommendation && !pick.aiJustification && (
        <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5, marginBottom:10 }}>{pick.aiRecommendation}</p>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid var(--border)' }}>
        <span style={{ fontSize:13, fontWeight:500 }}>{fmtL(cost)}</span>
        {onSwitch && (
          <button className="btn btn--dark" style={{ height:30, fontSize:12, padding:'0 12px' }} onClick={onSwitch}>
            Change
          </button>
        )}
      </div>
    </div>
  );
}

export default function Orchestrator() {
  const { plan, selections, loading, checking, error, elapsed, hasPlan, run, deletePlan } = useOrchestrator();
  const { refresh, confirmed } = usePlan();
  const { summary, load: loadBudget } = useBudget();

  const [brief, setBrief] = useState({
    brideName:'', groomName:'', city:'Ranchi', weddingDate:'',
    ceremonyTime:'7:00 PM', guestCount:300, totalBudget:2000000,
    religion:'Hindu', cuisines:[], hasBaraat:true, hasMehendi:true,
    hasSangeet:true, hasHaldi:false, preferences:'',
  });
  const [tab, setTab] = useState('brief');
  const [step, setStep] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const setB = k => e => setBrief(b => ({ ...b, [k]: e.target.value }));
  const setBool = k => e => setBrief(b => ({ ...b, [k]: e.target.checked }));
  const toggleCuisine = c => setBrief(b => ({ ...b, cuisines: b.cuisines.includes(c) ? b.cuisines.filter(x=>x!==c) : [...b.cuisines, c] }));

  React.useEffect(() => {
    if (!loading) { setStep(0); return; }
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i+1), i * 1600));
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  React.useEffect(() => { if (plan) setTab('plan'); }, [plan]);

  React.useEffect(() => { if (tab === 'plan' && hasPlan) loadBudget(); }, [tab, hasPlan, loadBudget]);

  const handleRun = async () => {
    const result = await run(brief);
    if (result) refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deletePlan();
    refresh();
    setTab('brief');
    setShowConfirm(false);
    setDeleting(false);
  };

  const budgetFmt = v => {
    const n = parseInt(v);
    if (n >= 10000000) return `Rs ${(n/10000000).toFixed(1)}Cr`;
    if (n >= 100000)   return `Rs ${(n/100000).toFixed(1)}L`;
    return `Rs ${n.toLocaleString('en-IN')||0}`;
  };

  const currentPlan = plan || {};
  const picks    = currentPlan.picks    || {};
  const costs    = currentPlan.costs    || {};

  const confirmedCosts = {
    venue: confirmed?.venue ? costs.venue : 0,
    catering: confirmed?.caterer ? costs.catering : 0,
    photo: confirmed?.photographer ? costs.photo : 0,
    decor: confirmed?.decorator ? costs.decor : 0,
    dj: confirmed?.dj ? costs.dj : 0,
  };
  const confirmedTotal = Object.values(confirmedCosts).reduce((a, b) => a + b, 0);

  if (checking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
      <p style={{ color:'var(--text-muted)', fontSize:14 }}>Loading your plan...</p>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Orchestrator - Master Agent</p>
        <h1 className="page-header__title"><em>Full Wedding Plan</em></h1>
        <p className="page-header__sub">Fill one brief. All 6 agents run in parallel using real Google Maps data, scored by Groq AI for maximum quality and minimum cost.</p>
      </div>

      <div className="content">
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[
            { id:'brief', label:'Brief' },
            { id:'plan',  label:'Plan', disabled: !hasPlan },
          ].map(t => (
            <button key={t.id} onClick={() => !t.disabled && setTab(t.id)}
              className={`btn ${tab===t.id ? 'btn--primary' : 'btn--dark'}`}
              style={{ flex:1, fontSize:13, opacity:t.disabled?0.4:1, cursor:t.disabled?'not-allowed':'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'brief' && (
          <div className="animate-in">
            {hasPlan && (
              <div className="card card--green animate-in" style={{ marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontSize:13, color:'var(--green)' }}>You already have a plan. Switch to Plan tab to view it, or generate a new one below.</p>
                <button className="btn btn--dark" style={{ height:34, fontSize:12, whiteSpace:'nowrap' }} onClick={() => setTab('plan')}>View Plan</button>
              </div>
            )}

            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Couple and date</p>
              <div className="form-grid" style={{ marginBottom:16 }}>
                <div className="field"><label className="label">Bride's name *</label><input className="input" value={brief.brideName} onChange={setB('brideName')} placeholder="e.g. Priya Sharma" /></div>
                <div className="field"><label className="label">Groom's name *</label><input className="input" value={brief.groomName} onChange={setB('groomName')} placeholder="e.g. Arjun Mehta" /></div>
                <div className="field"><label className="label">City *</label><input className="input" value={brief.city} onChange={setB('city')} placeholder="e.g. Ranchi" /></div>
                <div className="field"><label className="label">Wedding date</label><input className="input" type="date" value={brief.weddingDate} onChange={setB('weddingDate')} /></div>
                <div className="field"><label className="label">Ceremony time</label><input className="input" value={brief.ceremonyTime} onChange={setB('ceremonyTime')} placeholder="7:00 PM" /></div>
                <div className="field"><label className="label">Guest count *</label><input className="input" type="number" min="50" value={brief.guestCount} onChange={setB('guestCount')} /></div>
                <div className="field">
                  <label className="label">Religion</label>
                  <select className="input" value={brief.religion} onChange={setB('religion')}>
                    {RELIGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label" style={{ display:'flex', justifyContent:'space-between' }}>
                    Total budget <span style={{ color:'var(--rose)', fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:300, textTransform:'none', letterSpacing:0 }}>{budgetFmt(brief.totalBudget)}</span>
                  </label>
                  <input className="input input--range" type="range" min="500000" max="20000000" step="100000" value={brief.totalBudget} onChange={setB('totalBudget')} />
                </div>
              </div>

              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Cuisine preferences</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {CUISINES.map(c => (
                  <button key={c} onClick={() => toggleCuisine(c)}
                    className={`badge ${brief.cuisines.includes(c) ? 'badge--rose' : 'badge--gray'}`}
                    style={{ cursor:'pointer', border:'none', padding:'6px 14px', fontSize:12, fontFamily:'var(--font-body)' }}>
                    {c}
                  </button>
                ))}
              </div>

              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Events</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
                {[
                  ['hasBaraat','Baraat'],
                  ['hasMehendi','Mehendi'],
                  ['hasSangeet','Sangeet'],
                  ['hasHaldi','Haldi'],
                ].map(([k,l]) => (
                  <label key={k} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 14px', borderRadius:'var(--r-sm)', border:`1px solid ${brief[k] ? 'var(--border-rose)' : 'var(--border)'}`, background:brief[k]?'var(--rose-dim)':'var(--bg-elevated)', fontSize:13, color:brief[k]?'var(--rose)':'var(--text-secondary)', fontFamily:'var(--font-body)' }}>
                    <input type="checkbox" checked={brief[k]} onChange={setBool(k)} style={{ accentColor:'var(--rose)', width:14, height:14 }} />
                    {l}
                  </label>
                ))}
              </div>

              {error && <div className="error-box" style={{ marginBottom:12 }}>{error}</div>}

              <button className="btn btn--primary btn--full btn--lg" onClick={handleRun} disabled={loading || !brief.brideName || !brief.groomName || !brief.city || !brief.guestCount}>
                {loading ? <><span className="spinner"/> Running {STEPS[Math.min(step,5)]?.label}...</> : 'Generate Complete Wedding Plan'}
              </button>
            </div>

            {loading && (
              <div className="card animate-in">
                <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Agents running in parallel</p>
                {STEPS.map((s, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background: i < step ? 'var(--green-dim)' : 'var(--bg-elevated)', border:`1px solid ${i < step ? 'rgba(63,207,142,0.4)' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>
                      {i < step ? 'OK' : i === step ? <span className="spinner" style={{ width:10, height:10, borderWidth:1.5 }}/> : '.'}
                    </div>
                    <span style={{ fontSize:13, color: i < step ? 'var(--green)' : i === step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.label}</span>
                    {i < step && <span className="badge badge--green" style={{ marginLeft:'auto', fontSize:10 }}>Done</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'plan' && hasPlan && (
          <div className="animate-in">
            {currentPlan.masterSummary && (
              <div className="card" style={{ marginBottom:16, background:'linear-gradient(135deg,var(--bg-card),var(--bg-elevated))', border:'1px solid var(--border-rose)' }}>
                <p style={{ fontSize:11, color:'var(--rose)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>HeartBound IQ AI Summary</p>
                <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7 }}>{currentPlan.masterSummary}</p>
                {elapsed && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>Generated in {elapsed}s | Data from Google Maps | Scored by Groq AI</p>}
              </div>
            )}

            {costs.total > 0 && (
              <div className="card" style={{ marginBottom:16, padding:'14px 18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:13, color:'var(--text-muted)' }}>Expected total cost</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', fontWeight:300, color: costs.total <= (currentPlan.brief?.totalBudget||Infinity) ? 'var(--green)' : 'var(--red)' }}>{fmtL(costs.total)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Paid so far</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:300, color:'var(--green)' }}>{fmtL(summary?.paid||0)}</span>
                </div>
                {currentPlan.brief?.totalBudget > 0 && (
                  <>
                    <div style={{ background:'var(--bg-elevated)', borderRadius:4, height:6, overflow:'hidden', marginBottom:6 }}>
                      <div style={{ height:'100%', borderRadius:4, background: costs.total <= currentPlan.brief.totalBudget ? 'var(--green)' : 'var(--red)', width:`${Math.min(100, Math.round(costs.total/currentPlan.brief.totalBudget*100))}%`, transition:'width 0.8s ease' }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)' }}>
                      <span>{Math.round(costs.total/currentPlan.brief.totalBudget*100)}% of Rs {(currentPlan.brief.totalBudget/100000).toFixed(1)}L budget</span>
                      <span style={{ color: costs.total <= currentPlan.brief.totalBudget ? 'var(--green)' : 'var(--red)' }}>
                        {costs.total <= currentPlan.brief.totalBudget ? `Rs ${((currentPlan.brief.totalBudget-costs.total)/100000).toFixed(1)}L remaining` : 'Over budget'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>AI-optimised picks (visit agent page to change)</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              <PickCard title="Venue"        pick={picks.venue}        cost={costs.venue}    />
              <PickCard title="Caterer"      pick={picks.caterer}      cost={costs.catering} />
              <PickCard title="Photographer" pick={picks.photographer} cost={costs.photo}    />
              <PickCard title="Decorator"    pick={picks.decorator}    cost={costs.decor}    />
              <PickCard title="DJ / Music"   pick={picks.dj}           cost={costs.dj}       />
            </div>

            {currentPlan.nextSteps?.length > 0 && (
              <div className="card" style={{ marginBottom:20 }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Recommended next steps</p>
                {currentPlan.nextSteps.map((s,i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--rose-dim)', border:'1px solid var(--rose-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, color:'var(--rose)', flexShrink:0, marginTop:1 }}>{i+1}</div>
                    <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>{s}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="card" style={{ marginBottom:20, border:'1px solid rgba(240,96,96,0.2)' }}>
              <p style={{ fontSize:11, color:'var(--red)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Danger zone</p>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>Cancel this wedding plan and start fresh. This will delete all saved data including budget, guests, timeline, and all selections from MongoDB.</p>
              {!showConfirm ? (
                <button className="btn btn--dark" style={{ height:38, fontSize:13, borderColor:'rgba(240,96,96,0.4)', color:'var(--red)' }} onClick={() => setShowConfirm(true)}>
                  Cancel and Reset Wedding Plan
                </button>
              ) : (
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn--dark" style={{ flex:1, height:38, fontSize:13, background:'var(--red)', color:'white', border:'none' }} onClick={handleDelete} disabled={deleting}>
                    {deleting ? <><span className="spinner"/> Deleting...</> : 'Yes, delete everything'}
                  </button>
                  <button className="btn btn--dark" style={{ height:38, fontSize:13 }} onClick={() => setShowConfirm(false)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
