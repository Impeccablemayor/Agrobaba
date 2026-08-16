import { useEffect, useState } from 'react';
import { getAdminPersonalizationOverview } from '../../lib/adminPersonalization';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { AdminPersonalizationOverview } from '../../types';

function StatCard({ icon, color, value, label }: { icon: string; color: string; value: number | string; label: string }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-card-top">
        <div className="admin-stat-card-icon" style={{ background: `${color}1a`, color }}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
      </div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

/** "type_like_this" -> "Type Like This" - matches AdminOverviewPage/AdminActivityPage's
 *  event.replace(/_/g, ' ') convention for raw backend event/type strings. */
function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminPersonalizationPage() {
  const [data, setData] = useState<AdminPersonalizationOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setData(await getAdminPersonalizationOverview());
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoadingSpinner message="Loading personalization overview…" />;
  if (!data) return <p className="text-muted">Unable to load the personalization overview right now.</p>;

  const eventTypeRows = Object.entries(data.eventsByType).sort((a, b) => b[1] - a[1]);
  const coveragePct = data.totalUsers > 0 ? Math.round((data.usersWithLearnedInterest / data.totalUsers) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Personalization</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>How the self-improving recommendation pipeline is actually behaving.</p>
      </div>

      <div className="admin-stats-row">
        <StatCard icon="fa-chart-line" color="var(--primary)" value={data.totalEvents} label="Total behavior events recorded" />
        <StatCard icon="fa-bolt" color="#1d4ed8" value={data.eventsLast7Days} label="Events in the last 7 days" />
        <StatCard icon="fa-users" color="#b9770e" value={`${data.usersWithLearnedInterest} / ${data.totalUsers} (${coveragePct}%)`} label="Users with a learned interest" />
        <StatCard icon="fa-thumbs-down" color="var(--danger)" value={data.notInterestedCount} label='"Not interested" dismissals' />
      </div>

      <div className="admin-panel">
        <div className="admin-panel-hdr">
          <h3>Events by type</h3>
        </div>
        {eventTypeRows.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12.5 }}>No behavior events recorded yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Event type</th><th>Count</th></tr></thead>
              <tbody>
                {eventTypeRows.map(([type, count]) => (
                  <tr key={type} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 700 }}>{humanize(type)}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel-hdr">
          <h3>Top categories by learned interest</h3>
        </div>
        {data.topCategoriesByInterest.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12.5 }}>No learned interest data yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Category</th><th>Total learned score</th></tr></thead>
              <tbody>
                {data.topCategoriesByInterest.map((c) => (
                  <tr key={c.categoryId} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 700 }}>{c.categoryName}</td>
                    <td>{c.totalScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
