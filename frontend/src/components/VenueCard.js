import React, { useState } from 'react';

const TYPE_LABEL = { banquet_hall:'Banquet Hall', farmhouse:'Farmhouse', hotel:'Hotel', resort:'Resort', outdoor:'Outdoor', heritage:'Heritage' };

export default function VenueCard({ venue, rank }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor = venue.aiScore >= 80 ? 'var(--green)' : venue.aiScore >= 60 ? 'var(--amber)' : 'var(--rose)';

  return (
    <div className="vc animate-in" style={{ animationDelay: `${(rank-1)*0.06}s` }}>
      {rank === 1 && <div className="vc__crown">Top Pick</div>}
      <div className="vc__row">
        <div className="vc__left">
          <span className="vc__rank">#{rank}</span>
          <div>
            <h3 className="vc__name">{venue.name}</h3>
            <p className="vc__addr">{venue.address}</p>
          </div>
        </div>
        <div className="vc__score" style={{ color: scoreColor }}>
          <span className="vc__score-num">{venue.aiScore}</span>
          <span className="vc__score-lbl">AI Score</span>
        </div>
      </div>

      <div className="vc__stats">
        {[
          { l:'Est. Total', v: venue.totalEstimatedCost ? `Rs ${venue.totalEstimatedCost.toLocaleString('en-IN')}` : '-' },
          { l:'Per Head',   v: venue.pricePerHead ? `Rs ${venue.pricePerHead.toLocaleString('en-IN')}` : '-' },
          { l:'Capacity',   v: venue.capacity || '-' },
          { l:'Rating',     v: venue.rating ? `Star ${venue.rating}` : '-' },
        ].map(s => (
          <div className="vc__stat" key={s.l}>
            <span className="vc__stat-l">{s.l}</span>
            <span className="vc__stat-v">{s.v}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
        <span className="badge badge--rose">{TYPE_LABEL[venue.venueType] || venue.venueType}</span>
        {venue.distanceFromCenter && <span className="badge badge--gray">{venue.distanceFromCenter} km</span>}
        {venue.reviewCount > 0 && <span className="badge badge--gray">{venue.reviewCount} reviews</span>}
      </div>

      {venue.aiRecommendation && (
        <div className="vc__ai">
          <span className="vc__ai-badge">HeartBound IQ Agent</span>
          <p className="vc__ai-text">{venue.aiRecommendation}</p>
        </div>
      )}

      {venue.amenities?.length > 0 && (
        <button className="vc__toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide amenities' : `View ${venue.amenities.length} amenities`}
        </button>
      )}
      {expanded && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
          {venue.amenities.map((a,i) => <span key={i} className="badge badge--gray">{a}</span>)}
        </div>
      )}
    </div>
  );
}
