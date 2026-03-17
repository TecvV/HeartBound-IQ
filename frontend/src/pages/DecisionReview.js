import React, { useMemo } from 'react';
import { usePlan } from '../context/PlanContext';
import AgentGate from '../components/AgentGate';

const CATEGORIES = [
  { key:'venue', label:'Venue', costType:'perHead' },
  { key:'caterer', label:'Caterer', costType:'perHead' },
  { key:'photographer', label:'Photographer', costType:'flat' },
  { key:'decorator', label:'Decorator', costType:'flat' },
  { key:'dj', label:'DJ / Music', costType:'flat' },
];

const fmtMoney = (n) => {
  if (!n && n !== 0) return 'N/A';
  const num = Number(n);
  if (!Number.isFinite(num)) return 'N/A';
  return `Rs ${Math.round(num).toLocaleString('en-IN')}`;
};

const scoreFrom = (item) => {
  if (!item) return null;
  if (typeof item.aiScore === 'number') return item.aiScore;
  if (typeof item.rating === 'number') return Math.round(item.rating * 20);
  return null;
};

const costFrom = (item, guestCount, costType) => {
  if (!item) return null;
  if (costType === 'perHead') {
    const pph = item.pricePerHead || item.pricePerPerson || item.price || null;
    if (!pph || !guestCount) return null;
    return pph * guestCount;
  }
  return item.totalEstimatedCost || item.minPrice || item.price || null;
};

const StatBadge = ({ label, value, sub }) => (
  <div className="card" style={{ padding:'14px 16px' }}>
    <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</p>
    <p style={{ fontSize:18, fontWeight:500, margin:'6px 0 2px' }}>{value}</p>
    {sub && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</p>}
  </div>
);

const MiniBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ height:8, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color }} />
    </div>
  );
};

const Donut = ({ value, total, label }) => {
  const size = 84;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const dash = circ * pct;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke="var(--rose)" strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(-90 ${size/2} ${size/2})`} strokeLinecap="round" />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="var(--text-primary)" fontSize="12">{Math.round(pct*100)}%</text>
      </svg>
      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{label}</div>
    </div>
  );
};

const SparkBars = ({ values }) => {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:36 }}>
      {values.map((v,i) => (
        <div key={i} style={{ width:10, height:Math.max(4, Math.round((v/max)*36)), background:'var(--text-muted)', borderRadius:3 }} />
      ))}
    </div>
  );
};

const RadarChart = ({ labels, llm, user }) => {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const max = 100;
  const angleStep = (Math.PI * 2) / labels.length;

  const point = (idx, value) => {
    const a = idx * angleStep - Math.PI / 2;
    const radius = (value / max) * r;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  };

  const pathFor = (values) => values.map((v,i) => point(i, v || 0)).map((p,i)=> `${i===0?'M':'L'}${p[0]},${p[1]}`).join(' ') + ' Z';

  const grid = [0.25,0.5,0.75,1].map((t,gi) => (
    <circle key={gi} cx={cx} cy={cy} r={r*t} fill="none" stroke="rgba(255,255,255,0.05)" />
  ));

  const axes = labels.map((_,i) => {
    const a = i * angleStep - Math.PI / 2;
    return (
      <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="rgba(255,255,255,0.08)" />
    );
  });

  return (
    <div style={{ display:'flex', gap:18, alignItems:'center' }}>
      <svg width={size} height={size}>
        {grid}
        {axes}
        <path d={pathFor(llm)} fill="rgba(200,200,200,0.12)" stroke="rgba(200,200,200,0.6)" />
        <path d={pathFor(user)} fill="rgba(255,120,150,0.12)" stroke="var(--rose)" />
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:11, color:'var(--text-muted)' }}>
        {labels.map((l,i) => (
          <div key={l} style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ width:10, height:10, borderRadius:'50%', background:'var(--rose)' }} />
            <span>{l}</span>
            <span style={{ marginLeft:'auto', color:'var(--text-primary)' }}>{user[i] || 0}/100</span>
            <span style={{ color:'var(--text-muted)' }}>LLM {llm[i] || 0}/100</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScatterPlot = ({ points, width=360, height=180 }) => {
  const pad = 24;
  const maxX = Math.max(...points.map(p=>p.x), 1);
  const maxY = 100;
  const x = (v) => pad + (v / maxX) * (width - pad*2);
  const y = (v) => height - pad - (v / maxY) * (height - pad*2);

  return (
    <svg width={width} height={height}>
      <line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} stroke="rgba(255,255,255,0.1)" />
      <line x1={pad} y1={pad} x2={pad} y2={height-pad} stroke="rgba(255,255,255,0.1)" />
      {points.map((p, i) => (
        <circle key={i} cx={x(p.x)} cy={y(p.y)} r={5} fill={p.color} opacity={0.9}>
          <title>{p.label} • Cost: {fmtMoney(p.x)} • Quality: {p.y}/100</title>
        </circle>
      ))}
    </svg>
  );
};

export default function DecisionReview() {
  const { hasPlan, plan, selections, allConfirmed } = usePlan();
  if (!hasPlan) return <AgentGate agentName="Decision Review" icon="" />;
  if (!allConfirmed) return <AgentGate agentName="Decision Review" icon="" reason="not-confirmed" />;

  const summary = useMemo(() => {
    const guestCount = plan?.brief?.guestCount || plan?.wedding?.guestCount || 0;
    const rows = CATEGORIES.map((c) => {
      const llm = plan?.picks?.[c.key] || null;
      const user = selections?.[c.key] || null;
      const changed = !!(llm && user && llm.name && user.name && llm.name !== user.name);
      const llmCost = costFrom(llm, guestCount, c.costType);
      const userCost = costFrom(user, guestCount, c.costType);
      const llmScore = scoreFrom(llm);
      const userScore = scoreFrom(user);
      return { ...c, llm, user, changed, llmCost, userCost, llmScore, userScore };
    });

    const hasChanges = rows.some(r => r.changed);

    const sum = (vals) => vals.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);
    const avg = (vals) => {
      const v = vals.filter(v => Number.isFinite(v));
      if (!v.length) return null;
      return Math.round(sum(v)/v.length);
    };

    const llmCosts = rows.map(r => r.llmCost).filter(v => Number.isFinite(v));
    const userCosts = rows.map(r => r.userCost).filter(v => Number.isFinite(v));
    const llmScores = rows.map(r => r.llmScore).filter(v => Number.isFinite(v));
    const userScores = rows.map(r => r.userScore).filter(v => Number.isFinite(v));

    const changedCount = rows.filter(r => r.changed).length;
    const confidence = Math.round((changedCount / rows.length) * 100);

    return {
      rows,
      hasChanges,
      llmTotalCost: llmCosts.length ? sum(llmCosts) : null,
      userTotalCost: userCosts.length ? sum(userCosts) : null,
      llmAvgScore: avg(llmScores),
      userAvgScore: avg(userScores),
      changedCount,
      confidence,
    };
  }, [plan, selections]);

  if (!summary.hasChanges) {
    return (
      <>
        <div className="page-header">
          <p className="page-header__eyebrow">Tools</p>
          <h1 className="page-header__title">Decision <em>Review</em></h1>
          <p className="page-header__sub">This section unlocks only after you change at least one LLM recommendation.</p>
        </div>
        <div className="content">
          <div className="card card--amber" style={{ textAlign:'center', padding:32 }}>
            <p style={{ fontSize:18, fontWeight:500, color:'var(--amber)', marginBottom:10 }}>No changes detected</p>
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
              You have not changed any vendor selections from the initial LLM plan, so there is nothing to compare yet.
            </p>
          </div>
        </div>
      </>
    );
  }

  const costDelta = Number.isFinite(summary.userTotalCost) && Number.isFinite(summary.llmTotalCost)
    ? summary.userTotalCost - summary.llmTotalCost
    : null;
  const scoreDelta = Number.isFinite(summary.userAvgScore) && Number.isFinite(summary.llmAvgScore)
    ? summary.userAvgScore - summary.llmAvgScore
    : null;
  const deltaLabel = costDelta === null && scoreDelta === null
    ? 'N/A'
    : `${costDelta !== null ? (costDelta>=0?'+':'') + fmtMoney(costDelta).replace('Rs ','') : ''}${costDelta !== null && scoreDelta !== null ? ' / ' : ''}${scoreDelta !== null ? (scoreDelta>=0?'+':'') + scoreDelta + 'q' : ''}`;

  const maxCost = Math.max(summary.llmTotalCost || 0, summary.userTotalCost || 0, 1);
  const llmScores = summary.rows.map(r => r.llmScore || 0);
  const userScores = summary.rows.map(r => r.userScore || 0);

  const radarLabels = summary.rows.map(r => r.label);
  const radarLlm = summary.rows.map(r => r.llmScore || 0);
  const radarUser = summary.rows.map(r => r.userScore || 0);

  const scatterPoints = summary.rows.flatMap((r) => {
    const pts = [];
    if (Number.isFinite(r.llmCost) && Number.isFinite(r.llmScore)) {
      pts.push({ x:r.llmCost, y:r.llmScore, color:'rgba(200,200,200,0.9)', label:`LLM ${r.label}` });
    }
    if (Number.isFinite(r.userCost) && Number.isFinite(r.userScore)) {
      pts.push({ x:r.userCost, y:r.userScore, color:'var(--rose)', label:`You ${r.label}` });
    }
    return pts;
  });

  const insightLine = () => {
    if (costDelta === null && scoreDelta === null) return 'Not enough data to compare.';
    const costDir = costDelta === null ? 'cost data missing' : (costDelta >= 0 ? 'more' : 'less');
    const scoreDir = scoreDelta === null ? 'quality data missing' : (scoreDelta >= 0 ? 'higher' : 'lower');
    return `You chose ${costDir} cost with ${scoreDir} quality vs the LLM's picks.`;
  };

  const deltaColor = (cDelta, sDelta) => {
    if (cDelta === null && sDelta === null) return 'var(--text-muted)';
    if (sDelta !== null && sDelta > 0 && cDelta !== null && cDelta <= 0) return 'var(--green)';
    if (sDelta !== null && sDelta < 0 && cDelta !== null && cDelta >= 0) return 'var(--red)';
    return 'var(--text-primary)';
  };

  return (
    <>
      <div className="page-header">
        <p className="page-header__eyebrow">Tools</p>
        <h1 className="page-header__title">Decision <em>Review</em></h1>
        <p className="page-header__sub">Compare LLM recommendations with your final choices in cost and quality.</p>
      </div>

      <div className="content">
        <div className="card card--gold" style={{ marginBottom:16, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Overall delta</p>
            <p style={{ fontSize:18, fontWeight:600, color:deltaColor(costDelta, scoreDelta) }}>{deltaLabel}</p>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>{insightLine()}</p>
          </div>
          <Donut value={summary.userAvgScore || 0} total={100} label="Your Avg Quality" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
          <StatBadge label="LLM Total Cost" value={fmtMoney(summary.llmTotalCost)} sub={`Avg quality: ${summary.llmAvgScore ?? 'N/A'}/100`} />
          <StatBadge label="Your Total Cost" value={fmtMoney(summary.userTotalCost)} sub={`Avg quality: ${summary.userAvgScore ?? 'N/A'}/100`} />
          <StatBadge label="Confidence Score" value={`${summary.confidence}%`} sub={`${summary.changedCount}/${summary.rows.length} categories changed`} />
        </div>

        <div className="card" style={{ marginBottom:16, padding:'14px 16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, alignItems:'center' }}>
            <div>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Cost comparison</p>
              <div style={{ marginTop:8 }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>LLM</p>
                <MiniBar value={summary.llmTotalCost || 0} max={maxCost} color="var(--text-muted)" />
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:'10px 0 4px' }}>You</p>
                <MiniBar value={summary.userTotalCost || 0} max={maxCost} color="var(--rose)" />
              </div>
            </div>
            <div>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>LLM quality spread</p>
              <SparkBars values={llmScores} />
            </div>
            <div>
              <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Your quality spread</p>
              <SparkBars values={userScores} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom:16, padding:'14px 16px' }}>
          <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Radar analysis (quality per category)</p>
          <RadarChart labels={radarLabels} llm={radarLlm} user={radarUser} />
        </div>

        <div className="card" style={{ marginBottom:16, padding:'14px 16px' }}>
          <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Scatter plot (cost vs quality)</p>
          <ScatterPlot points={scatterPoints} />
          <div style={{ display:'flex', gap:12, marginTop:8, fontSize:11, color:'var(--text-muted)' }}>
            <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'rgba(200,200,200,0.9)', marginRight:6 }} />LLM</span>
            <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'var(--rose)', marginRight:6 }} />You</span>
            <span style={{ marginLeft:'auto' }}>Hover dots for tooltips</span>
          </div>
        </div>

        <div className="card" style={{ padding:'0 0 6px 0' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)' }}>
            Detailed comparison
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 0.6fr', gap:8, padding:'10px 16px', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            <span>Category</span>
            <span>LLM Choice</span>
            <span>Your Choice</span>
            <span>Delta</span>
          </div>
          {summary.rows.map((r) => {
            const costDeltaRow = (Number.isFinite(r.userCost) && Number.isFinite(r.llmCost)) ? r.userCost - r.llmCost : null;
            const scoreDeltaRow = (Number.isFinite(r.userScore) && Number.isFinite(r.llmScore)) ? r.userScore - r.llmScore : null;
            const deltaRowLabel = costDeltaRow === null && scoreDeltaRow === null
              ? 'N/A'
              : `${costDeltaRow !== null ? (costDeltaRow>=0?'+':'') + fmtMoney(costDeltaRow).replace('Rs ','') : ''}${costDeltaRow !== null && scoreDeltaRow !== null ? ' / ' : ''}${scoreDeltaRow !== null ? (scoreDeltaRow>=0?'+':'') + scoreDeltaRow + 'q' : ''}`;
            const rowColor = deltaColor(costDeltaRow, scoreDeltaRow);

            return (
              <div key={r.key} style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 0.6fr', gap:8, padding:'10px 16px', borderTop:'1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:500 }}>{r.label}</p>
                  {!r.changed && <p style={{ fontSize:11, color:'var(--text-muted)' }}>No change</p>}
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:500 }}>{r.llm?.name || 'N/A'}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>Cost: {fmtMoney(r.llmCost)}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>Quality: {Number.isFinite(r.llmScore) ? `${r.llmScore}/100` : 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:500 }}>{r.user?.name || 'N/A'}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>Cost: {fmtMoney(r.userCost)}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>Quality: {Number.isFinite(r.userScore) ? `${r.userScore}/100` : 'N/A'}</p>
                </div>
                <div style={{ fontSize:12, fontWeight:600, color: rowColor }} title="Cost/quality delta vs LLM">
                  {deltaRowLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
