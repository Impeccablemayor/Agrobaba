import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAuditLog } from '../../lib/adminOverview';
import { formatDate } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { AuditLogEntry } from '../../types';

export default function AdminActivityPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      void (async () => { setLoading(true); setEntries(await getAuditLog(200)); setLoading(false); })();
    }
  }, [user]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.trim().toLowerCase();
    return entries.filter((e) => e.event.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q));
  }, [entries, search]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Admin Activity</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>An audit trail of admin actions and security-relevant events. Most recent 200.</p>
      </div>

      {loading ? (
        <PageLoadingSpinner message="Loading activity…" />
      ) : (
        <>
          <div className="admin-filters-row">
            <input type="text" placeholder="Search event, actor or detail…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
          </div>

          {filtered.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-clock-rotate-left"></i>
              <p>No activity recorded yet.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Event</th><th>Actor</th><th>Detail</th><th>When</th></tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{e.event.replace(/_/g, ' ')}</td>
                      <td>{e.actor}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{e.detail}</td>
                      <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
