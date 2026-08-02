import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPrice, timeAgo, roleLabel } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import { deleteDemand } from '../lib/demands';
import { DEMAND_CATEGORY_ICONS } from '../lib/constants';
import type { Demand } from '../types';

export const DemandCard = memo(function DemandCard({ demand, onDeleted }: { demand: Demand; onDeleted?: (id: string) => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const icon = DEMAND_CATEGORY_ICONS[demand.category] || DEMAND_CATEGORY_ICONS.default;
  const canRespond = !!user && user.role !== 'buyer' && user.id !== demand.buyerId;
  const canModerate = user?.role === 'admin';

  function handleRespond(e: React.MouseEvent) {
    e.stopPropagation();
    navigate(`/demands/${demand.id}`);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this demand? This cannot be undone.')) return;
    const ok = await deleteDemand(demand.id);
    if (ok) onDeleted?.(demand.id);
  }

  return (
    <div className="demand-card" onClick={() => navigate(`/demands/${demand.id}`)}>
      <div className="demand-tag">
        <i className={`fa-solid ${icon}`}></i> {demand.category}
      </div>
      {canModerate && (
        <button
          onClick={handleDelete}
          title="Delete demand (admin)"
          style={{ position: 'absolute', top: 10, right: 10, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 11 }}
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      )}
      {demand.buyerRole && <div className="demand-poster">Demand by {roleLabel(demand.buyerRole)}</div>}
      <h4>{demand.title}</h4>
      <p>
        {demand.description.substring(0, 100)}
        {demand.description.length > 100 ? '...' : ''}
      </p>
      <div className="demand-footer">
        <div>
          <div className="demand-budget">{formatPrice(demand.budget)}</div>
          <div className="demand-meta">
            <i className="fa-solid fa-location-dot"></i> {demand.location} &nbsp;&middot;&nbsp;
            {timeAgo(demand.createdAt)}
          </div>
        </div>
        {canRespond && (
          <button className="respond-btn" onClick={handleRespond}>
            <i className="fa-solid fa-reply"></i> Respond
          </button>
        )}
      </div>
    </div>
  );
});
