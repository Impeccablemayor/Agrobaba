import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdminEmails } from '../../lib/email';
import { timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';

const STATUS_CHIP: Record<string, string> = {
  DELIVERED: 'chip-success',
  SENT: 'chip-info',
  DELAYED: 'chip-pending',
  FAILED: 'chip-danger',
  BOUNCED: 'chip-danger',
  COMPLAINED: 'chip-danger',
};

export default function AdminEmailsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const { data, isLoading: loading } = useQuery({
    queryKey: ['admin', 'emails', page],
    queryFn: () => getAdminEmails(page + 1),
  });

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  if (loading && !data) return <PageLoadingSpinner message="Loading email logs..." />;

  const emails = data?.content || [];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Email Logs</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Track email delivery status for transactional emails</p>
      </div>

      <div className="admin-panel">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Created</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>No emails logged yet</td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr key={email.id}>
                    <td>{email.recipient}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{email.subject}</td>
                    <td>{email.workflow || '-'}</td>
                    <td><span className={`chip ${STATUS_CHIP[email.status] || 'chip-neutral'}`}>{email.status}</span></td>
                    <td>{email.attempts}</td>
                    <td>{timeAgo(email.createdAt)}</td>
                    <td>{timeAgo(email.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
            <button className="btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span style={{ padding: '8px 12px', fontSize: 13 }}>Page {page + 1} of {data.totalPages}</span>
            <button className="btn-outline btn-sm" disabled={page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
