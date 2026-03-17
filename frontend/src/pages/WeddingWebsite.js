import { usePlan } from '../context/PlanContext';
import AgentGate from '../components/AgentGate';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function WeddingWebsite() {
  const {
    hasPlan, allConfirmed, pdfFinalized, wedding, selections,
    websiteHtml, websiteData, websiteFinalized, websiteFinalizedAt, websiteGeneratedAt,
    setWebsiteHtml, setWebsiteData, setWebsiteFinalized,
    refresh,
  } = usePlan();

  if (!hasPlan) return <AgentGate agentName="Wedding Website" icon="" />;
  if (!allConfirmed) return <AgentGate agentName="Wedding Website" icon="" reason="not-confirmed" />;
  if (!pdfFinalized) {
    return (
      <>
        <div className="page-header">
          <p className="page-header__eyebrow">Wedding Website</p>
          <h1 className="page-header__title">Website <em>Generator</em></h1>
          <p className="page-header__sub">Finalize the exported PDF to unlock the website.</p>
        </div>
        <div className="content">
          <div className="card card--red animate-in" style={{ textAlign:'center', padding:32 }}>
            <p style={{ fontSize:18, fontWeight:500, color:'var(--red)', marginBottom:10 }}>Locked</p>
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
              Finalize your exported PDF first.
            </p>
          </div>
        </div>
      </>
    );
  }

  const [form, setForm] = useState({
    brideName:'', groomName:'', weddingDate:'', ceremonyTime:'7:00 PM',
    venue:'', city:'Ranchi', religion:'Hindu', loveStory:'',
    hasMehendi:true, hasSangeet:true,
    mehendiDate:'', mehendiTime:'4:00 PM', mehendiVenue:'',
    sangeetDate:'', sangeetTime:'7:00 PM', sangeetVenue:'',
    receptionTime:'9:00 PM', rsvpDeadline:'',
  });

  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('build');

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBool = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));

  const formatStamp = (value) => {
    if (!value) return 'Not yet';
    const d = new Date(value);
    return d.toLocaleString('en-IN', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  useEffect(() => {
    axios.get('/api/website').then(({ data }) => {
      if (data.websiteData) {
        setForm(prev => ({ ...prev, ...data.websiteData }));
        setWebsiteData(data.websiteData);
      } else if (wedding) {
        setForm(prev => ({
          ...prev,
          brideName: wedding.brideName || prev.brideName,
          groomName: wedding.groomName || prev.groomName,
          weddingDate: wedding.weddingDate || prev.weddingDate,
          ceremonyTime: wedding.ceremonyTime || prev.ceremonyTime,
          venue: selections?.venue?.name || wedding.venue || prev.venue,
          city: selections?.venue?.city || wedding.city || prev.city,
          religion: wedding.religion || prev.religion,
        }));
      }
      if (data.html) {
        setHtml(data.html);
        setWebsiteHtml(data.html);
        setActiveTab('preview');
      }
      if (data.websiteFinalized !== undefined) {
        setWebsiteFinalized(!!data.websiteFinalized);
      }
    }).catch(()=>{});
  }, [setWebsiteData, setWebsiteFinalized, setWebsiteHtml, wedding]);

  const generate = async () => {
    if (!form.brideName || !form.groomName) return;
    setLoading(true); setError(null);
    try {
      const { data } = await axios.post('/api/website/generate', form);
      setHtml(data.html);
      setWebsiteHtml(data.html);
      setWebsiteData(form);
      setWebsiteFinalized(false);
      setActiveTab('preview');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not generate website.');
    } finally { setLoading(false); }
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type:'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${form.brideName}-${form.groomName}-wedding.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenNew = () => {
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  const handleFinalize = async () => {
    setLoading(true); setError(null);
    try {
      await axios.post('/api/website/finalize');
      setWebsiteFinalized(true);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not finalize website.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Wedding Website</p>
        <h1 className="page-header__title">Website <em>Generator</em></h1>
        <p className="page-header__sub">Website details are prefilled from your plan. Generate, preview, download, then finalize.</p>
      </div>

      <div className="content">
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[
            { id:'build',   label:'Build Website' },
            { id:'preview', label:'Preview', disabled:!html },
          ].map(t => (
            <button key={t.id} onClick={() => !t.disabled && setActiveTab(t.id)}
              className={`btn ${activeTab===t.id ? 'btn--primary' : 'btn--dark'}`}
              style={{ flex:1, fontSize:13, opacity:t.disabled?0.4:1, cursor:t.disabled?'not-allowed':'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'build' && (
          <div className="animate-in">
            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Couple and wedding</p>
              <div className="form-grid" style={{ marginBottom:20 }}>
                <div className="field"><label className="label">Bride's name *</label><input className="input" value={form.brideName} onChange={setF('brideName')} placeholder="e.g. Priya Sharma" /></div>
                <div className="field"><label className="label">Groom's name *</label><input className="input" value={form.groomName} onChange={setF('groomName')} placeholder="e.g. Arjun Mehta" /></div>
                <div className="field"><label className="label">Wedding date</label><input className="input" type="date" value={form.weddingDate} onChange={setF('weddingDate')} /></div>
                <div className="field"><label className="label">Ceremony time</label><input className="input" value={form.ceremonyTime} onChange={setF('ceremonyTime')} placeholder="7:00 PM" /></div>
                <div className="field"><label className="label">Venue name</label><input className="input" value={form.venue} onChange={setF('venue')} placeholder="e.g. Grand Marigold Palace" /></div>
                <div className="field"><label className="label">City</label><input className="input" value={form.city} onChange={setF('city')} placeholder="e.g. Ranchi" /></div>
                <div className="field field--full">
                  <label className="label">Love story hint <span>(AI writes the story)</span></label>
                  <input className="input" value={form.loveStory} onChange={setF('loveStory')} placeholder="e.g. college sweethearts, met at work, 5 years of friendship" />
                </div>
                <div className="field">
                  <label className="label">RSVP deadline</label>
                  <input className="input" value={form.rsvpDeadline} onChange={setF('rsvpDeadline')} placeholder="e.g. 1st February 2026" />
                </div>
                <div className="field">
                  <label className="label">Reception time</label>
                  <input className="input" value={form.receptionTime} onChange={setF('receptionTime')} placeholder="9:00 PM" />
                </div>
              </div>

              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Additional events</p>
              <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                {[
                  { k:'hasMehendi', label:'Mehendi' },
                  { k:'hasSangeet', label:'Sangeet' },
                ].map(({ k, label }) => (
                  <label key={k} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 14px', borderRadius:'var(--radius-sm)', border: form[k]?'1px solid var(--border-rose)':'1px solid var(--border)', background:form[k]?'var(--rose-dim)':'var(--bg-elevated)', fontSize:13, color:form[k]?'var(--rose)':'var(--text-secondary)', transition:'all 0.15s', fontFamily:'var(--font-body)' }}>
                    <input type="checkbox" checked={form[k]} onChange={setBool(k)} style={{ accentColor:'var(--rose)', width:14, height:14 }} />
                    {label}
                  </label>
                ))}
              </div>

              {form.hasMehendi && (
                <div className="form-grid" style={{ marginBottom:16 }}>
                  <div className="field"><label className="label">Mehendi date</label><input className="input" value={form.mehendiDate} onChange={setF('mehendiDate')} placeholder="e.g. 14th Feb" /></div>
                  <div className="field"><label className="label">Mehendi time</label><input className="input" value={form.mehendiTime} onChange={setF('mehendiTime')} placeholder="4:00 PM" /></div>
                  <div className="field field--full"><label className="label">Mehendi venue</label><input className="input" value={form.mehendiVenue} onChange={setF('mehendiVenue')} placeholder="Venue name or same as wedding" /></div>
                </div>
              )}

              {form.hasSangeet && (
                <div className="form-grid" style={{ marginBottom:16 }}>
                  <div className="field"><label className="label">Sangeet date</label><input className="input" value={form.sangeetDate} onChange={setF('sangeetDate')} placeholder="e.g. 14th Feb evening" /></div>
                  <div className="field"><label className="label">Sangeet time</label><input className="input" value={form.sangeetTime} onChange={setF('sangeetTime')} placeholder="7:00 PM" /></div>
                  <div className="field field--full"><label className="label">Sangeet venue</label><input className="input" value={form.sangeetVenue} onChange={setF('sangeetVenue')} placeholder="Venue name or same as wedding" /></div>
                </div>
              )}

              {error && <div className="error-box" style={{ marginBottom:12 }}>{error}</div>}

              <button className="btn btn--primary btn--full btn--lg" onClick={generate}
                disabled={loading || !form.brideName || !form.groomName}>
                {loading ? 'Building your website...' : 'Generate Wedding Website'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preview' && html && (
          <div className="animate-in">
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <button className="btn btn--primary" style={{ flex:1, height:42 }} onClick={handleDownload}>Download HTML</button>
              <button className="btn btn--dark" style={{ flex:1, height:42 }} onClick={handleOpenNew}>Open in New Tab</button>
              <button className="btn btn--dark" style={{ flex:1, height:42 }} onClick={handleFinalize} disabled={loading || websiteFinalized}>
                {websiteFinalized ? 'Website Finalized' : 'Finalize Website'}
              </button>
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', fontSize:11, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>Website Preview</span>
                <span className={`badge ${websiteFinalized ? 'badge--green' : 'badge--amber'}`}>
                  {websiteFinalized ? 'Finalized' : 'Not final'}
                </span>
              </div>
              <iframe title="Wedding Website Preview" srcDoc={html}
                style={{ width:'100%', height:700, border:'none', display:'block' }}
                sandbox="allow-scripts allow-same-origin" />
            </div>
            <div className="card" style={{ marginTop:12, padding:'12px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Generated</p>
                  <p style={{ fontSize:13, color:'var(--text-primary)' }}>{formatStamp(websiteGeneratedAt)}</p>
                </div>
                <div>
                  <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Finalized</p>
                  <p style={{ fontSize:13, color:'var(--text-primary)' }}>{formatStamp(websiteFinalizedAt)}</p>
                </div>
              </div>
            </div>
            <div className="card card--gold animate-in" style={{ marginTop:14 }}>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
                Download the HTML file and host it on a service like GitHub Pages or Netlify Drop for sharing.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
