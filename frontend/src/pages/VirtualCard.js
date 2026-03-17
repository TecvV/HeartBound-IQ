import React, { useState, useEffect } from 'react';
import { usePlan } from '../context/PlanContext';
import AgentGate from '../components/AgentGate';
import axios from 'axios';

const DESIGN_NAMES = [
  { idx:1,  name:'Crimson and Gold',   desc:'Classic Indian red and gold, warm parchment',   preview:'A' },
  { idx:2,  name:'Midnight Rose',      desc:'Dark luxury, deep maroon with rose accents',   preview:'B' },
  { idx:3,  name:'Forest Green',       desc:'Nature-inspired, dark green and gold',        preview:'C' },
  { idx:4,  name:'Royal Blue',         desc:'Regal deep blue with gold details',           preview:'D' },
  { idx:5,  name:'Champagne',          desc:'Light elegant, champagne and gold on cream',  preview:'E' },
  { idx:6,  name:'Dark Indigo',        desc:'Deep purple night sky with stars',            preview:'F' },
  { idx:7,  name:'Teak Wood',          desc:'Earthy warm tones, vintage Indian feel',      preview:'G' },
  { idx:8,  name:'Passion Red',        desc:'Deep crimson dark background, bold and modern', preview:'H' },
  { idx:9,  name:'Peacock Teal',       desc:'Vibrant teal and gold, peacock-inspired',     preview:'I' },
  { idx:10, name:'Parchment',          desc:'Light antique parchment, handwritten feel',  preview:'J' },
];

export default function VirtualCard() {
  const {
    hasPlan, plan, selections, wedding, allConfirmed,
    cardHtml, cardFinalized, cardFinalizedAt, setCardHtml, setCardFinalized, refresh,
  } = usePlan();

  if (!hasPlan) return <AgentGate agentName="Invitation Card" icon="" />;
  if (!allConfirmed) return <AgentGate agentName="Invitation Card" icon="" reason="not-confirmed" />;

  const w = wedding || {};
  const picks = selections || plan?.picks || {};

  const [tab, setTab] = useState('design');
  const [selectedDesign, setSelectedDesign] = useState(1);
  const [form, setForm] = useState({
    brideName:    w.brideName    || plan?.brief?.brideName    || '',
    groomName:    w.groomName    || plan?.brief?.groomName    || '',
    weddingDate:  w.weddingDate  || plan?.brief?.weddingDate  || '',
    ceremonyTime: w.ceremonyTime || plan?.brief?.ceremonyTime || '7:00 PM',
    venue:        picks.venue?.name || w.venue || '',
    city:         w.city         || plan?.brief?.city         || '',
    religion:     w.religion     || plan?.brief?.religion     || 'Hindu',
    familyNames:  '', rsvpDeadline: '',
  });

  const [previewHtml, setPreviewHtml] = useState('');
  const [previews, setPreviews] = useState({});
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');

  const formatStamp = (value) => {
    if (!value) return 'Not yet';
    const d = new Date(value);
    return d.toLocaleString('en-IN', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    axios.get('/api/virtualcard').then(({ data }) => {
      if (data?.html) {
        setPreviewHtml(data.html);
        setPreviews(p => ({ ...p, [data.designIndex || 1]: data.html }));
        setSelectedDesign(data.designIndex || 1);
        setCardHtml(data.html);
      }
      if (data?.cardFinalized !== undefined) {
        setCardFinalized(!!data.cardFinalized);
      }
    }).catch(()=>{});
  }, [setCardHtml, setCardFinalized]);

  useEffect(() => {
    if (!form.brideName && plan?.brief?.brideName) {
      setForm(f => ({
        ...f,
        brideName: plan.brief.brideName,
        groomName: plan.brief.groomName,
        weddingDate: plan.brief.weddingDate || '',
        ceremonyTime: plan.brief.ceremonyTime || '7:00 PM',
        venue: picks.venue?.name || '',
        city: plan.brief.city || '',
        religion: plan.brief.religion || 'Hindu',
      }));
    }
  }, [plan]);

  const generatePreview = async (idx) => {
    if (previews[idx]) { setPreviewHtml(previews[idx]); setSelectedDesign(idx); return; }
    if (!form.brideName || !form.groomName) { setError('Fill bride and groom names first.'); return; }
    setError('');
    setLoadingPrev(true);
    try {
      const { data } = await axios.post('/api/virtualcard/generate', { ...form, designIndex: idx });
      setPreviews(p => ({ ...p, [idx]: data.html }));
      setPreviewHtml(data.html);
      setSelectedDesign(idx);
      setCardHtml(data.html);
      setCardFinalized(false);
      await refresh();
      if (tab === 'design') setTab('preview');
    } catch (e) { setError(e.response?.data?.error || 'Error generating card'); }
    finally { setLoadingPrev(false); }
  };

  const generateAllPreviews = async () => {
    if (!form.brideName || !form.groomName) { setError('Fill bride and groom names first.'); return; }
    setError(''); setLoadingAll(true);
    try {
      const { data } = await axios.post('/api/virtualcard/previews', form);
      const newPreviews = {};
      data.designs.forEach(d => { newPreviews[d.index] = d.html; });
      setPreviews(newPreviews);
    } catch (e) { setError('Error loading previews'); }
    finally { setLoadingAll(false); }
  };

  const handleDownload = () => {
    const html = previews[selectedDesign] || previewHtml || cardHtml;
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.brideName}-${form.groomName}-invitation-design${selectedDesign}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleFinalize = async () => {
    const html = previews[selectedDesign] || previewHtml;
    if (!html) { setError('Generate a preview first.'); return; }
    setFinalizing(true); setError('');
    try {
      await axios.post('/api/virtualcard/finalize');
      setCardFinalized(true);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not finalize card.');
    } finally { setFinalizing(false); }
  };

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Invitation Card</p>
        <h1 className="page-header__title">Wedding <em>Invitation Card</em></h1>
        <p className="page-header__sub">Choose a design, preview it, then finalize to unlock downloading. The finalized card is saved to your account.</p>
      </div>

      <div className="content">
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[
            { id:'design',  label:'Choose Design' },
            { id:'details', label:'Edit Details'  },
            { id:'preview', label:'Preview',    disabled: !previewHtml },
          ].map(t => (
            <button key={t.id} onClick={() => !t.disabled && setTab(t.id)}
              className={`btn ${tab===t.id ? 'btn--primary' : 'btn--dark'}`}
              style={{ flex:1, fontSize:12, opacity:t.disabled?0.4:1, cursor:t.disabled?'not-allowed':'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="error-box" style={{ marginBottom:16 }}>{error}</div>}

        {tab === 'design' && (
          <div className="animate-in">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Click a design to preview it. Currently selected: <strong style={{ color:'var(--rose)' }}>{DESIGN_NAMES[selectedDesign-1]?.name}</strong></p>
              <button className="btn btn--dark" style={{ height:34, fontSize:12 }} onClick={generateAllPreviews} disabled={loadingAll}>
                {loadingAll ? <>Generating all...</> : 'Preview all 10'}
              </button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {DESIGN_NAMES.map(d => (
                <button key={d.idx} onClick={() => generatePreview(d.idx)} disabled={loadingPrev}
                  style={{
                    display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                    background: selectedDesign===d.idx ? 'var(--rose-dim)' : 'var(--bg-card)',
                    border: `1px solid ${selectedDesign===d.idx ? 'var(--rose-border)' : 'var(--border)'}`,
                    borderRadius:'var(--r-md)', cursor:'pointer', textAlign:'left',
                    fontFamily:'var(--font-b)', transition:'all 0.15s', position:'relative',
                  }}>
                  {previews[d.idx] ? (
                    <iframe srcDoc={previews[d.idx]} style={{ width:50, height:50, border:'1px solid var(--border)', borderRadius:4, pointerEvents:'none', flexShrink:0 }} sandbox="allow-same-origin" />
                  ) : (
                    <div style={{ width:50, height:50, borderRadius:4, background:'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                      {d.preview}
                    </div>
                  )}
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', marginBottom:2 }}>
                      {d.idx}. {d.name}
                      {selectedDesign===d.idx && <span style={{ color:'var(--rose)', marginLeft:6 }}>OK</span>}
                    </p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4 }}>{d.desc}</p>
                  </div>
                  {loadingPrev && selectedDesign===d.idx && <span className="spinner" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}/>} 
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'details' && (
          <div className="animate-in">
            <div className="card card--gold" style={{ marginBottom:16 }}>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>Details are auto-filled from your wedding plan. Edit anything below, then regenerate the card.</p>
            </div>
            <div className="card">
              <div className="form-grid" style={{ marginBottom:14 }}>
                {[
                  { k:'brideName',    l:"Bride's name *",    p:'Priya Sharma'             },
                  { k:'groomName',    l:"Groom's name *",    p:'Arjun Mehta'              },
                  { k:'weddingDate',  l:'Wedding date',       t:'date'                    },
                  { k:'ceremonyTime', l:'Ceremony time',      p:'7:00 PM'                 },
                  { k:'venue',        l:'Venue name',         p:'The Grand Marigold Palace'},
                  { k:'city',         l:'City',               p:'Ranchi'                  },
                  { k:'rsvpDeadline', l:'RSVP deadline',      p:'1st February 2026'        },
                  { k:'familyNames',  l:'Family names',       p:'Mr. and Mrs. Sharma | Mr. and Mrs. Mehta', full:true },
                ].map(({ k,l,p,t,full }) => (
                  <div className={`field ${full ? 'field--full' : ''}`} key={k}>
                    <label className="label">{l}</label>
                    <input className="input" type={t||'text'} value={form[k]||''} onChange={setF(k)} placeholder={p||''} />
                  </div>
                ))}
              </div>
              <button className="btn btn--primary btn--full" onClick={() => generatePreview(selectedDesign)} disabled={loadingPrev||!form.brideName||!form.groomName}>
                {loadingPrev ? 'Regenerating...' : `Regenerate Design ${selectedDesign}`}
              </button>
            </div>
          </div>
        )}

        {tab === 'preview' && (previewHtml || previews[selectedDesign]) && (
          <div className="animate-in">
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <button className="btn btn--primary" style={{ flex:1, height:40, minWidth:120 }} onClick={handleFinalize} disabled={finalizing}>
                {finalizing ? 'Finalizing...' : cardFinalized ? 'Card Finalized' : 'Finalize This Card'}
              </button>
              <button className="btn btn--dark" style={{ flex:1, height:40, minWidth:120 }} onClick={handleDownload} disabled={!cardFinalized}>
                Download
              </button>
              <button className="btn btn--dark" style={{ flex:1, height:40, minWidth:120 }} onClick={() => { const w=window.open('','_blank'); w.document.write(previews[selectedDesign]||previewHtml); w.document.close(); }}>
                Open
              </button>
            </div>

            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', fontSize:11, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>Design {selectedDesign} - {DESIGN_NAMES[selectedDesign-1]?.name}</span>
                <span className={`badge ${cardFinalized ? 'badge--green' : 'badge--amber'}`}>
                  {cardFinalized ? 'Finalized' : 'Not final'}
                </span>
              </div>
              <iframe title="Card Preview" srcDoc={previews[selectedDesign]||previewHtml}
                style={{ width:'100%', height:700, border:'none', display:'block' }}
                sandbox="allow-scripts allow-same-origin" />
            </div>

            <div className="card" style={{ marginTop:12, padding:'12px 16px' }}>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>Finalized at: <strong style={{ color:'var(--text-primary)' }}>{formatStamp(cardFinalizedAt)}</strong></p>
            </div>

            {!cardFinalized && (
              <div className="card card--gold" style={{ marginTop:14 }}>
                <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
                  Finalize the card to unlock downloading and move to the next tools.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
