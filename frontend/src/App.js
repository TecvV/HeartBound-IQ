import React, { useState } from 'react';
import { usePlan } from './context/PlanContext';
import { useAuth } from './context/AuthContext';
import { PlanProvider } from './context/PlanContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Orchestrator from './pages/Orchestrator';
import VenueScout from './pages/VenueScout';
import CateringAgent from './pages/CateringAgent';
import VendorAgent from './pages/VendorAgent';
import GuestManager from './pages/GuestManager';
import BudgetTracker from './pages/BudgetTracker';
import TimelineAgent from './pages/TimelineAgent';
import CompareMode from './pages/CompareMode';
import ExportPlan from './pages/ExportPlan';
import WeddingWebsite from './pages/WeddingWebsite';
import VirtualCard from './pages/VirtualCard';
import InviteAll from './pages/InviteAll';
import DecisionReview from './pages/DecisionReview';
import './App.css';

const NAV_GROUPS = [
  { label: null, items: [
    { id:'dashboard',   icon:'', label:'Dashboard' },
    { id:'orchestrator',icon:'', label:'Full Plan' },
  ]},
  { label: 'Agents', items: [
    { id:'venue',       icon:'', label:'Venue Scout' },
    { id:'catering',    icon:'', label:'Catering' },
    { id:'vendors',     icon:'', label:'Vendors' },
    { id:'guests',      icon:'', label:'Guests' },
    { id:'budget',      icon:'', label:'Budget' },
    { id:'timeline',    icon:'', label:'Timeline' },
  ]},
  { label: 'Tools', items: [
    { id:'review',      icon:'', label:'Decision Review', needsConfirm: true, needsChanges: true },
    { id:'compare',     icon:'', label:'Compare Mode', locked: false },
    { id:'card',        icon:'', label:'Invitation Card', needsConfirm: true },
    { id:'export',      icon:'', label:'Export PDF', needsCard: true },
    { id:'website',     icon:'', label:'Wedding Website', needsPdf: true },
  ]},
  { label: 'Invite', items: [
    { id:'invite',      icon:'', label:'Invite All Guests', needsToolsFinalized: true },
  ]},
];

function AppShell() {
  const { user, logout } = useAuth();
  const { allConfirmed, hasPlan, cardFinalized, pdfFinalized, websiteFinalized, plan, selections } = usePlan();
  const [page, setPage] = useState('dashboard');

  const toolsFinalized = !!(cardFinalized && pdfFinalized && websiteFinalized);
  const hasChanges = (() => {
    if (!plan || !plan.picks || !selections) return false;
    const keys = ['venue','caterer','photographer','decorator','dj'];
    return keys.some(k => {
      const llm = plan.picks?.[k];
      const userPick = selections?.[k];
      if (!llm || !userPick) return false;
      return llm.name && userPick.name && llm.name !== userPick.name;
    });
  })();

  const PAGES = {
    dashboard:    <Dashboard onNavigate={setPage} />,
    orchestrator: <Orchestrator />,
    venue:        <VenueScout />,
    catering:     <CateringAgent />,
    vendors:      <VendorAgent />,
    guests:       <GuestManager />,
    budget:       <BudgetTracker />,
    timeline:     <TimelineAgent />,
    compare:      <CompareMode />,
    review:       <DecisionReview />,
    card:         <VirtualCard />,
    export:       <ExportPlan />,
    website:      <WeddingWebsite />,
    invite:       <InviteAll />,
  };

  const isLocked = (item) => {
    if (item.needsConfirm && hasPlan && !allConfirmed) return true;
    if (item.needsChanges && !hasChanges) return true;
    if (item.needsCard && !cardFinalized) return true;
    if (item.needsPdf && !pdfFinalized) return true;
    if (item.needsWebsite && !websiteFinalized) return true;
    if (item.needsToolsFinalized && !toolsFinalized) return true;
    return false;
  };

  const lockReason = (item) => {
    if (item.needsConfirm && hasPlan && !allConfirmed) return 'Confirm all vendors first';
    if (item.needsChanges && !hasChanges) return 'Make at least one vendor change to unlock';
    if (item.needsCard && !cardFinalized) return 'Finalize the invitation card first';
    if (item.needsPdf && !pdfFinalized) return 'Finalize the exported PDF first';
    if (item.needsWebsite && !websiteFinalized) return 'Finalize the wedding website first';
    if (item.needsToolsFinalized && !toolsFinalized) return 'Finalize card, PDF, and website first';
    return '';
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <span className="sidebar__name">HeartBound IQ</span>
          </div>
          <p className="sidebar__sub">Multi Agentic AI Wedding Planner</p>
        </div>

        <nav className="sidebar__nav">
          {NAV_GROUPS.map((group, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 && <div style={{ height:1, background:'var(--border)', margin:'8px 4px', opacity:0.5 }} />}
              {group.label && (
                <p style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.12em', padding:'4px 12px', fontWeight:500 }}>
                  {group.label}
                </p>
              )}
              {group.items.map(n => {
                const locked = isLocked(n);
                return (
                  <button key={n.id}
                    className={`sidebar__item ${page===n.id ? 'sidebar__item--active' : ''}`}
                    title={locked ? lockReason(n) : ''}
                    onClick={() => !locked && setPage(n.id)}>
                    <span className="sidebar__icon">{n.icon}</span>
                    {n.label}
                    {locked ? <span style={{ marginLeft:'auto', fontSize:10, opacity:0.5 }}>Locked</span> : null}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div style={{ padding:'12px 10px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', marginBottom:6 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--rose-dim)', border:'1px solid var(--rose-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'var(--rose)', fontFamily:'var(--font-d)', flexShrink:0 }}>
              {user?.name?.charAt(0)?.toUpperCase() || ''}
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize:10, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            style={{ width:'100%', height:32, borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'none', color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-b)', transition:'all 0.15s' }}
            onMouseEnter={e=>{e.target.style.borderColor='var(--red)';e.target.style.color='var(--red)';}}
            onMouseLeave={e=>{e.target.style.borderColor='var(--border)';e.target.style.color='var(--text2)';}}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main">
        {PAGES[page]}
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <p style={{ fontSize:13, color:'var(--text3)', fontFamily:'var(--font-b)' }}>Loading HeartBound IQ...</p>
    </div>
  );

  if (!user) return <AuthPage />;

  return (
    <PlanProvider>
      <AppShell />
    </PlanProvider>
  );
}
