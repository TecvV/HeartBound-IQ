import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AgentGate from '../components/AgentGate';
import { usePlan } from '../context/PlanContext';

export default function InviteAll() {
  const { hasPlan, allConfirmed, cardFinalized, pdfFinalized, websiteFinalized } = usePlan();
  const toolsFinalized = !!(cardFinalized && pdfFinalized && websiteFinalized);

  const [guestCount, setGuestCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    axios.get('/api/guests')
      .then(({ data }) => {
        const guests = data.guests || [];
        setGuestCount(guests.length);
        setPendingCount(guests.filter(g => !g.inviteSent).length);
      })
      .catch(() => {});
  }, []);

  if (!hasPlan) return <AgentGate agentName="Invite All Guests" icon="" />;
  if (!allConfirmed) return <AgentGate agentName="Invite All Guests" icon="" reason="not-confirmed" />;
  if (!toolsFinalized) {
    return (
      <>
        <div className="page-header">
          <p className="page-header__eyebrow">Invite</p>
          <h1 className="page-header__title">Invite <em>All Guests</em></h1>
          <p className="page-header__sub">Finalize the invitation card, PDF, and wedding website to unlock invites.</p>
        </div>
        <div className="content">
          <div className="card card--red animate-in" style={{ textAlign:'center', padding:32 }}>
            <p style={{ fontSize:18, fontWeight:500, color:'var(--red)', marginBottom:10 }}>Locked</p>
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
              Finish these steps first: Invitation Card, Export PDF, Wedding Website.
            </p>
          </div>
        </div>
      </>
    );
  }

  const handleSend = async () => {
    if (pendingCount === 0) { setError('No pending guests to invite.'); return; }
    setSending(true); setError(''); setResult(null);
    try {
      const { data } = await axios.post('/api/orchestrate/invite-all');
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send invites.');
    } finally {
      setSending(false);
      setConfirm(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Invite</p>
        <h1 className="page-header__title">Invite <em>All Guests</em></h1>
        <p className="page-header__sub">Send the finalized wedding card PDF and wedding website (with RSVP) to every guest.</p>
      </div>

      <div className="content">
        <div className="card" style={{ marginBottom:16, padding:'18px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <div>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Guest list</p>
              <p style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:300, color:'var(--text-primary)', lineHeight:1 }}>{guestCount}</p>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>total guests</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Pending invites</p>
              <p style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:300, color:'var(--rose)', lineHeight:1 }}>{pendingCount}</p>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>not yet invited</p>
            </div>
          </div>
        </div>

        <div className="card card--gold" style={{ marginBottom:16 }}>
          <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7 }}>
            This will email every guest: the finalized wedding card PDF and the wedding website (with RSVP).
          </p>
        </div>

        {error && <div className="error-box" style={{ marginBottom:16 }}>{error}</div>}

        {!confirm ? (
          <button className="btn btn--primary btn--full btn--lg" onClick={() => setConfirm(true)} disabled={pendingCount === 0 || sending}>
            Invite All Guests
          </button>
        ) : (
          <div className="card animate-in" style={{ border:'1px solid var(--rose-border)' }}>
            <p style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)', marginBottom:8 }}>Confirm sending invitations</p>
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:16 }}>
              This will send the finalized card, PDF, and website link to <strong style={{ color:'var(--rose)' }}>{pendingCount} guest{pendingCount !== 1 ? 's' : ''}</strong>.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn--primary" style={{ flex:1, height:44 }} onClick={handleSend} disabled={sending}>
                {sending ? 'Sending...' : 'Yes, send now'}
              </button>
              <button className="btn btn--dark" style={{ height:44, padding:'0 20px' }} onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {result && (
          <div className={`card animate-in ${result.failed > 0 ? 'card--red' : 'card--green'}`} style={{ marginTop:16 }}>
            {result.previewMode ? (
              <>
                <p style={{ fontSize:14, fontWeight:500, color:'var(--gold)', marginBottom:6 }}>Preview mode</p>
                <p style={{ fontSize:13, color:'var(--text-secondary)' }}>{result.message}</p>
              </>
            ) : (
              <>
                <p style={{ fontSize:14, fontWeight:500, color: result.failed > 0 ? 'var(--red)' : 'var(--green)', marginBottom:6 }}>
                  {result.failed === 0 ? 'All invitations sent' : `${result.sent} sent, ${result.failed} failed`}
                </p>
                <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
                  {result.sent} invitation{result.sent !== 1 ? 's' : ''} delivered to guest email addresses.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
