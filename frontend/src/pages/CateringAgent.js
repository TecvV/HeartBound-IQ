import React, { useState, useEffect } from 'react';
import { usePlan } from '../context/PlanContext';
import { useOrchestrator } from '../hooks/useOrchestrator';
import FinalizeButton from '../components/FinalizeButton';
import AgentGate from '../components/AgentGate';
import axios from 'axios';

const fmt  = n => n ? `Rs ${Math.round(n).toLocaleString('en-IN')}` : '-';
const fmtL = n => n >= 100000 ? `Rs ${(n/100000).toFixed(1)}L` : fmt(n);
const sc   = s => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--rose)';

function CatCard({ cat, isSelected, isCurrent, onSelect, guestCount }) {
  const [open, setOpen] = useState(false);
  const total = (cat.pricePerHead||900) * (guestCount||300);
  return (
    <div className="card" style={{ marginBottom:10, border: isCurrent?'1px solid var(--rose-border)':isSelected?'1px solid rgba(63,207,142,0.4)':'1px solid var(--border)', position:'relative' }}>
      {isCurrent  && <div style={{ position:'absolute', top:-1, right:16, background:'var(--rose)',  color:'white', fontSize:9, fontWeight:500, padding:'2px 10px', borderRadius:'0 0 6px 6px' }}>AI Pick</div>}
      {isSelected && !isCurrent && <div style={{ position:'absolute', top:-1, right:16, background:'var(--green)', color:'white', fontSize:9, fontWeight:500, padding:'2px 10px', borderRadius:'0 0 6px 6px' }}>Your Choice</div>}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:15, fontWeight:500, marginBottom:3 }}>{cat.name}</p>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{cat.cuisines?.join(', ')}</p>
          {(cat.phone || cat.contact) ? <p style={{ fontSize:12, color:'var(--rose)' }}>Phone: {cat.phone || cat.contact}</p> : <p style={{ fontSize:12, color:'var(--text-muted)' }}>Phone not listed</p>}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:5 }}>
            {cat.rating>0 && <span className="badge badge--gray" style={{ fontSize:11 }}>Rating {cat.rating} ({cat.reviewCount})</span>}
            {cat.pricePerHead ? <span className="badge badge--gray" style={{ fontSize:11 }}>{`Rs ${cat.pricePerHead}/head`}</span> : <span className="badge badge--gray" style={{ fontSize:11 }}>Price not listed</span>}
            {cat.pricePerHead && <span className="badge badge--gray" style={{ fontSize:11 }}>{fmtL(total)} total</span>}
            {cat.source && <span className="badge badge--gray" style={{ fontSize:11 }}>{cat.source === 'google_maps' ? 'Google Maps' : cat.source === 'google_search' ? 'Google Search' : 'Demo'}</span>}
          </div>
        </div>
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <span style={{ display:'block', fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:300, color:sc(cat.aiScore||60), lineHeight:1 }}>{cat.aiScore||'-'}</span>
          <span style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase' }}>score</span>
        </div>
      </div>

      {cat.aiJustification && (
        <div style={{ background:'var(--gold-dim)', borderLeft:'3px solid var(--gold)', borderRadius:'0 5px 5px 0', padding:'8px 12px', margin:'10px 0' }}>
          <p style={{ fontSize:10, color:'var(--gold)', fontWeight:500, letterSpacing:'0.08em', marginBottom:2 }}>Why AI chose this</p>
          <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>{cat.aiJustification}</p>
        </div>
      )}
      {cat.aiNote && !cat.aiJustification && <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'8px 0', lineHeight:1.5 }}>{cat.aiNote}</p>}

      {open && (
        <div style={{ margin:'8px 0' }}>
          {cat.amenities?.length>0 && <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>{cat.amenities.map((a,i)=><span key={i} className="badge badge--gray" style={{ fontSize:11 }}>{a}</span>)}</div>}
          {cat.packages?.length>0 && <div>{cat.packages.map((p,i)=><p key={i} style={{ fontSize:12, color:'var(--text-muted)', marginBottom:2 }}>- {p}</p>)}</div>}
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
        <button className="btn btn--dark" style={{ height:34, fontSize:12 }} onClick={() => setOpen(o=>!o)}>{open?'Less':'Details'}</button>
        {!isSelected
          ? <button className="btn btn--primary" style={{ flex:1, height:34, fontSize:12 }} onClick={()=>onSelect(cat)}>Select this caterer</button>
          : <span style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'var(--green)' }}>Currently selected</span>
        }
      </div>
    </div>
  );
}

export default function CateringAgent() {
  const { plan, selections, hasPlan, updateSelection } = usePlan();
  const { selectVendor } = useOrchestrator();
  const [caterers, setCaterers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);

  useEffect(() => {
    if (plan?.options?.caterers?.length) setCaterers(plan.options.caterers);
    else axios.get('/api/catering').then(({data})=>{ if(data.caterers?.length) setCaterers(data.caterers); }).catch(()=>{});
    if (selections?.caterer)   setSelected(selections.caterer);
    else if (plan?.picks?.caterer) setSelected(plan.picks.caterer);
  }, [plan, selections]);

  if (!hasPlan) return <AgentGate agentName="Catering" icon="" />;

  const handleSelect = async (cat) => {
    try {
      await selectVendor('caterer', cat);
      setSelected(cat); updateSelection('caterer', cat);
      setToast(`${cat.name} selected. Budget updated.`);
      setTimeout(()=>setToast(''),4000);
    } catch { setToast('Error saving selection.'); }
  };

  const handleMenu = async () => {
    const cat = selected || plan?.picks?.caterer;
    if (!cat) return;
    setMenuLoading(true);
    try {
      const cuisine = cat.cuisines?.[0] || 'Multi-cuisine';
      const { data } = await axios.post('/api/catering/menu', { cuisine, guestCount: plan?.brief?.guestCount || 300 });
      setMenu(data.menu);
    } catch {} finally { setMenuLoading(false); }
  };

  const aiPick = plan?.picks?.caterer;
  const others = caterers.filter(c => c.name !== aiPick?.name);
  const guestCount = plan?.brief?.guestCount || 300;

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Agent 04</p>
        <h1 className="page-header__title">Catering <em>Agent</em></h1>
        <p className="page-header__sub">AI's top caterer shown first. Select any option and your budget updates instantly.</p>
      </div>
      <div className="content">
        {toast && <div className="card card--green animate-in" style={{ marginBottom:16 }}><p style={{ fontSize:13, color:'var(--green)' }}>{toast}</p></div>}

        {selected && (
          <div className="card" style={{ marginBottom:16, background:'var(--bg-elevated)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:11, color:'var(--rose)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Currently selected caterer</p>
              <p style={{ fontSize:14, fontWeight:500 }}>{selected.name}</p>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>Rs {selected.pricePerHead}/head | {fmtL((selected.pricePerHead||900)*guestCount)} total</p>
            </div>
            <button className="btn btn--dark" style={{ height:36, fontSize:12 }} onClick={handleMenu} disabled={menuLoading}>
              {menuLoading ? <><span className="spinner"/>Loading...</> : 'View Menu'}
            </button>
          </div>
        )}

        {menu && (
          <div className="card animate-in" style={{ marginBottom:16 }}>
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>AI-generated wedding menu</p>
            {Object.entries(menu).map(([section, items]) => items?.length ? (
              <div key={section} style={{ marginBottom:10 }}>
                <p style={{ fontSize:11, fontWeight:500, color:'var(--rose)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{section.replace(/([A-Z])/g,' $1').trim()}</p>
                <p style={{ fontSize:13, color:'var(--text-secondary)' }}>{items.join(' | ')}</p>
              </div>
            ) : null)}
          </div>
        )}

        <FinalizeButton category={'caterer'} selectedItem={selected} />

        {aiPick && (
          <>
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>AI recommended pick</p>
            <CatCard cat={aiPick} isCurrent={selected?.name===aiPick.name} isSelected={selected?.name===aiPick.name} onSelect={handleSelect} guestCount={guestCount} />
          </>
        )}
        {others.length>0 && (
          <>
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'16px 0 10px' }}>Other options</p>
            {others.map((c,i) => <CatCard key={i} cat={c} isCurrent={false} isSelected={selected?.name===c.name} onSelect={handleSelect} guestCount={guestCount} />)}
          </>
        )}
      </div>
    </>
  );
}
