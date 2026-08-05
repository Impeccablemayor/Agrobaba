import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminOverview } from '../../lib/adminOverview';
import { formatPrice, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { AdminOverview } from '../../types';

function StatCard({ to, icon, color, value, label }: { to: string; icon: string; color: string; value: number | string; label: string }) {
  return (
    <Link to={to} className="admin-stat-card is-link">
      <div className="admin-stat-card-top">
        <div className="admin-stat-card-icon" style={{ background: `${color}1a`, color }}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
        <i className="fa-solid fa-arrow-right" style={{ color: 'var(--muted)', fontSize: 11 }}></i>
      </div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setData(await getAdminOverview());
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoadingSpinner message="Loading overview…" />;
  if (!data) return <p className="text-muted">Unable to load the overview right now.</p>;

  const nothingNeedsAttention = data.paymentSubmissionsCount === 0 && data.pendingVerificationsCount === 0
    && data.openTicketsCount === 0 && data.flashSalesSoon.length === 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Overview</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>What needs your attention right now.</p>
      </div>

      <div className="admin-stats-row">
        <StatCard to="/admin/orders?tab=payments" icon="fa-money-check-dollar" color="#b9770e" value={data.paymentSubmissionsCount} label="Payment submissions awaiting review" />
        <StatCard to="/admin/verifications" icon="fa-user-check" color="var(--primary)" value={data.pendingVerificationsCount} label="Verification requests awaiting review" />
        <StatCard to="/admin/tickets" icon="fa-headset" color="#1d4ed8" value={data.openTicketsCount} label="Open support tickets" />
        <StatCard to="/admin/flash-sales" icon="fa-fire" color="var(--danger)" value={data.flashSalesSoon.length} label="Flash sales starting/ending soon" />
      </div>

      {nothingNeedsAttention && (
        <div className="admin-panel" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: 26, color: 'var(--primary)', marginBottom: 8, display: 'block' }}></i>
          <p style={{ fontWeight: 700, marginBottom: 2 }}>Nothing needs attention right now.</p>
          <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>Payment reviews, verifications, tickets and flash sales are all caught up.</p>
        </div>
      )}

      {data.paymentSubmissionsCount > 0 && (
        <div className="admin-panel">
          <div className="admin-panel-hdr">
            <h3>Payment submissions awaiting review</h3>
            <Link to="/admin/orders?tab=payments" className="see-all" style={{ fontSize: 12 }}>Review all <i className="fa-solid fa-chevron-right"></i></Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Invoice</th><th>Buyer</th><th>Total</th><th>Payment mode</th><th>Submitted</th></tr></thead>
              <tbody>
                {data.paymentSubmissions.slice(0, 6).map((p) => (
                  <tr key={p.orderId} onClick={() => { window.location.href = `/admin/orders?tab=payments&search=${encodeURIComponent(p.invoiceNumber)}`; }}>
                    <td style={{ fontFamily: 'monospace' }}>{p.invoiceNumber}</td>
                    <td>{p.buyerName}</td>
                    <td style={{ fontWeight: 700 }}>{formatPrice(p.total)}</td>
                    <td>{p.paymentMode || '—'}</td>
                    <td>{p.paymentDate ? timeAgo(p.paymentDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.flashSalesSoon.length > 0 && (
        <div className="admin-panel">
          <div className="admin-panel-hdr">
            <h3>Flash sales starting or ending soon</h3>
            <Link to="/admin/flash-sales" className="see-all" style={{ fontSize: 12 }}>Manage <i className="fa-solid fa-chevron-right"></i></Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.flashSalesSoon.map((f) => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{f.title}</div>
                <span className={`chip ${f.phase === 'starting' ? 'chip-info' : 'chip-pending'}`}>
                  {f.phase === 'starting' ? `Starts ${timeAgo(f.startAt)}` : `Ends ${timeAgo(f.endAt)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-panel">
        <div className="admin-panel-hdr">
          <h3>Recent admin actions</h3>
          <Link to="/admin/activity" className="see-all" style={{ fontSize: 12 }}>View all <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        {data.recentActions.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12.5 }}>No admin activity recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.recentActions.slice(0, 8).map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                <span><strong>{a.event.replace(/_/g, ' ')}</strong> <span style={{ color: 'var(--muted)' }}>by {a.actor}</span></span>
                <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
