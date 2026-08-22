import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllTicketsAdmin, updateTicketStatus } from '../../lib/tickets';
import { timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ActionMenu } from '../../components/ActionMenu';
import type { Ticket, TicketStatus } from '../../types';

const STATUS_CHIP: Record<TicketStatus, string> = { open: 'chip-pending', in_progress: 'chip-info', resolved: 'chip-success' };
const STATUS_LABEL: Record<TicketStatus, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };

export default function AdminTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function load() {
    setLoading(true);
    setTickets(await getAllTicketsAdmin());
    setLoading(false);
  }

  useEffect(() => {
    if (user?.role === 'admin') void load();
  }, [user]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  async function handleStatusChange(ticket: Ticket, status: TicketStatus) {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    const ok = await updateTicketStatus(ticket.id, status);
    setUpdatingStatus(false);
    if (ok) {
      void load();
      if (detail?.id === ticket.id) setDetail({ ...ticket, status });
    }
  }

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.email.toLowerCase().includes(q) && !t.subject.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, search]);

  const statusOptions: TicketStatus[] = ['open', 'in_progress', 'resolved'];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Support Tickets</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Messages submitted through the contact form.</p>
      </div>

      {loading ? (
        <PageLoadingSpinner message="Loading tickets…" />
      ) : (
        <>
          <div className="admin-filters-row">
            <input type="text" placeholder="Search name, email or subject…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 240 }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}>
              <option value="all">All statuses</option>
              {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-headset"></i>
              <p>No tickets match this view.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>From</th><th>Subject</th><th>Status</th><th>Submitted</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} onClick={() => setDetail(t)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.email}</div>
                      </td>
                      <td>{t.subject}</td>
                      <td><span className={`chip ${STATUS_CHIP[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                      <td style={{ color: 'var(--muted)' }}>{timeAgo(t.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <ActionMenu items={statusOptions.filter((s) => s !== t.status).map((s) => ({
                          label: `Mark ${STATUS_LABEL[s].toLowerCase()}`,
                          icon: s === 'resolved' ? 'fa-check' : s === 'in_progress' ? 'fa-spinner' : 'fa-rotate-left',
                          onClick: () => handleStatusChange(t, s),
                        }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {detail && (
        <div className="admin-drawer-overlay" onClick={() => setDetail(null)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-hdr">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>{detail.subject}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{detail.name} &lt;{detail.email}&gt; &middot; {timeAgo(detail.createdAt)}</p>
              </div>
              <button className="admin-drawer-close" onClick={() => setDetail(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="admin-drawer-section">
              <h4>Message</h4>
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{detail.message}</p>
            </div>
            <div className="admin-drawer-section">
              <h4>Status</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    className={`status-tab ${detail.status === s ? 'active' : ''}`}
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(detail, s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
