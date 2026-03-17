import React, { useState, useEffect } from 'react';
import { usePlan } from '../context/PlanContext';
import { useOrchestrator } from '../hooks/useOrchestrator';
import FinalizeButton from '../components/FinalizeButton';
import AgentGate from '../components/AgentGate';

const sc = s => s>=80?'var(--green)':s>=60?'var(--amber)':'var(--rose)';
const CATS = [
  { key:'photographer', label:'Photographer', planKey:'photographer', budgetKey:'photographers' },
  { key:'decorator',    label:'Decorator',    planKey:'decorator',    budgetKey:'decorators'    },
  { key:'dj',           label:'DJ / Music',   planKey:'dj',           budgetKey:'djs'           },
];

function VCard({ vendor, isCurrent, isSelected, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginBottom:10, border:isCurrent?'1px solid var(--rose-border)':isSelected?'1px solid rgba(63,207,142,0.4)':'1px solid var(--border)', position:'relative' }}>
      {isCurrent  && <div style={{ position:'absolute', top:-1, right:16, background:'var(--rose)',  color:'white', fontSize:9, fontWeight:500, padding:'2px 10px', borderRadius:'0 0 6px 6px' }}>AI Pick</div>}
      {isSelected && !isCurrent && <div style={{ position:'absolute', top:-1, right:16, background:'var(--green)', color:'white', fontSize:9, fontWeight:500, padding:'2px 10px', borderRadius:'0 0 6px 6px' }}>Your Choice</div>}

      <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:15, fontWeight:500, marginBottom:3 }}>{vendor.name}</p>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{vendor.address || vendor.city}</p>
          {(vendor.phone || vendor.contact) ? <p style={{ fontSize:12, color:'var(--rose)' }}>Phone: {vendor.phone || vendor.contact}</p> : <p style={{ fontSize:12, color:'var(--text-muted)' }}>Phone not listed</p>}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:5 }}>
            {vendor.rating>0 && <span className="badge badge--gray" style={{ fontSize:11 }}>Rating {vendor.rating} ({vendor.reviewCount})</span>}
            {vendor.priceRange ? <span className="badge badge--gray" style={{ fontSize:11 }}>{vendor.priceRange}</span> : <span className="badge badge--gray" style={{ fontSize:11 }}>Price not listed</span>}
            {vendor.source && <span className="badge badge--gray" style={{ fontSize:11 }}>{vendor.source === 'google_maps' ? 'Google Maps' : vendor.source === 'google_search' ? 'Google Search' : 'Demo'}</span>}
            {vendor.experience && vendor.experience!=='N/A' && <span className="badge badge--gray" style={{ fontSize:11 }}>{vendor.experience}</span>}
            {vendor.style && <span className="badge badge--rose" style={{ fontSize:11 }}>{vendor.style}</span>}
          </div>
        </div>
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <span style={{ display:'block', fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:300, color:sc(vendor.aiScore||60), lineHeight:1 }}>{vendor.aiScore||'-'}</span>
          <span style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase' }}>score</span>
        </div>
      </div>

      {vendor.aiJustification && (
        <div style={{ background:'var(--gold-dim)', borderLeft:'3px solid var(--gold)', borderRadius:'0 5px 5px 0', padding:'8px 12px', margin:'10px 0' }}>
          <p style={{ fontSize:10, color:'var(--gold)', fontWeight:500, letterSpacing:'0.08em', marginBottom:2 }}>Why AI chose this</p>
          <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>{vendor.aiJustification}</p>
        </div>
      )}
      {vendor.aiNote && !vendor.aiJustification && <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'8px 0', lineHeight:1.5 }}>{vendor.aiNote}</p>}

      {open && vendor.amenities?.length>0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, margin:'8px 0' }}>
          {vendor.amenities.map((a,i)=><span key={i} className="badge badge--gray" style={{ fontSize:11 }}>{a}</span>)}
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
        <button className="btn btn--dark" style={{ height:34, fontSize:12 }} onClick={()=>setOpen(o=>!o)}>{open?'Less':'Details'}</button>
        {!isSelected
          ? <button className="btn btn--primary" style={{ flex:1, height:34, fontSize:12 }} onClick={()=>onSelect(vendor)}>Select</button>
          : <span style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'var(--green)' }}>Selected</span>
        }
      </div>
    </div>
  );
}

export default function VendorAgent() {
  const { plan, selections, hasPlan, updateSelection } = usePlan();
  const { selectVendor } = useOrchestrator();
  const [activeCat, setActiveCat] = useState('photographer');
  const [allVendors, setAllVendors] = useState({});
  const [selected, setSelected] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!plan) return;
    const v = {};
    CATS.forEach(c => { v[c.key] = plan.options?.[c.budgetKey] || []; });
    setAllVendors(v);
    const s = {};
    CATS.forEach(c => { s[c.key] = selections?.[c.key] || plan.picks?.[c.planKey] || null; });
    setSelected(s);
  }, [plan, selections]);

  if (!hasPlan) return <AgentGate agentName="Vendors" icon="" />;

  const handleSelect = async (cat, vendor) => {
    try {
      await selectVendor(cat.key, vendor);
      setSelected(prev => ({ ...prev, [cat.key]: vendor }));
      updateSelection(cat.key, vendor);
      setToast(`${vendor.name} selected as ${cat.label}. Budget updated.`);
      setTimeout(()=>setToast(''),4000);
    } catch { setToast('Error saving selection.'); }
  };

  const cat = CATS.find(c => c.key === activeCat);
  const vendors = allVendors[activeCat] || [];
  const aiPick = plan?.picks?.[cat.planKey];
  const others = vendors.filter(v => v.name !== aiPick?.name);
  const curSel = selected[activeCat];

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Agent 05</p>
        <h1 className="page-header__title">Vendor <em>Agent</em></h1>
        <p className="page-header__sub">AI-recommended vendor shown first per category. Select any alternative and budget updates instantly.</p>
      </div>
      <div className="content">
        {toast && <div className="card card--green animate-in" style={{ marginBottom:16 }}><p style={{ fontSize:13, color:'var(--green)' }}>{toast}</p></div>}

        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {CATS.map(c => (
            <button key={c.key} onClick={()=>setActiveCat(c.key)}
              className={`btn ${activeCat===c.key ? 'btn--primary' : 'btn--dark'}`}
              style={{ flex:1, fontSize:12 }}>
              {c.label}
              {selected[c.key] && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block', marginLeft:6, verticalAlign:'middle' }}/>}
            </button>
          ))}
        </div>

        {curSel && (
          <div className="card" style={{ marginBottom:16, background:'var(--bg-elevated)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:11, color:'var(--rose)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Selected {cat.label}</p>
              <p style={{ fontSize:14, fontWeight:500 }}>{curSel.name}</p>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>{curSel.priceRange || '-'}</p>
            </div>
            <span className="badge badge--rose">Active</span>
          </div>
        )}

        <FinalizeButton category={activeCat} selectedItem={curSel} />

        {aiPick && (
          <>
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>AI recommended</p>
            <VCard vendor={aiPick} isCurrent={curSel?.name===aiPick.name} isSelected={curSel?.name===aiPick.name} onSelect={v=>handleSelect(cat,v)} />
          </>
        )}
        {others.length>0 && (
          <>
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'16px 0 10px' }}>Other options</p>
            {others.map((v,i) => <VCard key={i} vendor={v} isCurrent={false} isSelected={curSel?.name===v.name} onSelect={vv=>handleSelect(cat,vv)} />)}
          </>
        )}
        {vendors.length===0 && <div className="empty"><span className="empty__icon"></span>No {cat.label} options found. Run Full Plan to fetch from Google Maps.</div>}
      </div>
    </>
  );
}
