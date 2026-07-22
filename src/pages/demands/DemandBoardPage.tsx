import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDemands } from '../../lib/demands';
import { DemandCard } from '../../components/DemandCard';
import type { Demand } from '../../types';

const CATEGORY_PILLS = [
  { key: 'all', label: 'All', icon: 'fa-border-all' },
  { key: 'Grains', label: 'Grains', icon: 'fa-wheat-awn' },
  { key: 'Vegetables', label: 'Vegetables', icon: 'fa-apple-whole' },
  { key: 'Tubers', label: 'Tubers', icon: 'fa-leaf' },
  { key: 'Fish', label: 'Fish & Aquaculture', icon: 'fa-fish' },
  { key: 'Fertilizers', label: 'Fertilizers', icon: 'fa-flask' },
  { key: 'Equipment Hire', label: 'Equipment', icon: 'fa-tractor' },
  { key: 'Consultancy', label: 'Consultancy', icon: 'fa-user-tie' },
  { key: 'Veterinary', label: 'Veterinary', icon: 'fa-stethoscope' },
];

export default function DemandBoardPage() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [demands, setDemands] = useState<Demand[]>([]);

  useEffect(() => {
    void (async () => {
      const list = await getDemands({ category: category === 'all' ? '' : category, search });
      setDemands(list);
    })();
  }, [category, search]);

  const sortedDemands = useMemo(() => {
    let list = [...demands];
    if (sort === 'budget-high') list = list.sort((a, b) => b.budget - a.budget);
    else if (sort === 'budget-low') list = list.sort((a, b) => a.budget - b.budget);
    else if (sort === 'responses') list = list.sort((a, b) => (b.responses?.length || 0) - (a.responses?.length || 0));
    return list;
  }, [demands, sort]);

  return (
    <>
      <div style={{ background: 'linear-gradient(135deg, #1B6B3A, #0d4a24)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(244,161,29,0.15)', border: '1px solid rgba(244,161,29,0.3)', color: '#F4A11D', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 999, marginBottom: 16 }}>
            <i className="fa-solid fa-clipboard-list"></i> Live Demand Board
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 10 }}>
            What Buyers Need Right Now
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 24, lineHeight: 1.7 }}>
            Browse open demands from buyers across Nigeria. If you can supply it — respond directly and start a deal.
          </p>
          <Link to="/demands/new" className="banner-btn" style={{ background: 'rgba(244,161,29,0.9)', borderColor: 'var(--accent)', color: '#fff', fontSize: 13, padding: '10px 24px' }}>
            <i className="fa-solid fa-pen"></i> Post Your Own Demand
          </Link>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item active">Demand Board</li>
            </ol>
          </nav>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: 240 }}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text" placeholder="Search demands by title, category, location..."
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Sort:</label>
              <select
                value={sort} onChange={(e) => setSort(e.target.value)}
                style={{ border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
              >
                <option value="newest">Newest First</option>
                <option value="budget-high">Budget: High to Low</option>
                <option value="budget-low">Budget: Low to High</option>
                <option value="responses">Most Responses</option>
              </select>
            </div>
          </div>

          <div className="filter-pills">
            {CATEGORY_PILLS.map((p) => (
              <button
                key={p.key}
                className={`filter-pill ${category === p.key ? 'active' : ''}`}
                onClick={() => setCategory(p.key)}
              >
                <i className={`fa-solid ${p.icon}`}></i> {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              {sortedDemands.length} demand{sortedDemands.length !== 1 ? 's' : ''} posted
            </p>
            <Link to="/demands/new" className="btn-primary btn-inline btn-sm">
              <i className="fa-solid fa-plus"></i> Post a Demand
            </Link>
          </div>

          {sortedDemands.length === 0 ? (
            <div className="empty-cart" style={{ gridColumn: '1/-1' }}>
              <i className="fa-solid fa-clipboard-list"></i>
              <p>No demands found. Try a different search or category.</p>
              <Link to="/demands/new" className="btn-primary btn-inline btn-sm">
                <i className="fa-solid fa-plus"></i> Post a Demand
              </Link>
            </div>
          ) : (
            <div className="demand-grid">
              {sortedDemands.map((d) => <DemandCard key={d.id} demand={d} />)}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '32px 24px', marginTop: 16 }}>
        <div className="container">
          <div className="how-respond-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, textAlign: 'center' }}>
            {[
              ['fa-magnifying-glass', '1. Browse Demands', 'Find demands that match what you supply. Filter by category, budget or location.'],
              ['fa-reply', '2. Send Your Offer', 'Click Respond, enter your price and message. A chat thread opens between you and the buyer.'],
              ['fa-handshake', '3. Close the Deal', 'Negotiate via chat. Agree on terms. Buyer pays into escrow. You deliver. Funds released.'],
            ].map(([icon, title, text]) => (
              <div key={title}>
                <div style={{ width: 48, height: 48, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <i className={`fa-solid ${icon}`} style={{ color: 'var(--primary)', fontSize: 18 }}></i>
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{title}</h4>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
