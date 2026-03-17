import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { useDashboard } from '../hooks/useDashboard';
import axios from 'axios';

const fmt  = n => n ? `Rs ${Math.round(n).toLocaleString('en-IN')}` : 'Rs 0';
const fmtL = n => n >= 100000 ? `Rs ${(n/100000).toFixed(1)}L` : fmt(n);

function countdown(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return { days:0, label:'Today is the day!' };
  const days = Math.ceil(diff / (1000*60*60*24));
  if (days === 1) return { days, label:'1 day to go!' };
  if (days <= 30)  return { days, label:`${days} days to go` };
  if (days <= 365) return { days, label:`${Math.round(days/7)} weeks to go` };
  return { days, label:`${Math.floor(days/30)} months to go` };
}

function RingChart({ value, max, color, size=78, stroke=7 }) {
  const pct  = max > 0 ? Math.min(value/max,1) : 0;
  const r    = (size-stroke)/2;
  const circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
        style={{ transition:'stroke-dashoffset 0.8s ease' }}/>
    </svg>
  );
}

const STEPS = [
  { key:'venue',        label:'Venue',        page:'venue'    },
  { key:'caterer',      label:'Caterer',      page:'catering' },
  { key:'photographer', label:'Photographer', page:'vendors'  },
  { key:'decorator',    label:'Decorator',    page:'vendors'  },
  { key:'dj',           label:'DJ / Music',   page:'vendors'  },
];

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const {
    plan, hasPlan, wedding: planWedding,
    confirmed, allConfirmed, selections,
    websiteUrl, allInvitesSentAt,
    setAllInvitesSentAt, setWebsiteUrl,
  } = usePlan();
  const { stats, load } = useDashboard();

  const w = { ...(user?.wedding||{}), ...(planWedding||{}), ...(plan?.brief||{}) };
  const cd = countdown(w.weddingDate);
  const g = stats?.guests   || {};
  const b = stats?.budget   || {};
  const t = stats?.timeline || {};
  const confirmedCount = STEPS.filter(s => confirmed?.[s.key]).length;
  const showBudget = (b.totalBudget||0) > 0 || confirmedCount > 0;
  const timelinePct = t.total ? Math.round((t.completed||0)/(t.total||1)*100) : 0;

  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [showInvConf, setShowInvConf] = useState(false);
  const [guestCount, setGuestCount] = useState(0);

  const [showWebUrl, setShowWebUrl] = useState(false);
  const [webUrlInput, setWebUrlInput] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  useEffect(() => { load(); }, [load, confirmed]);
  useEffect(() => {
    if (hasPlan) {
      axios.get('/api/guests').then(({ data }) => setGuestCount(data.guests?.length||0)).catch(()=>{});
    }
  }, [hasPlan]);

  const dateStr = w.weddingDate
    ? new Date(w.weddingDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
    : null;

  const handleSaveWebsiteUrl = async () => {
    if (!webUrlInput.trim()) return;
    setSavingUrl(true);
    try {
      await axios.put('/api/orchestrate/website-url', { url: webUrlInput.trim() });
      setWebsiteUrl(webUrlInput.trim());
      setShowWebUrl(false);
    } finally { setSavingUrl(false); }
  };

  const handleInviteAll = async () => {
    setInviting(true); setInviteResult(null);
    try {
      const { data } = await axios.post('/api/orchestrate/invite-all', {});
      setInviteResult(data);
      setAllInvitesSentAt(new Date().toISOString());
      setShowInvConf(false);
    } catch (e) {
      setInviteResult({ error: e.response?.data?.error || 'Error sending invites' });
    } finally { setInviting(false); }
  };

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Home</p>
        <h1 className="page-header__title">
          {w.brideName && w.groomName
            ? <><em>{w.brideName}</em> & <em>{w.groomName}</em></>
            : <>Your <em>Wedding</em> Dashboard</>}
        </h1>
        <p className="page-header__sub">
          {w.city && dateStr ? `${w.city} | ${dateStr} | ${w.guestCount||''} guests` : 'Run the Full Plan to populate your dashboard.'}
        </p>
      </div>

      <div className="content">
        {!hasPlan && (
          <div className="card card--gold animate-in" style={{ marginBottom:20, textAlign:'center', padding:32 }}>
            <p style={{ fontSize:16, fontWeight:500, color:'var(--gold)', marginBottom:8 }}>Start your wedding plan</p>
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.8, marginBottom:20 }}>
              Go to Full Plan to enter your wedding brief. HeartBound IQ fetches real venues and vendors from Google Maps, scores them with Groq AI, and builds your complete plan.
            </p>
            {onNavigate && (
              <button className="btn btn--primary" style={{ height:44, fontSize:14, padding:'0 28px' }} onClick={() => onNavigate('orchestrator')}>
                Generate My Wedding Plan
              </button>
            )}
          </div>
        )}

        {cd && hasPlan && (
          <div className="card animate-in" style={{ marginBottom:14, background:'linear-gradient(135deg,var(--bg-card),var(--bg-elevated))', border:'1px solid var(--border-rose)', textAlign:'center', padding:'24px 20px' }}>
            <p style={{ fontSize:10, color:'var(--rose)', textTransform:'uppercase', letterSpacing:'0.18em', marginBottom:6 }}>Wedding countdown</p>
            <p style={{ fontFamily:'var(--font-display)', fontSize:'4.5rem', fontWeight:300, color:'var(--text-primary)', lineHeight:1, marginBottom:4 }}>{cd.days}</p>
            <p style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontStyle:'italic', color:'var(--rose)' }}>{cd.label}</p>
            {dateStr && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>{dateStr}</p>}
          </div>
        )}

        {hasPlan && (
          <>
            {showBudget && b.totalBudget > 0 && (
              <div className="card" style={{ marginBottom:12, display:'flex', gap:12, alignItems:'stretch' }}>
                <div style={{ flex:1, padding:'12px 14px', borderRadius:'var(--r-sm)', background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                  <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Expected total</p>
                  <p style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:300, color:'var(--rose)' }}>{fmtL(b.spent||0)}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>{b.pctUsed||0}% of {fmtL(b.totalBudget)} planned</p>
                </div>
                <div style={{ flex:1, padding:'12px 14px', borderRadius:'var(--r-sm)', background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                  <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Paid so far</p>
                  <p style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:300, color:'var(--green)' }}>{fmtL(b.paid||0)}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtL(Math.max((b.spent||0)-(b.paid||0),0))} due</p>
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns: showBudget ? '1fr 1fr 1fr' : '1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                { label:'Guests',   val:g.confirmed||0, max:g.total||1,   color:'var(--purple)', sub:`${g.total||0} total`     },
                ...(showBudget ? [{ label:'Expected',   val:b.spent||0,     max:b.totalBudget||1, color:b.pctUsed>90?'var(--red)':'var(--rose)', sub:`${b.pctUsed||0}% planned` }] : []),
                { label:'Timeline', val:t.completed||0, max:t.total||1,   color:'var(--purple)', sub:`${t.total||0} events`    },
              ].map(s => (
                <div className="card" key={s.label} style={{ textAlign:'center', padding:'16px 10px' }}>
                  <div style={{ position:'relative', display:'inline-block', marginBottom:6 }}>
                    <RingChart value={s.val} max={s.max} color={s.color} />
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:300, color:'var(--text-primary)', lineHeight:1 }}>{s.val}</span>
                    </div>
                  </div>
                  <p style={{ fontSize:12, fontWeight:500, marginBottom:1 }}>{s.label}</p>
                  <p style={{ fontSize:10, color:'var(--text-muted)' }}>{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom:14, border: allConfirmed ? '1px solid rgba(63,207,142,0.4)' : '1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div>
                  <p style={{ fontSize:11, color: allConfirmed?'var(--green)':'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>
                    {allConfirmed ? 'All vendors confirmed' : 'Vendor confirmation checklist'}
                  </p>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>
                    {allConfirmed ? 'Export PDF, Website and bulk invites are now unlocked.' : `${confirmedCount}/5 confirmed - confirm all to unlock export and website.`}
                  </p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:300, color: allConfirmed?'var(--green)':'var(--amber)', lineHeight:1 }}>{confirmedCount}/5</span>
                </div>
              </div>

              {STEPS.map(step => {
                const sel  = selections?.[step.key];
                const done = !!confirmed?.[step.key];
                return (
                  <div key={step.key}
                    onClick={() => !done && onNavigate && onNavigate(step.page)}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 12px', borderRadius:'var(--r-sm)', marginBottom:6,
                      background: done ? 'var(--green-dim)' : 'var(--bg-elevated)',
                      border: `1px solid ${done ? 'rgba(63,207,142,0.3)' : 'var(--border)'}`,
                      cursor: done ? 'default' : 'pointer',
                      transition:'all 0.15s',
                    }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:500, color: done?'var(--green)':'var(--text-primary)', marginBottom:sel?2:0 }}>
                        {step.label}
                      </p>
                      {sel && (
                        <p style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {sel.name}
                          {sel.phone || sel.contact ? ` | ${sel.phone || sel.contact}` : ''}
                        </p>
                      )}
                    </div>
                    {done
                      ? <span style={{ fontSize:11, color:'var(--green)', flexShrink:0 }}>Done</span>
                      : sel
                        ? <span style={{ fontSize:11, color:'var(--amber)', flexShrink:0, whiteSpace:'nowrap' }}>Pending</span>
                        : <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0, whiteSpace:'nowrap' }}>Not selected</span>
                    }
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ marginBottom:14 }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                Wedding tools {allConfirmed ? '- all unlocked' : '- locked until all confirmed'}
              </p>

              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:'var(--r-sm)', marginBottom:8, background:'var(--bg-elevated)', border:`1px solid ${allConfirmed ? 'rgba(63,207,142,0.3)' : 'var(--border)'}`, cursor: allConfirmed?'pointer':'not-allowed', opacity: allConfirmed?1:0.5 }}
                onClick={() => allConfirmed && onNavigate && onNavigate('export')}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:500 }}>Export Wedding Plan PDF</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>{allConfirmed ? 'Click to download your complete wedding plan' : 'Confirm all vendors to unlock'}</p>
                </div>
                {allConfirmed ? <span style={{ fontSize:11, color:'var(--green)' }}>Open</span> : <span style={{ fontSize:11, color:'var(--text-muted)' }}>Locked</span>}
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:'var(--r-sm)', marginBottom:8, background:'var(--bg-elevated)', border:`1px solid ${allConfirmed ? 'rgba(63,207,142,0.3)' : 'var(--border)'}`, opacity: allConfirmed?1:0.5 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:500 }}>Wedding Website</p>
                  {!allConfirmed
                    ? <p style={{ fontSize:11, color:'var(--text-muted)' }}>Confirm all vendors to unlock</p>
                    : websiteUrl
                      ? <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'var(--rose)', textDecoration:'none' }}>{websiteUrl}</a>
                      : <p style={{ fontSize:11, color:'var(--text-muted)' }}>Generate and host, then paste the link below</p>
                  }
                </div>
                {allConfirmed && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => onNavigate && onNavigate('website')}
                      style={{ background:'var(--rose-dim)', border:'1px solid var(--rose-border)', borderRadius:'var(--r-sm)', padding:'4px 10px', fontSize:11, color:'var(--rose)', cursor:'pointer', fontFamily:'var(--font-b)' }}>
                      Build
                    </button>
                    {!websiteUrl && (
                      <button onClick={() => setShowWebUrl(v => !v)}
                        style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'4px 10px', fontSize:11, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font-b)' }}>
                        Add URL
                      </button>
                    )}
                    {websiteUrl && (
                      <button onClick={() => setShowWebUrl(v => !v)}
                        style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'4px 10px', fontSize:11, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font-b)' }}>
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>

              {showWebUrl && allConfirmed && (
                <div style={{ display:'flex', gap:8, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:'var(--r-sm)', marginBottom:8, border:'1px solid var(--border-mid)' }}>
                  <input className="input" value={webUrlInput} onChange={e => setWebUrlInput(e.target.value)}
                    placeholder="https://priya-arjun-wedding.netlify.app" style={{ flex:1, height:36, fontSize:12 }} />
                  <button className="btn btn--primary" style={{ height:36, fontSize:12, whiteSpace:'nowrap', padding:'0 14px' }}
                    onClick={handleSaveWebsiteUrl} disabled={savingUrl}>
                    {savingUrl ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:'var(--r-sm)', marginBottom:8, background:'var(--bg-elevated)', border:`1px solid ${allConfirmed ? 'rgba(63,207,142,0.3)' : 'var(--border)'}`, cursor: allConfirmed?'pointer':'not-allowed', opacity: allConfirmed?1:0.5 }}
                onClick={() => allConfirmed && onNavigate && onNavigate('card')}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:500 }}>Invitation Card</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>{allConfirmed ? '10 designs to choose from' : 'Confirm all vendors to unlock'}</p>
                </div>
                {allConfirmed ? <span style={{ fontSize:11, color:'var(--green)' }}>Open</span> : <span style={{ fontSize:11, color:'var(--text-muted)' }}>Locked</span>}
              </div>

              {allConfirmed && (
                <>
                  <div style={{ height:1, background:'var(--border)', margin:'12px 0' }}/>
                  <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                    Final step - send invitations
                  </p>

                  {allInvitesSentAt ? (
                    <div style={{ background:'var(--green-dim)', border:'1px solid rgba(63,207,142,0.35)', borderRadius:'var(--r-sm)', padding:'12px 14px' }}>
                      <p style={{ fontSize:13, fontWeight:500, color:'var(--green)', marginBottom:3 }}>Invitations sent</p>
                      <p style={{ fontSize:12, color:'var(--text-muted)' }}>
                        Sent on {new Date(allInvitesSentAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ background:'var(--rose-dim)', border:'1px solid var(--rose-border)', borderRadius:'var(--r-sm)', padding:'12px 14px', marginBottom:10 }}>
                        <p style={{ fontSize:13, fontWeight:500, color:'var(--rose)', marginBottom:4 }}>Invite all guests</p>
                        <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>
                          Sends a personalised invitation email to each guest with wedding card and wedding details.
                          {websiteUrl ? <> Includes your wedding website link.</> : ''}
                        </p>
                        <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                          {guestCount} guest{guestCount!==1?'s':''} in your list
                        </p>
                      </div>

                      {!showInvConf ? (
                        <button
                          onClick={() => { if (guestCount === 0) return; setShowInvConf(true); }}
                          disabled={guestCount === 0}
                          className="btn btn--primary btn--full"
                          style={{ height:48, fontSize:14 }}>
                          {guestCount === 0
                            ? 'Add guests first (Guest Manager)'
                            : `Send Invitations to All ${guestCount} Guests`}
                        </button>
                      ) : (
                        <div className="card animate-in" style={{ border:'1px solid var(--rose-border)', padding:'16px 18px' }}>
                          <p style={{ fontSize:15, fontWeight:500, marginBottom:8 }}>Confirm sending invitations</p>
                          <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:16 }}>
                            You have <strong style={{ color:'var(--rose)' }}>{guestCount} guest{guestCount!==1?'s':''}</strong> in your list. Each will receive a personalised email with your wedding invitation card and all wedding details
                            {websiteUrl ? ', and a link to your wedding website' : ''}.
                          </p>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={handleInviteAll} disabled={inviting}
                              className="btn btn--primary" style={{ flex:1, height:44 }}>
                              {inviting ? <><span className="spinner"/>Sending...</> : `Yes, invite all ${guestCount} guests`}
                            </button>
                            <button onClick={() => setShowInvConf(false)}
                              className="btn btn--dark" style={{ height:44, padding:'0 18px' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {inviteResult && (
                        <div className={`card animate-in ${inviteResult.error ? 'card--red' : 'card--green'}`} style={{ marginTop:10 }}>
                          {inviteResult.error
                            ? <p style={{ fontSize:13, color:'var(--red)' }}>{inviteResult.error}</p>
                            : inviteResult.previewMode
                              ? <><p style={{ fontSize:13, fontWeight:500, color:'var(--gold)', marginBottom:4 }}>Preview mode</p>
                                  <p style={{ fontSize:12, color:'var(--text-secondary)' }}>{inviteResult.message}</p></>
                              : <><p style={{ fontSize:13, fontWeight:500, color:'var(--green)', marginBottom:4 }}>{inviteResult.sent} invitation{inviteResult.sent!==1?'s':''} sent</p>
                                  {inviteResult.failed > 0 && <p style={{ fontSize:12, color:'var(--red)' }}>{inviteResult.failed} failed.</p>}</>
                          }
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {showBudget && b.totalBudget > 0 && (
              <div className="card" style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Expected budget</span>
                  <span style={{ fontSize:12, fontWeight:500 }}>{fmtL(b.spent||0)} expected of {fmtL(b.totalBudget)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Paid so far</span>
                  <span style={{ fontSize:12, fontWeight:500 }}>{fmtL(b.paid||0)}</span>
                </div>
                <div style={{ background:'var(--bg-elevated)', borderRadius:4, height:5, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:4, background:b.pctUsed>90?'var(--red)':'var(--rose)', width:`${Math.min(100,b.pctUsed||0)}%`, transition:'width 0.8s ease' }}/>
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Invites sent',  val:g.invited||0,  sub:`of ${g.total||0} guests`, c:'var(--rose)'   },
                { label:'RSVP confirmed',val:g.confirmed||0,sub:'guests confirmed',          c:'var(--green)'  },
                ...(showBudget ? [{ label:'Remaining',     val:fmtL(Math.max(b.remaining||0,0)), sub:b.remaining<0?'over budget':'budget left', c:b.remaining<0?'var(--red)':'var(--green)' },
                { label:'Paid',          val:fmtL(b.paid||0), sub:'paid so far', c:'var(--green)' }] : []),
                { label:'Timeline',      val:`${timelinePct}%`, sub:'events done', c:'var(--purple)' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding:'12px 14px' }}>
                  <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{s.label}</p>
                  <p style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:300, color:s.c, lineHeight:1, marginBottom:2 }}>{s.val}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
