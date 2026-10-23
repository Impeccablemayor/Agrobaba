import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useAdminUserDetail,
  useAdminUserOrders,
  useAdminUserTransactions,
  useAdminUserActivity,
} from '../../hooks/queries/useAdmin';
import { formatDate, formatPrice, roleLabel, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { suspendUser, reinstateUser } from '../../lib/adminUsers';
import { showToast } from '../../lib/toastBus';

type DetailTab = 'overview' | 'orders' | 'transactions' | 'activity';

function DocPreview({ label, value, onZoom }: { label: string; value?: string | null; onZoom: (src: string) => void }) {
  if (!value) return null;
  return (
    <div className="doc-preview" style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{label}</div>
      {value.startsWith('data:image') || value.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
        <img
          src={value}
          alt={label}
          loading="lazy"
          onClick={() => onZoom(value)}
          style={{ maxHeight: 180, maxWidth: 220, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-mid)', cursor: 'zoom-in', objectFit: 'cover' }}
        />
      ) : (
        <a href={value} target="_blank" rel="noreferrer" className="btn-outline btn-sm btn-inline" style={{ marginTop: 4 }}>
          <i className="fa-solid fa-file-lines"></i> View Document
        </a>
      )}
    </div>
  );
}

function InfoItem({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {children ?? (value || '—')}
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<DetailTab>('overview');

  // Sub-resource pagination
  const [ordersPage, setOrdersPage] = useState(0);
  const [transactionsPage, setTransactionsPage] = useState(0);
  const [activityPage, setActivityPage] = useState(0);

  // Modal / zoom states
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [reinstateModalOpen, setReinstateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: detail, isLoading, refetch } = useAdminUserDetail(id);
  const { data: ordersData, isLoading: ordersLoading } = useAdminUserOrders(id, ordersPage, 10);
  const { data: transactionsData, isLoading: transactionsLoading } = useAdminUserTransactions(id, transactionsPage, 10);
  const { data: activityData, isLoading: activityLoading } = useAdminUserActivity(id, activityPage, 15);

  if (isLoading && !detail) return <PageLoadingSpinner message="Loading user profile…" />;
  if (!detail) {
    return (
      <div className="admin-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
        <i className="fa-solid fa-user-xmark" style={{ fontSize: 32, color: 'var(--danger)', marginBottom: 12 }}></i>
        <h3>User not found</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>The requested user account could not be found or you do not have permission.</p>
        <Link to="/admin/users" className="btn btn-outline btn-sm">
          <i className="fa-solid fa-arrow-left"></i> Back to Users
        </Link>
      </div>
    );
  }

  const u = detail.user;
  const v = detail.verification;
  const isSuspended = u.status === 'SUSPENDED';

  async function handleSuspend() {
    if (!id || !suspendReason.trim()) {
      showToast('Please provide a reason for account suspension', 'error');
      return;
    }
    setIsSubmitting(true);
    const updated = await suspendUser(id, suspendReason.trim());
    setIsSubmitting(false);
    if (updated) {
      setSuspendModalOpen(false);
      setSuspendReason('');
      void refetch();
    }
  }

  async function handleReinstate() {
    if (!id) return;
    setIsSubmitting(true);
    const updated = await reinstateUser(id);
    setIsSubmitting(false);
    if (updated) {
      setReinstateModalOpen(false);
      void refetch();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
        <Link to="/admin/users" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          <i className="fa-solid fa-arrow-left"></i> All Users
        </Link>
        <span>/</span>
        <span>User #{u.id}</span>
      </div>

      {/* User Header Profile Card */}
      <div className="admin-panel" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: isSuspended ? '#fee2e2' : 'var(--primary-light, #e9f7ef)',
                color: isSuspended ? 'var(--danger)' : 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 900,
                border: '2px solid var(--border-mid)',
              }}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>{u.name}</h1>
                <span className={`chip ${isSuspended ? 'chip-danger' : 'chip-success'}`}>
                  <i className={`fa-solid ${isSuspended ? 'fa-ban' : 'fa-circle-check'}`}></i>
                  {u.status}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'var(--bg-soft)',
                    color: 'var(--text)',
                  }}
                >
                  {roleLabel(u.role)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
                <span>{u.publicHandle ? `@${u.publicHandle}` : `ID: #${u.id}`}</span>
                <span>•</span>
                <span>{u.email}</span>
                {u.contact && (
                  <>
                    <span>•</span>
                    <span>{u.contact}</span>
                  </>
                )}
                <span>•</span>
                <span>Registered {formatDate(u.createdAt)} ({timeAgo(u.createdAt)})</span>
              </div>
            </div>
          </div>

          {/* Account Action Buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isSuspended ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setReinstateModalOpen(true)}
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                <i className="fa-solid fa-user-check"></i> Reinstate Account
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSuspendModalOpen(true);
                  setSuspendReason('');
                }}
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                <i className="fa-solid fa-ban"></i> Suspend Account
              </button>
            )}
          </div>
        </div>

        {/* Suspended Alert Banner */}
        {isSuspended && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 16 }}></i>
            <div>
              <strong>Account Suspended:</strong> {u.suspendedReason || 'Administrative suspension enforced.'}
              {u.suspendedAt && (
                <span style={{ marginLeft: 6, opacity: 0.85 }}>({formatDate(u.suspendedAt)})</span>
              )}
            </div>
          </div>
        )}

        {/* Aggregate Counters Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid var(--border-mid)',
          }}
        >
          <Link
            to={`/admin/products?sellerId=${u.id}`}
            style={{
              padding: '10px 12px',
              background: 'var(--bg-soft)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
            title="Inspect all product listings by this seller"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>PRODUCT LISTINGS</div>
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10, color: 'var(--primary)' }}></i>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2, color: 'var(--primary)' }}>{u.listingsCount}</div>
          </Link>
          <div style={{ padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>BUYER DEMANDS</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{u.demandsCount}</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>ORDERS PLACED</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{u.ordersCount}</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>PAYMENTS RECORDED</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{u.transactionsCount}</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>LAST ACTIVE</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              {u.lastActiveAt ? timeAgo(u.lastActiveAt) : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="status-tabs" style={{ marginBottom: 0 }}>
        <button
          type="button"
          className={`status-tab ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          <i className="fa-solid fa-address-card"></i> Overview & Verification
        </button>
        <button
          type="button"
          className={`status-tab ${tab === 'orders' ? 'active' : ''}`}
          onClick={() => setTab('orders')}
        >
          <i className="fa-solid fa-receipt"></i> Order History
          <span className="count">{u.ordersCount}</span>
        </button>
        <button
          type="button"
          className={`status-tab ${tab === 'transactions' ? 'active' : ''}`}
          onClick={() => setTab('transactions')}
        >
          <i className="fa-solid fa-credit-card"></i> Transactions & Payments
          <span className="count">{u.transactionsCount}</span>
        </button>
        <button
          type="button"
          className={`status-tab ${tab === 'activity' ? 'active' : ''}`}
          onClick={() => setTab('activity')}
        >
          <i className="fa-solid fa-clock-rotate-left"></i> Account Activity
        </button>
      </div>

      {/* TAB 1: OVERVIEW & VERIFICATION */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Account Profile Details Panel */}
          <div className="admin-panel" style={{ margin: 0 }}>
            <div className="admin-panel-hdr">
              <h3>Account & Profile Information</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <InfoItem label="Full Name" value={u.name} />
              <InfoItem label="Public Handle" value={u.publicHandle ? `@${u.publicHandle}` : 'Not set'} />
              <InfoItem label="Email Address" value={u.email}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{u.email}</span>
                  {u.emailVerified ? (
                    <span className="chip chip-success" style={{ fontSize: 9.5, padding: '1px 5px' }}>Verified</span>
                  ) : (
                    <span className="chip chip-neutral" style={{ fontSize: 9.5, padding: '1px 5px' }}>Unconfirmed</span>
                  )}
                </div>
              </InfoItem>
              <InfoItem label="Phone Number" value={u.contact} />
              <InfoItem label="Business Name" value={u.businessName} />
              <InfoItem label="Location" value={[u.city, u.state, u.country].filter(Boolean).join(', ') || 'Not specified'} />
              <InfoItem label="Physical Address" value={detail.address} />
              <InfoItem label="Authentication Provider" value={detail.authProvider || 'LOCAL'} />
              <InfoItem label="Terms Accepted" value={detail.termsAcceptedAt ? `${formatDate(detail.termsAcceptedAt)} (v${detail.termsVersion || '1.0'})` : 'Not recorded'} />
              {detail.bio && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoItem label="Bio / Description" value={detail.bio} />
                </div>
              )}
            </div>
          </div>

          {/* Verification Details Panel */}
          <div className="admin-panel" style={{ margin: 0 }}>
            <div className="admin-panel-hdr">
              <div>
                <h3>User Verification Profile</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                  Government identity and CAC corporate registration reviews
                </p>
              </div>
              <Link to="/admin/verifications" className="see-all" style={{ fontSize: 12 }}>
                Verification Queue <i className="fa-solid fa-chevron-right"></i>
              </Link>
            </div>

            {v ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {/* Identity Verification Track */}
                <div style={{ padding: '16px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Government Identity Review</h4>
                    <span className={`chip ${u.identityVerified ? 'chip-success' : v.status === 'PENDING' ? 'chip-pending' : 'chip-neutral'}`}>
                      {u.identityVerified ? 'Approved' : v.status || 'Not Submitted'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
                    <InfoItem label="ID Document Number" value={v.idNumber} />
                    <InfoItem label="Submitted At" value={v.submittedAt ? formatDate(v.submittedAt) : null} />
                    <InfoItem label="Reviewed At" value={v.reviewedAt ? formatDate(v.reviewedAt) : null} />
                    {v.note && <InfoItem label="Reviewer Notes" value={v.note} />}

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                      <DocPreview label="Government ID" value={v.governmentIdDocument} onZoom={setZoomSrc} />
                      <DocPreview label="Selfie Verification" value={v.selfieDocument} onZoom={setZoomSrc} />
                    </div>
                  </div>
                </div>

                {/* Business / CAC Track */}
                <div style={{ padding: '16px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>CAC Business Verification</h4>
                    <span className={`chip ${u.businessVerified ? 'chip-success' : v.businessStatus === 'PENDING' ? 'chip-pending' : 'chip-neutral'}`}>
                      {u.businessVerified ? 'Approved' : v.businessStatus || 'Not Submitted'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
                    <InfoItem label="CAC Registration Number" value={v.cacNumber} />
                    <InfoItem label="Registered Business Address" value={v.businessAddress} />
                    <InfoItem label="Bank Account" value={v.bankAccountName ? `${v.bankAccountName} · ${v.bankAccountNumber} (${v.bankName})` : null} />
                    <InfoItem label="Reviewed At" value={v.businessReviewedAt ? formatDate(v.businessReviewedAt) : null} />
                    {v.businessNote && <InfoItem label="Business Review Notes" value={v.businessNote} />}

                    <DocPreview label="CAC Certificate Document" value={v.cacDocument} onZoom={setZoomSrc} />
                  </div>
                </div>

                {/* Operational Details (Farm / Service Profile) */}
                {(v.farmName || v.cropsOrLivestock || v.productCategoriesSold) && (
                  <div style={{ gridColumn: '1 / -1', padding: '16px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Operational Agriculture Profile</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      <InfoItem label="Farm / Operation Name" value={v.farmName} />
                      <InfoItem label="Crops or Livestock" value={v.cropsOrLivestock} />
                      <InfoItem label="Product Categories" value={v.productCategoriesSold} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: 12.5 }}>No verification profile submitted by this user yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORDER HISTORY */}
      {tab === 'orders' && (
        <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {ordersLoading ? (
            <PageLoadingSpinner message="Loading user orders…" />
          ) : (ordersData?.content || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <i className="fa-solid fa-receipt" style={{ fontSize: 28, color: 'var(--muted)', marginBottom: 10, display: 'block' }}></i>
              <p style={{ fontWeight: 600 }}>No orders recorded for this user.</p>
            </div>
          ) : (
            <>
              <div className="admin-table-wrap" style={{ border: 'none' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Total Amount</th>
                      <th>Items Count</th>
                      <th>Order Status</th>
                      <th>Delivery Info</th>
                      <th>Order Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ordersData?.content || []).map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{ord.invoiceNumber}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800 }}>{formatPrice(ord.total)}</span>
                        </td>
                        <td>{ord.itemsCount} items</td>
                        <td>
                          <span className={`chip chip-${ord.status === 'delivered' ? 'success' : ord.status === 'cancelled' ? 'danger' : 'info'}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>{ord.buyerName || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ord.buyerAddress || 'No address'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>{formatDate(ord.createdAt)}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(ord.createdAt)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Pagination */}
              {(ordersData?.totalPages || 0) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-soft)' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={ordersPage === 0}
                    onClick={() => setOrdersPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Page {ordersPage + 1} of {ordersData?.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={ordersPage >= (ordersData?.totalPages || 1) - 1}
                    onClick={() => setOrdersPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: TRANSACTIONS & PAYMENTS */}
      {tab === 'transactions' && (
        <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {transactionsLoading ? (
            <PageLoadingSpinner message="Loading user transactions…" />
          ) : (transactionsData?.content || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <i className="fa-solid fa-credit-card" style={{ fontSize: 28, color: 'var(--muted)', marginBottom: 10, display: 'block' }}></i>
              <p style={{ fontWeight: 600 }}>No transaction or payment records found for this user.</p>
            </div>
          ) : (
            <>
              <div className="admin-table-wrap" style={{ border: 'none' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Payment Reference</th>
                      <th>Order Invoice</th>
                      <th>Amount (₦)</th>
                      <th>Status</th>
                      <th>Provider / Channel</th>
                      <th>Attempts</th>
                      <th>Refunds</th>
                      <th>Created / Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(transactionsData?.content || []).map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{tx.reference || `TX-#${tx.id}`}</div>
                          {tx.requiresReview && (
                            <span className="chip chip-pending" style={{ fontSize: 9.5 }}>Needs Review</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{tx.orderInvoiceNumber || `#${tx.orderId}`}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800 }}>{formatPrice(tx.amountNaira)}</span>
                        </td>
                        <td>
                          <span className={`chip chip-${tx.status === 'successful' ? 'success' : tx.status === 'failed' ? 'danger' : 'pending'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td>
                          <div>{tx.provider || 'Flutterwave'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tx.channel || 'Card/Transfer'}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12 }}>{tx.attemptsCount} attempts</span>
                        </td>
                        <td>
                          {tx.refunds && tx.refunds.length > 0 ? (
                            <span className="chip chip-neutral" style={{ fontSize: 10 }}>
                              {tx.refunds.length} Refund(s)
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>None</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>{formatDate(tx.paidAt || tx.createdAt)}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(tx.createdAt)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Transaction Pagination */}
              {(transactionsData?.totalPages || 0) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-soft)' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={transactionsPage === 0}
                    onClick={() => setTransactionsPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Page {transactionsPage + 1} of {transactionsData?.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={transactionsPage >= (transactionsData?.totalPages || 1) - 1}
                    onClick={() => setTransactionsPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 4: ACCOUNT ACTIVITY */}
      {tab === 'activity' && (
        <div className="admin-panel">
          <div className="admin-panel-hdr">
            <div>
              <h3>Account Activity Audit Trail</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                Historical events, status changes, administrative actions, and security operations involving this user.
              </p>
            </div>
          </div>

          {activityLoading ? (
            <PageLoadingSpinner message="Loading account activity…" />
          ) : (activityData?.content || []).length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12.5 }}>No recorded activity events for this user yet.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(activityData?.content || []).map((act) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 4px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 12.5,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700 }}>{act.event.replace(/_/g, ' ')}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 8 }}>by {act.actor}</span>
                      {act.detail && (
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{act.detail}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{timeAgo(act.createdAt)}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{formatDate(act.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {(activityData?.totalPages || 0) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-soft)', marginTop: 12, borderRadius: 'var(--radius-sm)' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={activityPage === 0}
                    onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Page {activityPage + 1} of {activityData?.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={activityPage >= (activityData?.totalPages || 1) - 1}
                    onClick={() => setActivityPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Document Zoom Overlay Modal */}
      {zoomSrc && (
        <div className="doc-preview-overlay" onClick={() => setZoomSrc(null)}>
          <img src={zoomSrc} alt="Preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Account Suspension Dialog */}
      {suspendModalOpen && (
        <div className="confirm-overlay" onClick={() => !isSubmitting && setSuspendModalOpen(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="confirm-icon" style={{ background: '#fee2e2', color: 'var(--danger)' }}>
              <i className="fa-solid fa-user-slash"></i>
            </div>
            <h3>Suspend User Account</h3>
            <p>
              Suspending <strong>{u.name}</strong> will immediately revoke their access token, evict cached credentials, and prevent any marketplace actions until reinstated.
            </p>
            <div style={{ margin: '14px 0', textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Reason for Suspension <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Specify violation, dispute, suspicious activity, or fraud report…"
                rows={3}
                style={{
                  width: '100%',
                  padding: 8,
                  fontSize: 12.5,
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border-mid)',
                  outline: 'none',
                }}
              />
            </div>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSuspendModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleSuspend}
                disabled={isSubmitting || !suspendReason.trim()}
              >
                {isSubmitting ? 'Suspending…' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reinstate Modal */}
      <ConfirmDialog
        open={reinstateModalOpen}
        title="Reinstate User Account"
        message={`Are you sure you want to reinstate ${u.name}? This will restore their login access and allow them to resume marketplace activity.`}
        confirmLabel="Reinstate Account"
        cancelLabel="Cancel"
        busy={isSubmitting}
        onConfirm={handleReinstate}
        onCancel={() => setReinstateModalOpen(false)}
      />
    </div>
  );
}
