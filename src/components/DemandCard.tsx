import { useNavigate } from 'react-router-dom';
import { formatPrice, timeAgo } from '../lib/format';
import { isLoggedIn } from '../lib/auth';
import { showToast } from '../lib/toastBus';
import type { Demand } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  Grains: 'fa-wheat-awn',
  Vegetables: 'fa-apple-whole',
  Fertilizers: 'fa-flask',
  Pesticides: 'fa-spray-can-sparkles',
  Consultancy: 'fa-user-tie',
  Veterinary: 'fa-stethoscope',
  'Equipment Hire': 'fa-tractor',
  default: 'fa-clipboard-list',
};

export function DemandCard({ demand }: { demand: Demand }) {
  const navigate = useNavigate();
  const icon = CATEGORY_ICONS[demand.category] || CATEGORY_ICONS.default;

  function handleRespond(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn()) {
      showToast('Please login to respond to a demand.', 'warning');
      navigate('/login');
      return;
    }
    navigate(`/demands/${demand.id}`);
  }

  return (
    <div className="demand-card" onClick={() => navigate(`/demands/${demand.id}`)}>
      <div className="demand-tag">
        <i className={`fa-solid ${icon}`}></i> {demand.category}
      </div>
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
        <button className="respond-btn" onClick={handleRespond}>
          <i className="fa-solid fa-reply"></i> Respond
        </button>
      </div>
    </div>
  );
}
