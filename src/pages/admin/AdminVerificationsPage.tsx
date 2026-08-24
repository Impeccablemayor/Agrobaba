import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminVerifications } from '../../hooks/queries/useAdmin';
import {
  approveBusinessVerification, approveVerification,
  getVerificationHistory, rejectBusinessVerification, rejectVerification,
} from '../../lib/verification';
import { roleLabel, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { VerificationHistoryEntry } from '../../types';

function DocPreview({ label, value, onZoom }: { label: string; value: string | null; onZoom: (src: string) => void }) {
  if (!value) return null;
  return (
    <div className="doc-preview">
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
      {value.startsWith('data:image') ? (
        <img src={value} alt={label} loading="lazy" decoding="async" onClick={() => onZoom(value)} />
      ) : (
        <a href={value} target="_blank" rel="noreferrer" className="btn-outline btn-sm btn-inline">
          <i className="fa-solid fa-file"></i> View document
        </a>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="account-detail-item">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function AdminVerificationsPage() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<VerificationHistoryEntry[]>([]);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ track: 'identity' | 'business' } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [confirmApprove, setConfirmApprove] = useState<'identity' | 'business' | null>(null);

  const { data: pending = [], isLoading: loading, refetch } = useAdminVerifications();

  useEffect(() => {
    if (!selectedUserId && pending.length > 0) {
      setSelectedUserId(pending[0].userId);
    }
  }, [pending, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) { setHistory([]); return; }
    void getVerificationHistory(selectedUserId).then(setHistory);
  }, [selectedUserId]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  const selected = pending.find((p) => p.userId === selectedUserId) || null;

  async function handleApprove(track: 'identity' | 'business') {
    if (!selected) return;
    setConfirmApprove(null);
    const ok = track === 'identity' ? await approveVerification(selected.userId) : await approveBusinessVerification(selected.userId);
    if (ok) void refetch();
  }

  function startReject(track: 'identity' | 'business') {
    setRejecting({ track });
    setRejectNote('');
  }

  async function confirmReject() {
    if (!rejecting || !selected || !rejectNote.trim()) return;
    const ok = rejecting.track === 'identity'
      ? await rejectVerification(selected.userId, rejectNote.trim())
      : await rejectBusinessVerification(selected.userId, rejectNote.trim());
    if (ok) { setRejecting(null); void refetch(); }
  }

  if (loading) return <PageLoadingSpinner message="Loading pending verifications…" />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Verifications</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Identity (Verified Seller) and business/CAC (Registered Business) are reviewed independently.</p>
      </div>

      {pending.length === 0 ? (
        <div className="empty-cart">
          <i className="fa-solid fa-user-check"></i>
          <p>No pending verifications right now.</p>
        </div>
      ) : (
        <div className="admin-queue-layout">
          <div className="admin-queue-list">
            {pending.map((p) => (
              <div key={p.userId} className={`admin-queue-row ${p.userId === selectedUserId ? 'active' : ''}`} onClick={() => setSelectedUserId(p.userId)}>
                <div className="admin-queue-row-name">{p.name}</div>
                <div className="admin-queue-row-meta">{roleLabel(p.role)} &middot; submitted {timeAgo(p.submittedAt)}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  {p.status === 'pending' && <span className="chip chip-pending">Identity</span>}
                  {p.businessStatus === 'pending' && <span className="chip chip-info">Business</span>}
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="admin-review-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>{selected.name} <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12.5 }}>({roleLabel(selected.role)})</span></h3>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{selected.email} &middot; submitted {timeAgo(selected.submittedAt)}</p>
                </div>
              </div>

              {/* Identity section */}
              <div className="admin-drawer-section">
                <h4 style={{ color: 'var(--primary)' }}>Identity — Verified Seller {selected.status !== 'pending' ? `(${selected.status})` : ''}</h4>
                <div className="account-detail-grid" style={{ marginBottom: 12 }}>
                  <Field label="ID Number" value={selected.idNumber} />
                  <Field label="Business Name" value={selected.businessName} />
                  {selected.role === 'farmer' && <Field label="Farm Name" value={selected.farmName} />}
                  {selected.role === 'farmer' && <Field label="Crops / Livestock" value={selected.cropsOrLivestock} />}
                  {(selected.role === 'agro-dealer' || selected.role === 'service-provider') && (
                    <Field label={selected.role === 'agro-dealer' ? 'Business Address' : 'Business Address / Area of Operation'} value={selected.businessAddress} />
                  )}
                  {selected.role === 'agro-dealer' && <Field label="Product Categories Sold" value={selected.productCategoriesSold} />}
                  <Field label="Bank" value={selected.bankName ? `${selected.bankName} — ${selected.bankAccountName} — ${selected.bankAccountNumber}` : null} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
                  <DocPreview label="Government ID" value={selected.governmentIdDocument} onZoom={setZoomSrc} />
                  {selected.role === 'farmer' && <DocPreview label="Selfie" value={selected.selfieDocument} onZoom={setZoomSrc} />}
                  {selected.role === 'service-provider' && <DocPreview label="Professional Certificates" value={selected.professionalCertificates} onZoom={setZoomSrc} />}
                  {selected.role === 'service-provider' && <DocPreview label="Portfolio" value={selected.portfolioDocument} onZoom={setZoomSrc} />}
                </div>

                {selected.status === 'pending' && (
                  rejecting?.track === 'identity' ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input type="text" placeholder="Reason for rejection (required)..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                        style={{ flex: 1, minWidth: 200, border: '2px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 13 }} />
                      <button className="btn-danger btn-sm btn-inline" disabled={!rejectNote.trim()} onClick={confirmReject}>Confirm Reject</button>
                      <button className="btn-outline btn-sm btn-inline" onClick={() => setRejecting(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary btn-sm btn-inline" onClick={() => setConfirmApprove('identity')}>
                        <i className="fa-solid fa-check"></i> Approve Identity
                      </button>
                      <button className="btn-danger btn-sm btn-inline" onClick={() => startReject('identity')}>
                        <i className="fa-solid fa-xmark"></i> Reject
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Business/CAC section */}
              {selected.businessStatus && (
                <div className="admin-drawer-section">
                  <h4 style={{ color: 'var(--accent)' }}>Business — Registered Business {selected.businessStatus !== 'pending' ? `(${selected.businessStatus})` : ''}</h4>
                  <div className="account-detail-grid" style={{ marginBottom: 12 }}>
                    <Field label="CAC Number" value={selected.cacNumber} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <DocPreview label="CAC Certificate" value={selected.cacDocument} onZoom={setZoomSrc} />
                  </div>

                  {selected.businessStatus === 'pending' && (
                    rejecting?.track === 'business' ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input type="text" placeholder="Reason for rejection (required)..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                          style={{ flex: 1, minWidth: 200, border: '2px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 13 }} />
                        <button className="btn-danger btn-sm btn-inline" disabled={!rejectNote.trim()} onClick={confirmReject}>Confirm Reject</button>
                        <button className="btn-outline btn-sm btn-inline" onClick={() => setRejecting(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-primary btn-sm btn-inline" onClick={() => setConfirmApprove('business')}>
                          <i className="fa-solid fa-check"></i> Approve Business
                        </button>
                        <button className="btn-danger btn-sm btn-inline" onClick={() => startReject('business')}>
                          <i className="fa-solid fa-xmark"></i> Reject
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Review history */}
              <div className="admin-drawer-section">
                <h4>Review history</h4>
                {history.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>No prior review decisions for this user.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {history.map((h, i) => (
                      <div key={i} style={{ fontSize: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                        <strong>{h.event.replace(/_/g, ' ')}</strong> by {h.actor} &middot; {timeAgo(h.createdAt)}
                        {h.detail.includes('note=') && (
                          <div style={{ color: 'var(--muted)', marginTop: 2 }}>Reason: {h.detail.split('note=')[1]}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {zoomSrc && (
        <div className="doc-preview-overlay" onClick={() => setZoomSrc(null)}>
          <img src={zoomSrc} alt="Document preview" />
        </div>
      )}

      <ConfirmDialog
        open={confirmApprove === 'identity'}
        title="Approve identity verification?"
        message={`Grant ${selected?.name} the Verified Seller badge?`}
        confirmLabel="Approve"
        onConfirm={() => handleApprove('identity')}
        onCancel={() => setConfirmApprove(null)}
      />
      <ConfirmDialog
        open={confirmApprove === 'business'}
        title="Approve business verification?"
        message={`Grant ${selected?.name} the Registered Business badge?`}
        confirmLabel="Approve"
        onConfirm={() => handleApprove('business')}
        onCancel={() => setConfirmApprove(null)}
      />
    </div>
  );
}
