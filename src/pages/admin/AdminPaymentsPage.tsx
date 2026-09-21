import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  useAdminPayments,
  useAdminPaymentDetail,
  useAdminPaymentAnalytics,
} from '../../hooks/queries/usePayments';
import {
  useAdminVerifyPayment,
  useAdminRefundPayment,
  useAdminResolveIssue,
} from '../../hooks/mutations/usePaymentMutations';
import { formatDate, formatPrice } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';

type TabKey = 'all' | 'SUCCESS' | 'PENDING' | 'INITIATED' | 'FAILED' | 'ABANDONED' | 'REVIEW';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'SUCCESS', label: 'Paid' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'INITIATED', label: 'Checkout Open' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'ABANDONED', label: 'Abandoned' },
  { key: 'REVIEW', label: 'Needs Review' },
];

const PAGE_SIZE = 20;

const STATUS_CHIP: Record<string, string> = {
  SUCCESS: 'chip-success',
  FAILED: 'chip-danger',
  ABANDONED: 'chip-info',
  REFUNDED: 'chip-success',
  PARTIALLY_REFUNDED: 'chip-info',
};

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<'verify' | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const tab = (searchParams.get('tab') as TabKey) || 'all';
  const search = searchParams.get('search') || '';

  const { data: pageData, isLoading } = useAdminPayments(page, PAGE_SIZE, tab !== 'all' && tab !== 'REVIEW' ? tab : undefined, search || undefined);
  const { data: analytics } = useAdminPaymentAnalytics();
  const { data: detail, isLoading: detailLoading } = useAdminPaymentDetail(selectedId);

  const verifyMutation = useAdminVerifyPayment();
  const refundMutation = useAdminRefundPayment();
  const resolveMutation = useAdminResolveIssue();

  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => setPage(1), [tab, search]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  const filtered = pageData?.content || [];

  function setTab(next: TabKey) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === 'all') p.delete('tab'); else p.set('tab', next);
      return p;
    });
  }

  function submitSearch(value: string) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (value) p.set('search', value); else p.delete('search');
      return p;
    });
  }

  function handleVerify() {
    if (!selectedId) return;
    setConfirmAction(null);
    verifyMutation.mutate(selectedId);
  }

  function handleRefund() {
    if (!selectedId || !detail) return;
    const amount = parseFloat(refundAmount);
    if (!amount || amount <= 0) return;
    setRefundOpen(false);
    refundMutation.mutate(
      { id: selectedId, amount, reason: refundReason.trim() },
      { onSuccess: () => { setRefundAmount(''); setRefundReason(''); } },
    );
  }

  const canRefund =
    detail && (detail.payment.status === 'SUCCESS' || detail.payment.status === 'PARTIALLY_REFUNDED');

  const alreadyRefunded = detail
    ? detail.refunds.filter((r) => r.status === 'SUCCESS').reduce((s, r) => s + r.amountNaira, 0)
    : 0;
  const maxRefundable = detail ? Math.max(0, detail.payment.amountNaira - alreadyRefunded) : 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Payments</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Every Paystack payment on Agrobaba, with verification and refunds.</p>
      </div>

      {analytics && (
        <div className="admin-stats-row" style={{ marginBottom: 18 }}>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{analytics.total}</div>
            <div className="admin-stat-label">Total payments</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{formatPrice(analytics.todayVolume)}</div>
            <div className="admin-stat-label">Volume today</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{analytics.successRate.toFixed(1)}%</div>
            <div className="admin-stat-label">Success rate</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value" style={{ color: analytics.requiresReview > 0 ? 'var(--danger)' : 'var(--primary)' }}>
              {analytics.requiresReview}
            </div>
            <div className="admin-stat-label">Needs review</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{analytics.openIssues}</div>
            <div className="admin-stat-label">Open issues</div>
          </div>
        </div>
      )}

      <div className="status-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`status-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-filters-row">
        <input
          type="text"
          placeholder="Search payment reference or invoice…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(searchInput); }}
          onBlur={() => submitSearch(searchInput)}
          style={{ minWidth: 240 }}
        />
        {search && (
          <button className="btn-outline btn-sm btn-inline" onClick={() => { setSearchInput(''); submitSearch(''); }}>
            <i className="fa-solid fa-xmark"></i> Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <PageLoadingSpinner message="Loading payments…" />
      ) : filtered.length === 0 ? (
        <div className="empty-cart">
          <i className="fa-solid fa-credit-card"></i>
          <p>No payments match this view.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Invoice</th><th>Reference</th><th>Buyer</th><th>Amount</th><th>Status</th><th>Channel</th><th>Date</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => setSelectedId(p.id)}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.invoiceNumber}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.reference || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{p.buyerName || `#${p.buyerId}`}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(p.amountNaira)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className={`chip ${STATUS_CHIP[p.status] || ''}`} style={{ textTransform: 'capitalize' }}>
                          {p.status === 'PARTIALLY_REFUNDED' ? 'Partial refund' : p.status === 'REVERSED' ? 'Reversed' : p.status.toLowerCase()}
                        </span>
                        {p.requiresReview && (
                          <span className="chip chip-danger"><i className="fa-solid fa-triangle-exclamation"></i> Review</span>
                        )}
                      </div>
                    </td>
                    <td>{p.channel || '—'}</td>
                    <td>{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageData && pageData.totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, alignItems: 'center' }}>
              <button
                className="btn-outline btn-sm btn-inline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="fa-solid fa-chevron-left"></i> Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Page {page} of {pageData.totalPages}
              </span>
              <button
                className="btn-outline btn-sm btn-inline"
                disabled={page >= pageData.totalPages}
                onClick={() => setPage((p) => Math.min(pageData.totalPages, p + 1))}
              >
                Next <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {selectedId && (
        <div className="admin-drawer-overlay" onClick={() => setSelectedId(null)}>
          <div className="admin-drawer" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div style={{ padding: 24 }}><PageLoadingSpinner message="Loading payment…" /></div>
            ) : (
              <>
                <div className="admin-drawer-hdr">
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800 }}>{detail.payment.invoiceNumber}</h3>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDate(detail.payment.createdAt)}</p>
                  </div>
                  <button className="admin-drawer-close" onClick={() => setSelectedId(null)}><i className="fa-solid fa-xmark"></i></button>
                </div>

                <div className="admin-drawer-section">
                  <h4>Payment</h4>
                  <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>{formatPrice(detail.payment.amountNaira)}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Reference: <code>{detail.payment.reference || '—'}</code></p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Status: <span className={`chip ${STATUS_CHIP[detail.payment.status] || ''}`} style={{ textTransform: 'capitalize' }}>{detail.payment.status.toLowerCase().replace('_', ' ')}</span>
                    {detail.payment.requiresReview && <span className="chip chip-danger">Needs review</span>}
                  </p>
                  {detail.payment.providerTransactionId && (
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>Paystack tx: <code>{detail.payment.providerTransactionId}</code></p>
                  )}
                  {detail.payment.paidAt && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Paid {formatDate(detail.payment.paidAt)}</p>}
                </div>

                <div className="admin-drawer-section">
                  <h4>Attempts</h4>
                  {detail.attempts.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>No checkout started.</p>}
                  {detail.attempts.map((a) => (
                    <div key={a.id} style={{ fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span>
                        <code style={{ fontSize: 11 }}>{a.reference}</code>
                      </span>
                      <span className="chip" style={{ textTransform: 'capitalize' }}>{a.status.toLowerCase()}</span>
                    </div>
                  ))}
                </div>

                <div className="admin-drawer-section">
                  <h4>Refunds</h4>
                  {detail.refunds.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>No refunds issued.</p>}
                  {detail.refunds.map((r) => (
                    <div key={r.id} style={{ fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span>-{formatPrice(r.amountNaira)} {r.reason ? `· ${r.reason}` : ''}</span>
                      <span className="chip" style={{ textTransform: 'capitalize' }}>{r.status.toLowerCase().replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>

                <div className="admin-drawer-section">
                  <h4>Issues</h4>
                  {detail.issues.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>No issues recorded.</p>}
                  {detail.issues.map((issue) => (
                    <div key={issue.id} style={{ fontSize: 12, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 700 }}>{issue.type.replace(/_/g, ' ').toLowerCase()}</span>
                        <span className={`chip ${issue.resolved ? 'chip-success' : 'chip-danger'}`}>
                          {issue.resolved ? 'Resolved' : 'Open'}
                        </span>
                      </div>
                      <p style={{ color: 'var(--muted)', margin: '4px 0 6px' }}>{issue.message}</p>
                      {!issue.resolved && (
                        <button
                          className="btn-outline btn-sm btn-inline"
                          disabled={resolveMutation.isPending}
                          onClick={() => resolveMutation.mutate({ id: issue.id })}
                        >
                          <i className="fa-solid fa-check"></i> Mark resolved
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="admin-drawer-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn-outline btn-inline btn-sm" onClick={() => setConfirmAction('verify')} disabled={verifyMutation.isPending}>
                    <i className="fa-solid fa-rotate"></i> {verifyMutation.isPending ? 'Verifying…' : 'Verify with Paystack'}
                  </button>
                  {canRefund && (
                    <button className="btn-outline btn-inline btn-sm" onClick={() => { setRefundAmount(String(maxRefundable || '')); setRefundReason(''); setRefundOpen(true); }}>
                      <i className="fa-solid fa-money-bill-transfer"></i> Refund
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {refundOpen && detail && (
        <div className="admin-drawer-overlay" onClick={() => setRefundOpen(false)}>
          <div className="admin-drawer" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-hdr">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>Issue refund</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Up to {formatPrice(maxRefundable)} can still be refunded.</p>
              </div>
              <button className="admin-drawer-close" onClick={() => setRefundOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="admin-drawer-section" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="field">
                <label>Amount (₦) <span className="req">*</span></label>
                <input
                  type="number"
                  min={0.01}
                  max={maxRefundable}
                  step={0.01}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`0.00 (max ${maxRefundable})`}
                />
              </div>
              <div className="field">
                <label>Reason</label>
                <textarea rows={2} placeholder="e.g. Seller couldn't fulfill the order" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
              </div>
              <button className="btn-primary btn-inline btn-sm" disabled={refundMutation.isPending} onClick={handleRefund}>
                <i className="fa-solid fa-money-bill-transfer"></i> {refundMutation.isPending ? 'Sending refund…' : 'Send refund to Paystack'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === 'verify'}
        title="Verify payment now?"
        message={`Check this payment against Paystack and apply the true outcome (idempotent — safe to re-run).`}
        confirmLabel="Verify"
        onConfirm={handleVerify}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}