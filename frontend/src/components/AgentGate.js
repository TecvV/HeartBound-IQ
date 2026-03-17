import React from 'react';

export default function AgentGate({ agentName, icon, reason }) {
  const isLocked = reason === 'not-confirmed';
  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">{icon} {agentName}</p>
        <h1 className="page-header__title"><em>{agentName}</em></h1>
      </div>
      <div className="content">
        <div className={`card ${isLocked ? 'card--red' : 'card--amber'} animate-in`} style={{ textAlign:'center', padding:36 }}>
          <p style={{ fontSize:28, marginBottom:14 }}>Locked</p>
          <p style={{ fontSize:16, fontWeight:500, color: isLocked ? 'var(--red)' : 'var(--amber)', marginBottom:10 }}>
            {isLocked ? 'Confirm all vendors first' : 'Run the Full Plan first'}
          </p>
          <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.8, maxWidth:480, margin:'0 auto' }}>
            {isLocked
              ? <>The <strong>{agentName}</strong> is only available once all 5 vendors have been confirmed on the Dashboard.<br/>Go to <strong>Dashboard</strong> and finalize each vendor with the <strong>Finalize</strong> button on their agent page.</>
              : <>The <strong>{agentName}</strong> agent requires the Orchestrator to run first.<br/>Go to <strong>Full Plan</strong> in the sidebar, enter your wedding brief, and generate your plan.</>
            }
          </p>
        </div>
      </div>
    </>
  );
}
