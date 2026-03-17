import { usePlan } from '../context/PlanContext';
import AgentGate from '../components/AgentGate';
import React, { useEffect, useState } from 'react';
import { useOrchestrator } from '../hooks/useOrchestrator';
import axios from 'axios';

const fmt  = n => n ? `Rs ${Math.round(n).toLocaleString('en-IN')}` : 'Rs 0';
const fmtL = n => n >= 100000 ? `Rs ${(n/100000).toFixed(1)}L` : fmt(n);

const PRINT_STYLES = `
@page{margin:15mm 16mm;size:A4}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;color:#1a0a0a;background:white;font-size:13px;line-height:1.6}
.card-section{page-break-before:always;padding:20px 0}
.cover{text-align:center;padding:40px 24px 32px;border-bottom:2px solid #C8667A;margin-bottom:24px}
.logo{font-size:24px;color:#C8667A;letter-spacing:-0.02em;margin-bottom:4px}
.couple{font-size:32px;color:#1a0a0a;margin:10px 0 4px;font-style:italic;font-weight:300}
.sub{font-size:12px;color:#888}
.section{margin-bottom:22px;break-inside:avoid}
.section-title{font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#C8667A;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #f5e8ec}
.picks-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pick-card{border:1px solid #eee;border-radius:8px;padding:12px}
.pick-label{font-size:10px;text-transform:uppercase;color:#aaa;letter-spacing:0.08em;margin-bottom:3px}
.pick-name{font-size:14px;font-weight:600;color:#1a0a0a;margin-bottom:2px}
.pick-price{font-size:12px;color:#666}
.cost-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px}
.cost-total{display:flex;justify-content:space-between;padding:10px 0 0;font-weight:600;font-size:15px;border-top:2px solid #1a0a0a;margin-top:4px}
.tl-row{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #f5f5f5;align-items:flex-start}
.tl-time{font-size:12px;font-weight:600;color:#C8667A;min-width:70px}
.tl-event{font-size:13px;font-weight:500}
.tl-dur{font-size:11px;color:#aaa}
.step{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #f5f5f5;font-size:13px}
.step-num{width:18px;height:18px;border-radius:50%;background:#f5e8ec;color:#C8667A;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0;margin-top:2px}
.summary{font-size:13px;color:#444;line-height:1.7;padding:12px 14px;background:#fdf6f8;border-left:3px solid #C8667A;border-radius:0 8px 8px 0;margin-bottom:18px}
.footer{text-align:center;font-size:11px;color:#bbb;margin-top:28px;padding-top:10px;border-top:1px solid #eee}

.card-embed{
  background:linear-gradient(160deg,#140a10,#1e0f18,#140a10);
  border:1px solid rgba(184,150,62,0.7);
  padding:28px 24px;text-align:center;color:#f0e6d0;
  break-inside:avoid;margin-bottom:20px;position:relative;
}
.card-embed::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(184,150,62,0.5),transparent)}
.card-embed::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(184,150,62,0.5),transparent)}
.ce-divine{font-size:28px;color:#B8963E;display:block;margin-bottom:6px}
.ce-small{font-size:10px;color:rgba(184,150,62,0.7);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:14px}
.ce-flourish{color:rgba(184,150,62,0.5);font-size:12px;letter-spacing:5px;margin:10px 0}
.ce-names{font-size:28px;font-weight:300;font-style:italic;color:#e8c4b8;line-height:1.2;margin-bottom:4px}
.ce-amp{font-size:22px;color:rgba(184,150,62,0.8);display:block;margin:4px 0}
.ce-groom{font-size:28px;font-weight:300;color:#f5e6d0}
.ce-detail-box{border:1px solid rgba(184,150,62,0.3);padding:12px 16px;margin-top:14px;text-align:left}
.ce-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(184,150,62,0.1);font-size:13px}
.ce-row:last-child{border-bottom:none}
.ce-lbl{color:rgba(184,150,62,0.6);font-size:10px;text-transform:uppercase;letter-spacing:0.1em}
.ce-val{color:#f0e6d0;font-style:italic}
`;

function generateHTML(plan, cardHtml, selectionsOverride) {
  const p = plan;
  const picks = [
    { label:'Venue',        data: selectionsOverride?.venue        || p.picks.venue        },
    { label:'Caterer',      data: selectionsOverride?.caterer      || p.picks.caterer      },
    { label:'Photographer', data: selectionsOverride?.photographer || p.picks.photographer },
    { label:'Decorator',    data: selectionsOverride?.decorator    || p.picks.decorator    },
    { label:'DJ / Music',   data: selectionsOverride?.dj           || p.picks.dj           },
  ].filter(pk => pk.data);

  const dateStr = p.brief.weddingDate
    ? new Date(p.brief.weddingDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    : 'Date TBD';

  const cardEmbed = cardHtml ? `
<div class="card-section">
  <div class="section-title" style="color:#C8667A">Wedding Invitation Card</div>
  ${cardHtml
    .replace(/<html[\s\S]*?<body[^>]*>/i,'')
    .replace(/<\/body>[\s\S]*?<\/html>/i,'')
    .replace(/<head[\s\S]*?<\/head>/i,'')
    .replace(/<!DOCTYPE[^>]*>/i,'')
    .replace(/html,body\{[^}]*\}/g,'')
    .replace(/body\{[^}]*\}/g,'')
  }
</div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HeartBound IQ Wedding Plan</title>
<style>${PRINT_STYLES}</style></head><body>
<div class="cover">
  <div class="logo">HeartBound IQ</div>
  <div class="couple">${p.brief.brideName} & ${p.brief.groomName}</div>
  <div class="sub">${p.brief.city} | ${dateStr} | ${p.brief.guestCount} guests</div>
  <div class="sub" style="margin-top:6px">Generated by HeartBound IQ AI Wedding Planner</div>
</div>

${p.masterSummary ? `<div class="summary">${p.masterSummary}</div>` : ''}

<div class="section">
  <div class="section-title">Top vendor picks</div>
  <div class="picks-grid">${picks.map(pk => `<div class="pick-card">
    <div class="pick-label">${pk.label}</div>
    <div class="pick-name">${pk.data.name}</div>
    <div class="pick-price">${pk.data.priceRange||''} | Score: ${pk.data.aiScore}/100</div>
  </div>`).join('')}</div>
</div>

<div class="section">
  <div class="section-title">Cost breakdown</div>
  ${[['Venue',p.costs.venue],['Catering',p.costs.catering],['Photography',p.costs.photo],['Decoration',p.costs.decor],['DJ / Music',p.costs.dj],['Miscellaneous',p.costs.misc]].filter(r=>r[1]).map(r=>`<div class="cost-row"><span>${r[0]}</span><span>${fmtL(r[1])}</span></div>`).join('')}
  <div class="cost-total"><span>Total estimate</span><span>${fmtL(p.costs.total)}</span></div>
</div>

${(p.timeline||[]).length ? `<div class="section"><div class="section-title">Day-of timeline</div>${p.timeline.map(ev=>`<div class="tl-row"><span class="tl-time">${ev.time}</span><div><div class="tl-event">${ev.event}</div><div class="tl-dur">${ev.duration} | ${ev.assignedTo}</div></div></div>`).join('')}</div>` : ''}



${cardEmbed}

<div class="footer">Generated by HeartBound IQ AI Wedding Planner | vowiq.app</div>
</body></html>`;
}

export default function ExportPlan() {
  const {
    hasPlan, allConfirmed, cardFinalized, cardHtml, selections,
    pdfHtml, pdfFinalized, pdfFinalizedAt, pdfDownloadedAt, pdfGeneratedAt,
    setPdfHtml, setPdfFinalized, setPdfDownloadedAt, refresh,
  } = usePlan();

  if (!hasPlan) return <AgentGate agentName="Export PDF" icon="" />;
  if (!allConfirmed) return <AgentGate agentName="Export PDF" icon="" reason="not-confirmed" />;
  if (!cardFinalized) {
    return (
      <>
        <div className="page-header">
          <p className="page-header__eyebrow">Export</p>
          <h1 className="page-header__title">Export <em>Wedding Plan</em></h1>
          <p className="page-header__sub">Finalize the invitation card to unlock PDF export.</p>
        </div>
        <div className="content">
          <div className="card card--red animate-in" style={{ textAlign:'center', padding:32 }}>
            <p style={{ fontSize:18, fontWeight:500, color:'var(--red)', marginBottom:10 }}>Locked</p>
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
              Finalize your invitation card first.
            </p>
          </div>
        </div>
      </>
    );
  }

  const { plan } = useOrchestrator();
  const [brief, setBrief] = useState({ brideName:'', groomName:'', city:'Ranchi', weddingDate:'', ceremonyTime:'7:00 PM', guestCount:300, totalBudget:2000000, religion:'Hindu', cuisines:[], hasBaraat:true, hasMehendi:true, hasSangeet:true, hasHaldi:false });
  const [exported, setExported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatStamp = (value) => {
    if (!value) return 'Not yet';
    const d = new Date(value);
    return d.toLocaleString('en-IN', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  useEffect(() => {
    axios.get('/api/export')
      .then(({ data }) => {
        if (data.pdfHtml) setPdfHtml(data.pdfHtml);
        if (data.pdfFinalized !== undefined) setPdfFinalized(!!data.pdfFinalized);
        if (data.pdfDownloadedAt) setPdfDownloadedAt(data.pdfDownloadedAt);
      })
      .catch(()=>{});
  }, [setPdfHtml, setPdfFinalized, setPdfDownloadedAt]);

  const setB = k => e => setBrief(b => ({ ...b, [k]: e.target.value }));
  const totalFmt = v => { const n=parseInt(v); return n>=100000?`Rs ${(n/100000).toFixed(1)}L`:fmt(n); };

  const handleGenerate = async () => {
    if (!plan) return;
    setLoading(true); setError('');
    try {
      const html = generateHTML(plan, cardHtml || '', selections || {});
      const { data } = await axios.post('/api/export/save', { html });
      setPdfHtml(data.pdfHtml);
      setPdfFinalized(false);
      setExported(true);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not generate PDF preview.');
    } finally { setLoading(false); }
  };

  const handleDownload = async () => {
    if (!pdfHtml) return;
    const blob = new Blob([pdfHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HeartBound IQ-${plan?.brief?.brideName || 'Wedding'}-Plan.html`;
    a.click();
    URL.revokeObjectURL(url);
    await axios.post('/api/export/mark-downloaded');
    setPdfDownloadedAt(new Date().toISOString());
  };

  const handleFinalize = async () => {
    setLoading(true); setError('');
    try {
      await axios.post('/api/export/finalize');
      setPdfFinalized(true);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not finalize PDF.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Export</p>
        <h1 className="page-header__title">Export <em>Wedding Plan</em></h1>
        <p className="page-header__sub">Generate a PDF preview, download it, then finalize to unlock the wedding website.</p>
      </div>

      <div className="content">
        {!plan ? (
          <>
            <div className="card card--gold animate-in" style={{ marginBottom:20 }}>
              <p style={{ fontSize:14, color:'var(--gold)', lineHeight:1.6 }}>Fill in your details and generate a plan. The Orchestrator runs all agents, then you can export everything as a PDF.</p>
            </div>
            <div className="card" style={{ marginBottom:16 }}>
              <div className="form-grid" style={{ marginBottom:14 }}>
                <div className="field"><label className="label">Bride's name *</label><input className="input" value={brief.brideName} onChange={setB('brideName')} placeholder="e.g. Priya Sharma" /></div>
                <div className="field"><label className="label">Groom's name *</label><input className="input" value={brief.groomName} onChange={setB('groomName')} placeholder="e.g. Arjun Mehta" /></div>
                <div className="field"><label className="label">City *</label><input className="input" value={brief.city} onChange={setB('city')} placeholder="e.g. Ranchi" /></div>
                <div className="field"><label className="label">Wedding date</label><input className="input" type="date" value={brief.weddingDate} onChange={setB('weddingDate')} /></div>
                <div className="field"><label className="label">Guest count *</label><input className="input" type="number" value={brief.guestCount} onChange={setB('guestCount')} /></div>
                <div className="field">
                  <label className="label" style={{ display:'flex', justifyContent:'space-between' }}>
                    Budget <span style={{ color:'var(--rose)', fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:300, textTransform:'none', letterSpacing:0 }}>{totalFmt(brief.totalBudget)}</span>
                  </label>
                  <input className="input input--range" type="range" min="500000" max="20000000" step="100000" value={brief.totalBudget} onChange={setB('totalBudget')} />
                </div>
              </div>
              {error && <div className="error-box" style={{ marginBottom:12 }}>{error}</div>}
              <button className="btn btn--primary btn--full btn--lg" onClick={() => {}} disabled={!brief.brideName||!brief.groomName}>
                Generate Plan from Full Plan tab
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="card card--green animate-in" style={{ marginBottom:16 }}>
              <p style={{ fontSize:14, fontWeight:500, color:'var(--green)' }}>Plan ready: {plan.brief.brideName} & {plan.brief.groomName} | {plan.brief.city} | {plan.brief.guestCount} guests</p>
            </div>

            {error && <div className="error-box" style={{ marginBottom:12 }}>{error}</div>}

            <button className="btn btn--primary btn--full" style={{ marginBottom:12 }} onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating preview...' : pdfHtml ? 'Regenerate PDF Preview' : 'Generate PDF Preview'}
            </button>

            {pdfHtml && (
              <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:12 }}>
                <div style={{ padding:'10px 16px', fontSize:11, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>PDF Preview</span>
                  <span className={`badge ${pdfFinalized ? 'badge--green' : 'badge--amber'}`}>{pdfFinalized ? 'Finalized' : 'Not final'}</span>
                </div>
                <iframe title="PDF Preview" srcDoc={pdfHtml}
                  style={{ width:'100%', height:700, border:'none', display:'block' }}
                  sandbox="allow-same-origin" />
              </div>
            )}

            <div className="card" style={{ marginBottom:12, padding:'12px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div>
                  <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Generated</p>
                  <p style={{ fontSize:13, color:'var(--text-primary)' }}>{formatStamp(pdfGeneratedAt)}</p>
                </div>
                <div>
                  <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Downloaded</p>
                  <p style={{ fontSize:13, color:'var(--text-primary)' }}>{formatStamp(pdfDownloadedAt)}</p>
                </div>
                <div>
                  <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Finalized</p>
                  <p style={{ fontSize:13, color:'var(--text-primary)' }}>{formatStamp(pdfFinalizedAt)}</p>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn btn--dark" style={{ flex:1, minWidth:140, height:42 }} onClick={handleDownload} disabled={!pdfHtml}>
                Download PDF
              </button>
              <button className="btn btn--primary" style={{ flex:1, minWidth:140, height:42 }} onClick={handleFinalize} disabled={!pdfDownloadedAt || pdfFinalized || loading}>
                {pdfFinalized ? 'PDF Finalized' : 'Finalize PDF'}
              </button>
            </div>

            {!pdfDownloadedAt && pdfHtml && (
              <div className="card card--gold" style={{ marginTop:14 }}>
                <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
                  Download the PDF once to enable finalization.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
