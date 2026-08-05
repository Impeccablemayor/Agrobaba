import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  approveBusinessVerification, approveVerification,
  getPendingVerifications, rejectBusinessVerification, rejectVerification,
} from '../../lib/verification';
import { roleLabel, timeAgo } from '../../lib/format';
import type { PendingVerification } from '../../types';

function DocLink({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      {value.startsWith('data:image') ? (
        <img src={value} alt={label} style={{ maxWidth: 160, maxHeight: 160, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
      ) : (
        <a href={value} target="_blank" rel="noreferrer" className="btn-outline btn-sm btn-inline">
          <i className="fa-solid fa-file"></i> View
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
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<{ userId: string; track: 'identity' | 'business' } | null>(null);
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
  async function handleApproveBusiness(userId: string) {
    if (await approveBusinessVerification(userId)) void load();
  }
  function startReject(userId: string, track: 'identity' | 'business') {
    setRejecting({ userId, track });
    setRejectNote('');
  }
  async function confirmReject() {
    if (!rejecting || !rejectNote.trim()) return;
    const ok = rejecting.track === 'identity'
      ? await rejectVerification(rejecting.userId, rejectNote.trim())
      : await rejectBusinessVerification(rejecting.userId, rejectNote.trim());
    if (ok) { setRejecting(null); void load(); }
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
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Identity (Verified Seller) and business/CAC (Registered Business) are reviewed independently.</p>
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
            {pending.map((p) => {
              const isFarmer = p.role === 'farmer';
              const isDealer = p.role === 'agro-dealer';
              const isProvider = p.role === 'service-provider';
              const isRejectingIdentity = rejecting?.userId === p.userId && rejecting.track === 'identity';
              const isRejectingBusiness = rejecting?.userId === p.userId && rejecting.track === 'business';

              return (
                <div key={p.userId} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{p.name} <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12 }}>({roleLabel(p.role)})</span></h3>
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{p.email} &middot; submitted {timeAgo(p.submittedAt)}</p>
                    </div>
                  </div>

                  {/* Identity section */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Identity &mdash; Verified Seller {p.status === 'pending' ? '' : `(${p.status})`}
                    </div>
                    <div className="account-detail-grid" style={{ marginBottom: 10 }}>
                      <Field label="ID Number" value={p.idNumber} />
                      <Field label="Business Name" value={p.businessName} />
                      {isFarmer && <Field label="Farm Name" value={p.farmName} />}
                      {isFarmer && <Field label="Crops / Livestock" value={p.cropsOrLivestock} />}
                      {(isDealer || isProvider) && <Field label={isDealer ? 'Business Address' : 'Business Address / Area of Operation'} value={p.businessAddress} />}
                      {isDealer && <Field label="Product Categories Sold" value={p.productCategoriesSold} />}
                      <Field label="Bank" value={p.bankName ? `${p.bankName} — ${p.bankAccountName} — ${p.bankAccountNumber}` : null} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      <DocLink label="Government ID" value={p.governmentIdDocument} />
                      {isFarmer && <DocLink label="Selfie" value={p.selfieDocument} />}
                      {isProvider && <DocLink label="Professional Certificates" value={p.professionalCertificates} />}
                      {isProvider && <DocLink label="Portfolio" value={p.portfolioDocument} />}
                    </div>

                    {p.status === 'pending' && (
                      isRejectingIdentity ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                          <input type="text" placeholder="Reason for rejection..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                            style={{ flex: 1, minWidth: 200, border: '2px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 13 }} />
                          <button className="btn-danger btn-sm btn-inline" onClick={confirmReject}>Confirm Reject</button>
                          <button className="btn-outline btn-sm btn-inline" onClick={() => setRejecting(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button className="btn-primary btn-sm btn-inline" onClick={() => handleApprove(p.userId)}>
                            <i className="fa-solid fa-check"></i> Approve Identity
                          </button>
                          <button className="btn-danger btn-sm btn-inline" onClick={() => startReject(p.userId, 'identity')}>
                            <i className="fa-solid fa-xmark"></i> Reject
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Business/CAC section - only if submitted */}
                  {p.businessStatus && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Business &mdash; Registered Business {p.businessStatus === 'pending' ? '' : `(${p.businessStatus})`}
                      </div>
                      <div className="account-detail-grid" style={{ marginBottom: 10 }}>
                        <Field label="CAC Number" value={p.cacNumber} />
                      </div>
                      <DocLink label="CAC Certificate" value={p.cacDocument} />

                      {p.businessStatus === 'pending' && (
                        isRejectingBusiness ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                            <input type="text" placeholder="Reason for rejection..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                              style={{ flex: 1, minWidth: 200, border: '2px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 13 }} />
                            <button className="btn-danger btn-sm btn-inline" onClick={confirmReject}>Confirm Reject</button>
                            <button className="btn-outline btn-sm btn-inline" onClick={() => setRejecting(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button className="btn-primary btn-sm btn-inline" onClick={() => handleApproveBusiness(p.userId)}>
                              <i className="fa-solid fa-check"></i> Approve Business
                            </button>
                            <button className="btn-danger btn-sm btn-inline" onClick={() => startReject(p.userId, 'business')}>
                              <i className="fa-solid fa-xmark"></i> Reject
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
