import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteDemand, getMyDemands } from '../../lib/demands';
import { formatPrice, timeAgo } from '../../lib/format';
import { DEMAND_CATEGORY_ICONS } from '../../lib/constants';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { Demand } from '../../types';

export default function MyDemandsPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeModal, setActiveModal] = useState<Demand | null>(null);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDemands() {
      setLoading(true);
      const data = await getMyDemands();
      if (active) {
        setDemands(data);
        setLoading(false);
      }
    }

    void loadDemands();
    return () => { active = false; };
  }, [refreshKey]);

  const openCount = demands.filter((d) => d.status === 'open').length;
  const totalResponses = demands.reduce((s, d) => s + (d.responses ? d.responses.length : 0), 0);
  const totalBudget = demands.reduce((s, d) => s + (d.budget || 0), 0);

  const stats = [
    { icon: 'fa-clipboard-list', label: 'Total Demands', value: demands.length, color: 'var(--primary)' },
    { icon: 'fa-lock-open', label: 'Open', value: openCount, color: 'var(--success)' },
    { icon: 'fa-reply', label: 'Responses', value: totalResponses, color: 'var(--accent)' },
    { icon: 'fa-naira-sign', label: 'Total Budget', value: formatPrice(totalBudget), color: 'var(--primary)' },
  ];

  function handleDelete(id: string) {
    if (confirm('Delete this demand? This cannot be undone.')) {
      deleteDemand(id);
      setRefreshKey((k) => k + 1);
    }
  }

  function messageResponder(responderId: string, responderName: string) {
    navigate(`/messages/${responderId}?partnerName=${encodeURIComponent(responderName)}`);
  }

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account', href: '/account' }, { label: 'My Demands' }]} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>My Demands</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Track the demands you've posted and view responses from sellers.</p>
          </div>
          <Link to="/demands/new" className="btn-primary btn-inline">
            <i className="fa-solid fa-plus"></i> Post New Demand
          </Link>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading your demands…" />
        ) : (
          <>
          <div className="stats-grid" style={{ marginBottom: 28 }}>
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon"><i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
          </div>

          {demands.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-clipboard-list"></i>
              <p>You haven't posted any demands yet. Tell sellers what you need!</p>
              <Link to="/demands/new" className="btn-primary btn-inline btn-sm">
                <i className="fa-solid fa-plus"></i> Post Your First Demand
              </Link>
            </div>
          ) : (
            <div className="demand-grid">
              {demands.map((d) => {
                const icon = DEMAND_CATEGORY_ICONS[d.category] || DEMAND_CATEGORY_ICONS.default;
                const respCount = d.responses ? d.responses.length : 0;
                return (
                  <div className="demand-card" key={d.id}>
                    <div className="demand-tag"><i className={`fa-solid ${icon}`}></i> {d.category}</div>
                    <h4>{d.title}</h4>
                    <p>{d.description.substring(0, 100)}{d.description.length > 100 ? '...' : ''}</p>
                    <div className="demand-footer">
                      <div>
                        <div className="demand-budget">{formatPrice(d.budget)}</div>
                        <div className="demand-meta">
                          <i className="fa-solid fa-location-dot"></i> {d.location} &middot; {timeAgo(d.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <button onClick={() => setActiveModal(d)} className="btn-secondary btn-sm btn-inline" style={{ flex: 1, padding: 6 }}>
                        <i className="fa-solid fa-reply"></i> {respCount} Response{respCount !== 1 ? 's' : ''}
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="btn-danger btn-sm btn-inline" style={{ padding: '6px 12px', width: 'auto' }}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
        )}
      </div>

      {activeModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
        >
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Responses</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--muted)', cursor: 'pointer' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ padding: 24 }}>
              {(!activeModal.responses || activeModal.responses.length === 0) ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <i className="fa-regular fa-comment-dots" style={{ fontSize: 40, color: 'var(--border-mid)', marginBottom: 12 }}></i>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>No responses yet for "<strong>{activeModal.title}</strong>".</p>
                  <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>Sellers will respond soon. You'll get a message when they do.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    <strong>{activeModal.responses.length}</strong> response{activeModal.responses.length !== 1 ? 's' : ''} for "<strong>{activeModal.title}</strong>"
                  </p>
                  {activeModal.responses.map((r) => (
                    <div key={r.id} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-user" style={{ color: 'var(--primary)', fontSize: 14 }}></i>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.responderName}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{r.responderRole || 'Seller'} &middot; {timeAgo(r.createdAt)}</div>
                          </div>
                        </div>
                        {r.price > 0 && <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 15 }}>{formatPrice(r.price)}</div>}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{r.message}</p>
                      <button
                        onClick={() => { setActiveModal(null); messageResponder(r.responderId, r.responderName); }}
                        className="btn-secondary btn-sm btn-inline" style={{ width: '100%' }}
                      >
                        <i className="fa-regular fa-comments"></i> Message {r.responderName.split(' ')[0]}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
