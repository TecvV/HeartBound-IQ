import { usePlan } from '../context/PlanContext';
import AgentGate from '../components/AgentGate';
import React, { useEffect, useState } from 'react';
import { useBudget } from '../hooks/useBudget';

const CAT_COLORS = {
  'Venue':            '#e0728a',
  'Catering':         '#f5a623',
  'Decoration':       '#9b87f5',
  'Photography':      '#3fcf8e',
  'Music & DJ':       '#5bc4e0',
  'Attire':           '#f06060',
  'Invitations':      '#d4a84b',
  'Transport':        '#88c75a',
  'Accommodation':    '#e891c8',
  'Gifts & Favours':  '#6ab0f5',
  'Mehendi & Beauty': '#f5c842',
  'Pandit & Rituals': '#ff9966',
  'Miscellaneous':    '#888780',
};

const fmt = (n) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;

export default function BudgetTracker() {
  const { hasPlan, confirmed } = usePlan();
  if (!hasPlan) return <AgentGate agentName="Budget Tracker" icon="" />;

  const { budget, summary, categories, suggestions, loading, sugLoading, error, load, setTotal, addEntry, updateEntry, deleteEntry, loadSuggestions } = useBudget();
  const showBudget = Object.values(confirmed || {}).some(Boolean);

  const [tab, setTab] = useState('overview');
  const [editBudget, setEditBudget] = useState(false);
  const [newTotal, setNewTotal] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ category:'Venue', description:'', vendor:'', amount:'', paid:false, note:'' });
  const [filterCat, setFilterCat] = useState('All');

  useEffect(() => { load(); }, [load, confirmed]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    await addEntry(form);
    setForm({ category:'Venue', description:'', vendor:'', amount:'', paid:false, note:'' });
    setFormOpen(false);
  };

  const handleSetTotal = async () => {
    if (!newTotal || isNaN(newTotal)) return;
    await setTotal(parseInt(newTotal));
    setEditBudget(false);
    setNewTotal('');
  };

  if (loading) return (
    <>
      <div className="page-header"><h1 className="page-header__title">Budget <em>Tracker</em></h1></div>
      <div className="content"><div className="empty"><span className="empty__icon"></span>Loading budget...</div></div>
    </>
  );

  const entries = budget?.entries || [];
  const filteredEntries = filterCat === 'All' ? entries : entries.filter(e => e.category === filterCat);
  const pct = summary?.pctUsed || 0;
  const isOver = summary?.remaining < 0;
  const topCategories = summary
    ? Object.entries(summary.byCategory)
        .filter(([,v]) => v.spent > 0)
        .sort((a,b) => b[1].spent - a[1].spent)
    : [];

  const TABS = ['overview','expenses','insights'];

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Agent 03</p>
        <h1 className="page-header__title">Budget <em>Tracker</em></h1>
        <p className="page-header__sub">Track every rupee. Real-time cost breakdown across all wedding categories with AI saving suggestions.</p>
      </div>

      <div className="content">
        {error && <div className="error-box">{error}</div>}

        <div className="card" style={{ marginBottom:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div>
              <p style={{ fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Total Wedding Budget</p>
              {editBudget ? (
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input className="input" type="number" value={newTotal} onChange={e => setNewTotal(e.target.value)} placeholder="e.g. 2000000" style={{ width:180, height:36 }} />
                  <button className="btn btn--primary" style={{ height:36, padding:'0 16px', fontSize:13 }} onClick={handleSetTotal}>Save</button>
                  <button className="btn btn--dark" style={{ height:36, padding:'0 12px', fontSize:13 }} onClick={() => setEditBudget(false)}>Cancel</button>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:300, color:'var(--text-primary)' }}>{fmt(summary?.totalBudget||0)}</span>
                  <button className="btn btn--dark" style={{ height:30, padding:'0 12px', fontSize:12 }} onClick={() => { setEditBudget(true); setNewTotal(summary?.totalBudget||''); }}>Edit</button>
                </div>
              )}
            </div>

            {showBudget && (
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Remaining</p>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:300, color: isOver ? 'var(--red)' : 'var(--green)' }}>{fmt(Math.abs(summary?.remaining||0))}{isOver ? ' over' : ' left'}</span>
              </div>
            )}
          </div>

          {showBudget ? (
            <>
              <div style={{ background:'var(--bg-elevated)', borderRadius:8, height:12, overflow:'hidden', marginBottom:8 }}>
                <div style={{ width:`${Math.min(pct,100)}%`, height:'100%', background: isOver ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--rose)', borderRadius:8, transition:'width 0.6s ease' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-muted)' }}>
                <span>{pct}% expected ({fmt(summary?.spent||0)})</span>
                <span style={{ color: isOver ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--text-muted)' }}>
                  {isOver ? 'Over budget' : pct > 80 ? 'Nearly exhausted' : 'On track'}
                </span>
              </div>
            </>
          ) : (
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>Confirm an agent selection to start tracking expected budget.</p>
          )}
        </div>

        {showBudget && (
          <div className="stat-grid" style={{ marginBottom:24 }}>
            {[
              { l:'Expected total', v: fmt(summary?.spent||0),  c:'var(--rose)'   },
              { l:'Paid',          v: fmt(summary?.paid||0),    c:'var(--green)'  },
              { l:'Unpaid (due)',  v: fmt(summary?.unpaid||0),  c:'var(--amber)'  },
              { l:'# Expenses',    v: entries.length,          c:'var(--purple)' },
            ].map(s => (
              <div className="stat-card" key={s.l}>
                <span className="stat-card__val" style={{ color:s.c, fontSize:'1.5rem' }}>{s.v}</span>
                <span className="stat-card__label">{s.l}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`btn ${tab === t ? 'btn--primary' : 'btn--dark'}`}
              style={{ flex:1, fontSize:13, textTransform:'capitalize' }}>
              {{ overview:'Overview', expenses:'Expenses', insights:'AI Insights' }[t]}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="animate-in">
            {topCategories.length === 0 ? (
              <div className="empty card">
                <span className="empty__icon"></span>
                No expenses added yet. Go to Expenses tab to add your first item.
              </div>
            ) : (
              <div className="card">
                <p style={{ fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>Spending by category</p>
                {topCategories.map(([cat, data]) => {
                  const pctCat = summary.totalBudget > 0 ? (data.spent / summary.totalBudget) * 100 : 0;
                  const color  = CAT_COLORS[cat] || 'var(--rose)';
                  return (
                    <div key={cat} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{cat}</span>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{pctCat.toFixed(1)}%</span>
                          <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{fmt(data.spent)}</span>
                        </div>
                      </div>
                      <div style={{ background:'var(--bg-elevated)', borderRadius:6, height:8, overflow:'hidden' }}>
                        <div style={{ width:`${Math.min(pctCat,100)}%`, height:'100%', background:color, borderRadius:6, transition:'width 0.5s ease', opacity:0.85 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'expenses' && (
          <div className="animate-in">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
              <select className="input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width:'auto', height:36, fontSize:13 }}>
                <option value="All">All categories</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <button className="btn btn--primary" style={{ height:36, fontSize:13 }} onClick={() => setFormOpen(!formOpen)}>
                {formOpen ? 'Cancel' : '+ Add Expense'}
              </button>
            </div>

            {formOpen && (
              <div className="card animate-in" style={{ marginBottom:16 }}>
                <form onSubmit={handleAddEntry}>
                  <div className="form-grid" style={{ marginBottom:14 }}>
                    <div className="field">
                      <label className="label">Category</label>
                      <select className="input" value={form.category} onChange={setF('category')}>
                        {categories.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="label">Amount *</label>
                      <input className="input" type="number" min="0" value={form.amount} onChange={setF('amount')} placeholder="e.g. 150000" required />
                    </div>
                    <div className="field field--full">
                      <label className="label">Description *</label>
                      <input className="input" value={form.description} onChange={setF('description')} placeholder="e.g. Grand Marigold Palace booking advance" required />
                    </div>
                    <div className="field">
                      <label className="label">Vendor <span>(optional)</span></label>
                      <input className="input" value={form.vendor} onChange={setF('vendor')} placeholder="e.g. Grand Marigold Palace" />
                    </div>
                    <div className="field">
                      <label className="label">Note <span>(optional)</span></label>
                      <input className="input" value={form.note} onChange={setF('note')} placeholder="Any note" />
                    </div>
                    <div className="field" style={{ flexDirection:'row', alignItems:'center', gap:10, gridColumn:'1/-1' }}>
                      <input type="checkbox" id="paid" checked={form.paid} onChange={setF('paid')} style={{ accentColor:'var(--green)', width:16, height:16 }} />
                      <label htmlFor="paid" style={{ fontSize:14, color:'var(--text-secondary)', cursor:'pointer' }}>Mark as paid</label>
                    </div>
                  </div>
                  <button className="btn btn--primary btn--full" type="submit">Add Expense</button>
                </form>
              </div>
            )}

            {filteredEntries.length === 0 ? (
              <div className="empty card">
                <span className="empty__icon"></span>
                {filterCat === 'All' ? 'No expenses yet. Add your first one above.' : `No expenses in ${filterCat}.`}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {filteredEntries.map((e,i) => (
                  <div key={e._id} className="card animate-in" style={{ padding:'14px 18px', animationDelay:`${i*0.04}s` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ width:10, height:10, borderRadius:'50%', background:CAT_COLORS[e.category]||'var(--rose)', display:'inline-block', flexShrink:0 }} />
                          <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{e.category}</span>
                          <span className={`badge ${e.paid ? 'badge--green' : 'badge--amber'}`} style={{ fontSize:10 }}>
                            {e.paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                        <p style={{ fontWeight:500, fontSize:14, color:'var(--text-primary)', marginBottom:2 }}>{e.description}</p>
                        {e.vendor && <p style={{ fontSize:12, color:'var(--text-muted)' }}>{e.vendor}</p>}
                        {e.note   && <p style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>{e.note}</p>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:300, color:'var(--text-primary)' }}>{fmt(e.amount)}</span>
                        <button onClick={() => updateEntry(e._id, { paid: !e.paid })}
                          className={`badge ${e.paid ? 'badge--green' : 'badge--amber'}`}
                          style={{ cursor:'pointer', border:'none', fontSize:11 }}>
                          {e.paid ? 'Paid' : 'Mark paid'}
                        </button>
                        <button onClick={() => deleteEntry(e._id)}
                          style={{ width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}
                          onMouseEnter={el => el.target.style.background='var(--red-dim)'}
                          onMouseLeave={el => el.target.style.background='none'}>X</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'insights' && (
          <div className="animate-in">
            <div className="agent-note" style={{ marginBottom:20 }}>
              <span className="agent-note__icon">!</span>
              <div>
                <p className="agent-note__label">HeartBound IQ Budget Agent</p>
                <p className="agent-note__text">
                  {isOver
                    ? `You are ${fmt(Math.abs(summary.remaining))} over budget. Here are AI-powered tips to bring costs down.`
                    : pct > 80
                    ? `You have used ${pct}% of your budget. Consider these tips to manage remaining expenses.`
                    : `Budget looks healthy at ${pct}% used. Here are tips to save even more on your wedding.`}
                </p>
              </div>
            </div>

            <button className="btn btn--primary btn--full" style={{ marginBottom:20 }} onClick={loadSuggestions} disabled={sugLoading}>
              {sugLoading ? <><span className="spinner"/> Getting AI suggestions...</> : 'Get AI Saving Suggestions'}
            </button>

            {suggestions.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {suggestions.map((tip, i) => (
                  <div key={i} className="card animate-in" style={{ animationDelay:`${i*0.1}s`, display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--gold-dim)', border:'1px solid rgba(212,168,75,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'var(--gold)', flexShrink:0, fontFamily:'var(--font-display)' }}>
                      {i+1}
                    </div>
                    <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.6, paddingTop:3 }}>{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {suggestions.length === 0 && !sugLoading && (
              <div className="empty card">
                <span className="empty__icon"></span>
                Click the button above to get personalised AI saving tips for your wedding.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
