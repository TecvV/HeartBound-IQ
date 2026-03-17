import { usePlan } from '../context/PlanContext';
import AgentGate from '../components/AgentGate';
import React, { useState } from 'react';
import { useVenueScout } from '../hooks/useVenueScout';
import { useCatering } from '../hooks/useCatering';

const CITIES = ['Ranchi','Delhi','Mumbai','Bangalore','Hyderabad','Pune','Kolkata','Chennai','Jaipur','Lucknow','Patna','Bhopal'];
const fmt = n => n ? `Rs ${Math.round(n).toLocaleString('en-IN')}` : '-';
const fmtL = n => n >= 100000 ? `Rs ${(n/100000).toFixed(1)}L` : fmt(n);
const scoreColor = s => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--rose)';

function CompareTable({ items, rows, title }) {
  if (!items?.length) return null;
  return (
    <div style={{ overflowX:'auto' }}>
      <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>{title} comparison</p>
      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
        <thead>
          <tr>
            <th style={{ padding:'10px 14px', textAlign:'left', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', width:140 }}>Attribute</th>
            {items.map((item, i) => (
              <th key={i} style={{ padding:'10px 14px', textAlign:'center', fontSize:13, fontWeight:500, color: i===0?'var(--rose)':'var(--text-primary)', borderBottom:'1px solid var(--border)', background: i===0?'var(--rose-dim)':'var(--bg-elevated)', minWidth:160 }}>
                {item.name}
                {i===0 && <span style={{ display:'block', fontSize:10, color:'var(--rose)', fontWeight:400 }}>top pick</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom:'1px solid var(--border)' }}>
              <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--bg-elevated)' }}>{row.label}</td>
              {items.map((item, ci) => {
                const val = row.getValue(item);
                return (
                  <td key={ci} style={{ padding:'10px 14px', textAlign:'center', fontSize:13, color: row.highlight?.(val, items) ? 'var(--green)' : 'var(--text-primary)', background: ci===0?'rgba(224,114,138,0.04)':'transparent', fontWeight: row.bold ? 500 : 400 }}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VENUE_ROWS = [
  { label:'AI Score',    getValue: v => v.aiScore,                                 bold:true, highlight: (val,all) => val === Math.max(...all.map(a=>a.aiScore)) },
  { label:'Est. Total',  getValue: v => fmtL(v.totalEstimatedCost||0)              },
  { label:'Per Head',    getValue: v => fmt(v.pricePerHead),                        highlight: (val,all) => val === fmt(Math.min(...all.map(a=>a.pricePerHead||9999999))) },
  { label:'Capacity',    getValue: v => v.capacity||'-'                            },
  { label:'Rating',      getValue: v => v.rating ? `Star ${v.rating}` : '-',         highlight: (val,all) => val === `Star ${Math.max(...all.map(a=>a.rating||0))}` },
  { label:'Reviews',     getValue: v => v.reviewCount||0                           },
  { label:'Type',        getValue: v => v.venueType||'-'                           },
  { label:'Distance',    getValue: v => v.distanceFromCenter ? `${v.distanceFromCenter} km`:'-' },
  { label:'Amenities',   getValue: v => v.amenities?.length ? `${v.amenities.length} included` :'-' },
];

const CATERER_ROWS = [
  { label:'AI Score',    getValue: c => c.aiScore,                                  bold:true, highlight: (val,all) => val === Math.max(...all.map(a=>a.aiScore)) },
  { label:'Per Head',    getValue: c => fmt(c.pricePerHead),                         highlight: (val,all) => val === fmt(Math.min(...all.map(a=>a.pricePerHead||9999999))) },
  { label:'Est. Total',  getValue: c => fmtL(c.totalEstimatedCost||0)               },
  { label:'Rating',      getValue: c => c.rating ? `Star ${c.rating}` : '-',          highlight: (val,all) => val === `Star ${Math.max(...all.map(a=>a.rating||0))}` },
  { label:'Reviews',     getValue: c => c.reviewCount||0                            },
  { label:'Cuisines',    getValue: c => c.cuisines?.join(', ')||'-'                 },
  { label:'Min Guests',  getValue: c => c.minGuests||'-'                            },
  { label:'Packages',    getValue: c => c.packages?.length ? `${c.packages.length} options`:'-' },
  { label:'Amenities',   getValue: c => c.amenities?.length ? `${c.amenities.length} included`:'-' },
];

export default function CompareMode() {
  const { hasPlan } = usePlan();
  if (!hasPlan) return <AgentGate agentName="Compare Mode" icon="" />;
  const venueCtx    = useVenueScout();
  const cateringCtx = useCatering();

  const [type,   setType]   = useState('venue');
  const [city,   setCity]   = useState('Ranchi');
  const [guests, setGuests] = useState(300);
  const [budget, setBudget] = useState(2000000);
  const [selected, setSelected] = useState([]);

  const isVenue    = type === 'venue';
  const results    = isVenue ? venueCtx.venues : cateringCtx.caterers;
  const isLoading  = isVenue ? venueCtx.loading : cateringCtx.loading;
  const hasResults = isVenue ? venueCtx.hasSearched : cateringCtx.hasSearched;

  const handleSearch = () => {
    setSelected([]);
    if (isVenue) {
      venueCtx.scout({ city, guestCount: guests, budgetTotal: budget });
    } else {
      cateringCtx.search({ city, guestCount: guests, budgetPerHead: Math.round(budget/guests*0.35), cuisines:[] });
    }
  };

  const toggleSelect = (item) => {
    setSelected(prev => {
      const already = prev.find(p => p.name === item.name);
      if (already) return prev.filter(p => p.name !== item.name);
      if (prev.length >= 3) return [...prev.slice(1), item];
      return [...prev, item];
    });
  };

  const compareItems = selected.length >= 2 ? selected : (results.slice(0,3));

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Compare</p>
        <h1 className="page-header__title">Comparison <em>Mode</em></h1>
        <p className="page-header__sub">Search venues or caterers and compare up to 3 side-by-side. Green highlights show the best value in each row.</p>
      </div>

      <div className="content">
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {[{ id:'venue', label:'Venues' },{ id:'caterer', label:'Caterers' }].map(t => (
              <button key={t.id} onClick={() => { setType(t.id); setSelected([]); }}
                className={`btn ${type===t.id ? 'btn--primary' : 'btn--dark'}`} style={{ flex:1, fontSize:13 }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="form-grid" style={{ marginBottom:14 }}>
            <div className="field"><label className="label">City</label>
              <select className="input" value={city} onChange={e=>setCity(e.target.value)}>{CITIES.map(c=><option key={c}>{c}</option>)}</select>
            </div>
            <div className="field"><label className="label">Guests</label>
              <input className="input" type="number" min="50" value={guests} onChange={e=>setGuests(e.target.value)} />
            </div>
            <div className="field"><label className="label">Budget</label>
              <input className="input" type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="Total budget" />
            </div>
          </div>

          <button className="btn btn--primary btn--full" onClick={handleSearch} disabled={isLoading}>
            {isLoading ? <><span className="spinner"/> Searching...</> : `Search ${isVenue ? 'Venues' : 'Caterers'}`}
          </button>
        </div>

        {hasResults && results.length > 0 && (
          <>
            <div className="card" style={{ marginBottom:16 }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                Select up to 3 to compare {selected.length > 0 && <span style={{ color:'var(--rose)' }}>({selected.length} selected)</span>}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {results.map((item, i) => {
                  const isSel = selected.find(s => s.name === item.name);
                  return (
                    <button key={i} onClick={() => toggleSelect(item)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:'var(--radius-sm)', border:`1px solid ${isSel ? 'var(--border-rose)' : 'var(--border)'}`, background: isSel?'var(--rose-dim)':'var(--bg-elevated)', cursor:'pointer', textAlign:'left', fontFamily:'var(--font-body)', transition:'all 0.15s' }}>
                      <div style={{ width:20, height:20, borderRadius:4, border:`1px solid ${isSel ? 'var(--rose)' : 'var(--border-mid)'}`, background:isSel?'var(--rose)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'white', flexShrink:0 }}>
                        {isSel ? 'OK' : ''}
                      </div>
                      <span style={{ flex:1, fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{item.name}</span>
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{item.pricePerHead ? `${fmt(item.pricePerHead)}/head` : item.priceRange || ''}</span>
                      <span style={{ fontSize:13, fontWeight:500, color: scoreColor(item.aiScore) }}>{item.aiScore}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {compareItems.length >= 2 && (
              <div className="card animate-in">
                <CompareTable
                  items={compareItems}
                  rows={isVenue ? VENUE_ROWS : CATERER_ROWS}
                  title={isVenue ? 'Venue' : 'Caterer'}
                />
                {selected.length < 2 && (
                  <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:12 }}>Showing top 3 results. Select specific items above to compare your own picks.</p>
                )}
              </div>
            )}
          </>
        )}

        {!hasResults && !isLoading && (
          <div className="empty card">
            <span className="empty__icon"></span>
            Search for venues or caterers above, then select up to 3 to compare side by side.
          </div>
        )}
      </div>
    </>
  );
}
