import AgentGate from '../components/AgentGate';
import React, { useEffect, useState } from 'react';
import { useGuests } from '../hooks/useGuests';
import { usePlan } from '../context/PlanContext';

const RSVP_BADGE = { confirmed:'badge--green', declined:'badge--red', pending:'badge--amber' };

export default function GuestManager() {
  const { hasPlan } = usePlan();
  if (!hasPlan) return <AgentGate agentName="Guest Manager" icon="" />;
  const { guests, stats, loading, error, load, addGuest, updateGuest, deleteGuest } = useGuests();
  const [guestForm, setGuestForm] = useState({ name:'', email:'', phone:'', dietary:'', side:'both', inviteWithFamily:false });
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, [load]);

  const setG = k => e => setGuestForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!guestForm.name || !guestForm.email) return;
    await addGuest(guestForm);
    setGuestForm({ name:'', email:'', phone:'', dietary:'', side:'both', inviteWithFamily:false });
    setFormOpen(false);
  };

  const filtered = guests.filter(g => filter === 'all' ? true : g.rsvpStatus === filter);

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Agent 02</p>
        <h1 className="page-header__title">Guest <em>Management</em></h1>
        <p className="page-header__sub">Manage your guest list and track RSVPs. Invitations are sent from the Invite tool.</p>
      </div>

      <div className="content">
        <div className="stat-grid">
          {[
            { l:'Total guests', v: stats.total||0,     c:'var(--purple)' },
            { l:'Confirmed',    v: stats.confirmed||0, c:'var(--green)'  },
            { l:'Pending',      v: stats.pending||0,   c:'var(--amber)'  },
            { l:'Invited',      v: stats.invited||0,   c:'var(--rose)'   },
          ].map(s => (
            <div className="stat-card" key={s.l}>
              <span className="stat-card__val" style={{ color: s.c }}>{s.v}</span>
              <span className="stat-card__label">{s.l}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:6 }}>
            {['all','confirmed','pending','declined'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`badge ${filter === f ? 'badge--rose' : 'badge--gray'}`}
                style={{ cursor:'pointer', border:'none', padding:'5px 12px', fontSize:12 }}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn--primary" style={{ height:36, fontSize:13 }} onClick={() => setFormOpen(!formOpen)}>
            {formOpen ? 'Cancel' : '+ Add Guest'}
          </button>
        </div>

        {formOpen && (
          <div className="card animate-in" style={{ marginBottom:16 }}>
            <form onSubmit={handleAdd}>
              <div className="form-grid" style={{ marginBottom:14 }}>
                <div className="field"><label className="label">Name *</label><input className="input" value={guestForm.name} onChange={setG('name')} placeholder="Full name" required /></div>
                <div className="field"><label className="label">Email *</label><input className="input" type="email" value={guestForm.email} onChange={setG('email')} placeholder="email@example.com" required /></div>
                <div className="field"><label className="label">Phone</label><input className="input" value={guestForm.phone} onChange={setG('phone')} placeholder="+91 xxxxxxxxxx" /></div>
                <div className="field"><label className="label">Dietary</label><input className="input" value={guestForm.dietary} onChange={setG('dietary')} placeholder="Veg / Jain / Non-veg" /></div>
                <div className="field">
                  <label className="label">Side</label>
                  <select className="input" value={guestForm.side} onChange={setG('side')}>
                    <option value="bride">Bride's side</option>
                    <option value="groom">Groom's side</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Invite scope</label>
                  <select className="input" value={guestForm.inviteWithFamily ? 'family' : 'solo'} onChange={e => setGuestForm(f => ({ ...f, inviteWithFamily: e.target.value === 'family' }))}>
                    <option value="solo">Only this guest</option>
                    <option value="family">Guest + family</option>
                  </select>
                </div>
              </div>
              <button className="btn btn--primary btn--full" type="submit">Add to Guest List</button>
            </form>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <div className="empty"><span className="empty__icon"></span>Loading guests...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <span className="empty__icon"></span>
            {filter === 'all' ? 'No guests yet. Add your first guest above.' : `No ${filter} guests.`}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map((g,i) => (
              <div key={g._id} className="card animate-in" style={{ padding:'14px 18px', animationDelay:`${i*0.04}s` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--rose-dim)', border:'1px solid var(--border-rose)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'var(--rose)', flexShrink:0 }}>
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontWeight:500, fontSize:14, color:'var(--text-primary)', marginBottom:2 }}>{g.name}</p>
                      <p style={{ fontSize:12, color:'var(--text-muted)' }}>{g.email}</p>
                      {g.rsvpCount !== null && g.rsvpCount !== undefined && g.rsvpStatus !== 'pending' && (
                        <span className="badge badge--gray" style={{ marginTop:4, fontSize:10 }}>Party: {g.rsvpCount}</span>
                      )}
                      {g.dietary && <span className="badge badge--amber" style={{ marginTop:4, fontSize:10 }}>{g.dietary}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span
                      className={`badge ${RSVP_BADGE[g.rsvpStatus]}`}
                      style={{ border:'none', outline:'none', background:'inherit', fontFamily:'var(--font-body)', fontSize:11, fontWeight:500 }}>
                      {g.rsvpStatus.charAt(0).toUpperCase() + g.rsvpStatus.slice(1)}
                    </span>
                    {g.inviteSent && <span className="badge badge--green" style={{ fontSize:10 }}>Invited</span>}
                    <button onClick={() => deleteGuest(g._id)}
                      style={{ width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}
                      onMouseEnter={e => e.target.style.background='var(--red-dim)'}
                      onMouseLeave={e => e.target.style.background='none'}>X</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
