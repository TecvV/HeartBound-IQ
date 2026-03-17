import React, { useState, useEffect } from 'react';
import { usePlan } from '../context/PlanContext';
import { useOrchestrator } from '../hooks/useOrchestrator';
import axios from 'axios';
import FinalizeButton from '../components/FinalizeButton';

const fmt  = n => n ? `${Math.round(n).toLocaleString('en-IN')}` : '-';
const fmtL = n => n >= 100000 ? `${(n/100000).toFixed(1)}L` : fmt(n);
const sc   = s => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--rose)';
const sourceLabel = (src) => ({
  google_maps: 'Google Maps',
  google_search: 'Google Search',
  mock: 'Demo',
}[src] || 'Source');

function VenueCard({ venue, isSelected, isCurrent, onSelect, guestCount }) {
  const [open, setOpen] = useState(false);
  const pricePerHead = venue.pricePerHead || 0;
  const total = pricePerHead ? pricePerHead * (guestCount || 300) : 0;
  return (
    <div className="card animate-in" style={{ marginBottom:10, border: isCurrent ? '1px solid var(--rose-border)' : isSelected ? '1px solid rgba(63,207,142,0.4)' : '1px solid var(--border)', position:'relative' }}>
      {isCurrent && <div style={{ position:'absolute', top:-1, right:16, background:'var(--rose)', color:'white', fontSize:9, fontWeight:500, padding:'2px 10px', borderRadius:'0 0 6px 6px', letterSpacing:'0.05em' }}>AI Pick</div>}
      {isSelected && !isCurrent && <div style={{ position:'absolute', top:-1, right:16, background:'var(--green)', color:'white', fontSize:9, fontWeight:500, padding:'2px 10px', borderRadius:'0 0 6px 6px' }}>Your Choice</div>}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)', marginBottom:3 }}>{venue.name}</p>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{venue.address || venue.city}</p>
          {(venue.phone || venue.contact) ? <p style={{ fontSize:12, color:'var(--rose)' }}>Phone: {venue.phone || venue.contact}</p> : <p style={{ fontSize:12, color:'var(--text-muted)' }}>Phone not listed</p>}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
            {venue.rating > 0 && <span className="badge badge--gray" style={{ fontSize:11 }}>Rating {venue.rating} ({venue.reviewCount})</span>}
            {venue.venueType && <span className="badge badge--gray" style={{ fontSize:11 }}>{venue.venueType}</span>}
            {venue.capacity && <span className="badge badge--gray" style={{ fontSize:11 }}>{venue.capacity} capacity</span>}
            {pricePerHead ? <span className="badge badge--gray" style={{ fontSize:11 }}>{`Rs ${pricePerHead}/head`}</span> : <span className="badge badge--gray" style={{ fontSize:11 }}>Price not listed</span>}
            {pricePerHead > 0 && <span className="badge badge--gray" style={{ fontSize:11 }}>{`Rs ${fmtL(total)} total`}</span>}
            {venue.source && <span className="badge badge--gray" style={{ fontSize:11 }}>{sourceLabel(venue.source)}</span>}
          </div>
        </div>
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <span style={{ display:'block', fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:300, color:sc(venue.aiScore||60), lineHeight:1 }}>{venue.aiScore || '-'}</span>
          <span style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase' }}>score</span>
        </div>
      </div>

      {venue.aiJustification && (
        <div style={{ background:'var(--gold-dim)', borderLeft:'3px solid var(--gold)', borderRadius:'0 5px 5px 0', padding:'8px 12px', margin:'10px 0' }}>
          <p style={{ fontSize:10, color:'var(--gold)', fontWeight:500, letterSpacing:'0.08em', marginBottom:2 }}>Why AI chose this</p>
          <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>{venue.aiJustification}</p>
        </div>
      )}

      {venue.aiRecommendation && !venue.aiJustification && (
        <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'8px 0', lineHeight:1.5 }}>{venue.aiRecommendation}</p>
      )}

      {open && venue.amenities?.length > 0 && (
        <div style={{ margin:'8px 0' }}>
          <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Amenities</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {venue.amenities.map((a,i) => <span key={i} className="badge badge--gray" style={{ fontSize:11 }}>{a}</span>)}
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
        <button className="btn btn--dark" style={{ height:34, fontSize:12 }} onClick={() => setOpen(o => !o)}>
          {open ? 'Less' : 'Details'}
        </button>
        {!isSelected && (
          <button className="btn btn--primary" style={{ flex:1, height:34, fontSize:12 }} onClick={() => onSelect(venue)}>
            Select this venue
          </button>
        )}
        {isSelected && <span style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'var(--green)' }}>Currently selected</span>}
      </div>
    </div>
  );
}

export default function VenueScout() {
  const { plan, selections, hasPlan, updateSelection } = usePlan();
  const { selectVendor } = useOrchestrator();
  const { refresh } = usePlan();
  const [venues, setVenues] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (plan?.options?.venues?.length) {
      setVenues(plan.options.venues);
    } else {
      axios.get('/api/venues').then(({ data }) => { if (data.venues?.length) setVenues(data.venues); }).catch(()=>{});
    }
    if (selections?.venue) setSelected(selections.venue);
    else if (plan?.picks?.venue) setSelected(plan.picks.venue);
  }, [plan, selections]);

  const handleSelect = async (venue) => {
    setSaving(true);
    try {
      await selectVendor('venue', venue);
      setSelected(venue);
      updateSelection('venue', venue);
      setToast(`${venue.name} selected as your venue. Budget updated.`);
      await refresh();
      setTimeout(() => setToast(''), 4000);
    } catch (e) { setToast(e.message || 'Error saving selection.'); }
    finally { setSaving(false); }
  };

  if (!hasPlan) return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Agent 01</p>
        <h1 className="page-header__title">Venue <em>Scout</em></h1>
      </div>
      <div className="content">
        <div className="card card--amber animate-in" style={{ textAlign:'center', padding:32 }}>
          <p style={{ fontSize:15, fontWeight:500, color:'var(--amber)', marginBottom:8 }}>Run the Full Plan first</p>
          <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>The Venue Scout needs the Orchestrator to run first. Go to Full Plan, fill in your wedding brief, and generate the plan. Your venue options will appear here automatically.</p>
        </div>
      </div>
    </>
  );

  const aiPick = plan?.picks?.venue;
  const guestCount = plan?.brief?.guestCount || 300;
  const others = venues.filter(v => v.name !== aiPick?.name);

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Agent 01</p>
        <h1 className="page-header__title">Venue <em>Scout</em></h1>
        <p className="page-header__sub">AI's top pick is shown first. Review all options and select your preferred venue - costs update automatically.</p>
      </div>

      <div className="content">
        {toast && <div className="card card--green animate-in" style={{ marginBottom:16 }}><p style={{ fontSize:13, color:'var(--green)' }}>{toast}</p></div>}

        {selected && (
          <div className="card" style={{ marginBottom:16, background:'var(--bg-elevated)', borderColor:'var(--border-rose)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:11, color:'var(--rose)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Currently selected venue</p>
              <p style={{ fontSize:14, fontWeight:500 }}>{selected.name}</p>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>{selected.pricePerHead ? `Rs ${fmtL(selected.pricePerHead * guestCount)} total` : 'Price not listed'}</p>
            </div>
            <span className="badge badge--rose">Active</span>
          </div>
        )}

        <FinalizeButton category={'venue'} selectedItem={selected} />

        {aiPick && (
          <>
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>AI recommended pick</p>
            <VenueCard venue={aiPick} isCurrent={selected?.name === aiPick.name} isSelected={selected?.name === aiPick.name} onSelect={handleSelect} guestCount={guestCount} />
          </>
        )}

        {others.length > 0 && (
          <>
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'16px 0 10px' }}>Other options from Google Maps</p>
            {others.map((v, i) => (
              <VenueCard key={i} venue={v} isCurrent={false} isSelected={selected?.name === v.name} onSelect={handleSelect} guestCount={guestCount} />
            ))}
          </>
        )}

        {venues.length === 0 && (
          <div className="empty"><span className="empty__icon"></span>No venues loaded yet. Run the Full Plan to fetch real venues from Google Maps.</div>
        )}
      </div>
    </>
  );
}
