import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { approveVerification, getPendingVerifications, rejectVerification } from '../../lib/verification';
import { roleLabel, timeAgo } from '../../lib/format';
import type { PendingVerification } from '../../types';

export default function AdminVerificationsPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  async function load() {
    setLoading(true);
    const data = await getPendingVerifications();
    setPending(data);
    setLoading(false);
  }

  useEffect(() => {
    if (user?.role === 'admin') void load();
  }, [user]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  async function handleApprove(userId: string) {
    if (await approveVerification(userId)) void load();
  }

  function startReject(userId: string) {
    setRejectingId(userId);
    setRejectNote('');
  }

  async function confirmReject(userId: string) {
    if (!rejectNote.trim()) return;
    if (await rejectVerification(userId, rejectNote.trim())) {
      setRejectingId(null);
      void load();
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">Verification Review</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Pending Verifications</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Review submissions from farmers, dealers, and service-providers.</p>
        </div>

        {loading ? (
          <div className="empty-cart">
            <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
            <p>Loading pending verifications…</p>
          </div>
        ) : pending.length === 0 ? (
          <div className="empty-cart">
            <i className="fa-solid fa-user-check"></i>
            <p>No pending verifications right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pending.map((p) => (
              <div key={p.userId} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{p.name} <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12 }}>({roleLabel(p.role)})</span></h3>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{p.email} &middot; submitted {timeAgo(p.submittedAt)}</p>
                  </div>
                </div>

                <div className="account-detail-grid" style={{ marginBottom: 12 }}>
                  <div className="account-detail-item">
                    <div className="label">Business Name</div>
                    <div className="value">{p.businessName || '—'}</div>
                  </div>
                  <div className="account-detail-item">
                    <div className="label">ID / Registration Number</div>
                    <div className="value">{p.idNumber || '—'}</div>
                  </div>
                </div>

                {p.document && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Submitted Document</div>
                    {p.document.startsWith('data:image') ? (
                      <img src={p.document} alt="Verification document" style={{ maxWidth: 240, maxHeight: 240, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                    ) : (
                      <a href={p.document} target="_blank" rel="noreferrer" className="btn-outline btn-sm btn-inline">
                        <i className="fa-solid fa-file"></i> View Document
                      </a>
                    )}
                  </div>
                )}

                {rejectingId === p.userId ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="text" placeholder="Reason for rejection..." value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      style={{ flex: 1, minWidth: 200, border: '2px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 13 }}
                    />
                    <button className="btn-danger btn-sm btn-inline" onClick={() => confirmReject(p.userId)}>Confirm Reject</button>
                    <button className="btn-outline btn-sm btn-inline" onClick={() => setRejectingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary btn-sm btn-inline" onClick={() => handleApprove(p.userId)}>
                      <i className="fa-solid fa-check"></i> Approve
                    </button>
                    <button className="btn-danger btn-sm btn-inline" onClick={() => startReject(p.userId)}>
                      <i className="fa-solid fa-xmark"></i> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
