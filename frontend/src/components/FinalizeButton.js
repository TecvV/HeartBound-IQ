/**
 * FinalizeButton - shown on each agent page to confirm a selection
 * Once confirmed, shows green "Finalized" with option to undo
 */
import React, { useState } from 'react';
import axios from 'axios';
import { usePlan } from '../context/PlanContext';

export default function FinalizeButton({ category, selectedItem, onConfirmed }) {
  const { confirmed, setConfirmedCategory } = usePlan();
  const isConfirmed = !!confirmed?.[category];
  const [loading, setLoading] = useState(false);
  const [showUndo, setShowUndo] = useState(false);

  const handleFinalize = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const { data } = await axios.put('/api/orchestrate/confirm', { category, confirmed: true });
      setConfirmedCategory(category, true);
      if (onConfirmed) onConfirmed(data);
    } catch (e) { console.error('Finalize error', e.message); }
    finally { setLoading(false); }
  };

  const handleUndo = async () => {
    setLoading(true);
    try {
      await axios.put('/api/orchestrate/confirm', { category, confirmed: false });
      setConfirmedCategory(category, false);
      setShowUndo(false);
    } catch {}
    finally { setLoading(false); }
  };

  if (isConfirmed) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'var(--green-dim)', border:'1px solid rgba(63,207,142,0.35)', borderRadius:'var(--r-sm)', marginTop:12 }}>
        <span style={{ fontSize:12 }}>OK</span>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, fontWeight:500, color:'var(--green)' }}>Finalized - {selectedItem?.name}</p>
          <p style={{ fontSize:11, color:'var(--text-muted)' }}>Shown as confirmed on Dashboard</p>
        </div>
        {!showUndo
          ? <button onClick={() => setShowUndo(true)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'4px 10px', fontSize:11, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font-b)' }}>
              Change
            </button>
          : <div style={{ display:'flex', gap:6 }}>
              <button onClick={handleUndo} disabled={loading}
                style={{ background:'none', border:'1px solid var(--red)', borderRadius:'var(--r-sm)', padding:'4px 10px', fontSize:11, color:'var(--red)', cursor:'pointer', fontFamily:'var(--font-b)' }}>
                {loading ? '...' : 'Yes, un-finalize'}
              </button>
              <button onClick={() => setShowUndo(false)}
                style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'4px 10px', fontSize:11, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font-b)' }}>
                Cancel
              </button>
            </div>
        }
      </div>
    );
  }

  return (
    <div style={{ marginTop:12 }}>
      {!selectedItem
        ? <p style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>Select a {category} above to finalize it.</p>
        : (
          <button onClick={handleFinalize} disabled={loading}
            style={{
              width:'100%', height:44, background:'var(--green)', color:'white',
              border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:500,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'var(--font-b)', display:'flex', alignItems:'center',
              justifyContent:'center', gap:8, transition:'opacity 0.15s',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading
              ? <><span className="spinner" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,0.3)' }}/>Finalizing...</>
              : <>Finalize {selectedItem.name}</>
            }
          </button>
        )
      }
      <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:6, textAlign:'center' }}>
        This will mark it as confirmed on your Dashboard
      </p>
    </div>
  );
}
