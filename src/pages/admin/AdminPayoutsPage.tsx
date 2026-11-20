import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePayoutHistory, usePayoutQueue, usePendingSettlements, useRecordSettlement, useReleasePayout, useVoidPayout } from '../../hooks/queries/usePayouts';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { formatDate, formatPrice } from '../../lib/format';
import type { Payout, PayoutCandidate } from '../../lib/payouts';
import { useFees } from '../../hooks/queries/useLedger';
import { RevealNumberButton } from '../../components/BankAccountAdmin';
import { revealBankAccount } from '../../lib/bankAccounts';
import { AutomaticPayoutsPanel } from '../../components/AutomaticPayoutsPanel';
import { PAYOUT_STATUS_LABELS, PAYOUT_STATUS_TONE } from '../../lib/payoutRules';

/** Seller payouts from AgroBaba's Flutterwave balance (the escrow). Money is sent in the
 *  Flutterwave dashboard; this page lists what is ready, records each release, and keeps the
 *  history. Amounts and eligibility are computed by the backend. */
export default function AdminPayoutsPage() {
  const [tab, setTab] = useState<'auto' | 'queue' | 'settlement' | 'history'>('auto');
  const [page, setPage] = useState(0);
  const [releasing, setReleasing] = useState<PayoutCandidate | null>(null);
  const [voiding, setVoiding] = useState<Payout | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const queue = usePayoutQueue();
  const history = usePayoutHistory(page, tab === 'history');
  const voidMutation = useVoidPayout();
  const settlements = usePendingSettlements();

  const ready = queue.data ?? [];
  const totalToRelease = ready.reduce((s, c) => s + c.earning.netAmount, 0);
  const missingBank = ready.filter((c) => !c.bankAccountNumber).length;

  async function confirmVoid() {
    if (!voiding || !voidReason.trim()) return;
    const ok = await voidMutation.mutateAsync({ id: voiding.id, reason: voidReason.trim() });
    if (ok) { setVoiding(null); setVoidReason(''); }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Seller Payouts</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Funds are released only after the payment is verified, the money has settled into AgroBaba&apos;s
          Flutterwave balance, the buyer has received the goods and the inspection period is over, with no hold or
          dispute. Automatic payouts send the transfer through Flutterwave; a manual payout is sent in the Flutterwave
          dashboard and recorded here.
        </p>
      </div>

      <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="admin-stat-card"><div className="admin-stat-value">{queue.data ? ready.length : '—'}</div><div className="admin-stat-label">Ready to release</div></div>
        <div className="admin-stat-card"><div className="admin-stat-value">{queue.data ? formatPrice(totalToRelease) : '—'}</div><div className="admin-stat-label">Total to send (after fees)</div></div>
        <div className="admin-stat-card"><div className="admin-stat-value">{queue.data ? missingBank : '—'}</div><div className="admin-stat-label">Missing bank details</div></div>
        <div className="admin-stat-card"><div className="admin-stat-value">{settlements.data ? settlements.data.length : '—'}</div><div className="admin-stat-label">Awaiting settlement</div></div>
      </div>

      <div className="status-tabs">
        <button className={`status-tab ${tab === 'auto' ? 'active' : ''}`} onClick={() => setTab('auto')}>Automatic payouts</button>
        <button className={`status-tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>Ready (manual)</button>
        <button className={`status-tab ${tab === 'settlement' ? 'active' : ''}`} onClick={() => setTab('settlement')}>Awaiting settlement</button>
        <button className={`status-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History</button>
      </div>

      {tab === 'auto' ? <AutomaticPayoutsPanel /> : tab === 'settlement' ? <SettlementPanel /> : tab === 'queue' ? (
        queue.isLoading ? <PageLoadingSpinner message="Loading payouts…" />
          : queue.isError ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load the payout queue.</p></div>
          : ready.length === 0 ? (
            <div className="empty-cart"><i className="fa-solid fa-circle-check"></i><p>Nothing to release. Sellers&apos; funds appear here once the payment is verified and settled, and the buyer confirms delivery.</p></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Seller</th><th>Order</th><th>Paid</th><th>Gross</th><th>Fee</th><th>To send</th><th>Bank</th><th></th></tr></thead>
                <tbody>
                  {ready.map((c) => (
                    <tr key={`${c.sellerId}-${c.earning.orderId}`}>
                      <td><div style={{ fontWeight: 700 }}>{c.sellerName || `Seller #${c.sellerId}`}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.businessName || ''}</div></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.earning.invoiceNumber}</td>
                      <td>{c.earning.paidAt ? formatDate(c.earning.paidAt) : '—'}</td>
                      <td>{formatPrice(c.earning.grossAmount - c.earning.refundedAmount)}</td>
                      <td>{formatPrice(c.earning.platformFee)}</td>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatPrice(c.earning.netAmount)}</td>
                      <td>{c.bankAccountNumber
                        ? <span style={{ fontSize: 12 }}>{c.bankName} · <span style={{ fontFamily: 'monospace' }}>{c.bankAccountNumber}</span></span>
                        : <span className="chip chip-danger">Missing</span>}
                        {!c.payoutReady && <div><span className="chip chip-pending" title={c.payoutBlockers.join(' ')}>Not payable yet</span></div>}</td>
                      <td><button className="btn-primary btn-sm btn-inline" onClick={() => setReleasing(c)}>{c.payoutReady ? 'Release' : 'Details'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      ) : history.isLoading ? <PageLoadingSpinner message="Loading history…" />
        : (history.data?.content.length ?? 0) === 0 ? <div className="empty-cart"><i className="fa-solid fa-clock-rotate-left"></i><p>No payouts recorded yet.</p></div>
        : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Released</th><th>Seller</th><th>Order</th><th>Sent</th><th>Fee</th><th>Reference</th><th>By</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {history.data!.content.map((p) => (
                    <tr key={p.id}>
                      <td>{p.releasedAt ? formatDate(p.releasedAt) : formatDate(p.createdAt)}
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{p.method === 'AUTOMATED' ? 'automatic' : 'manual'}</div></td>
                      <td>{p.sellerName || `Seller #${p.sellerId}`}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.invoiceNumber}</td>
                      <td style={{ fontWeight: 700 }}>{formatPrice(p.amountSent ?? p.netAmount)}
                        {p.transferFee > 0 && <div style={{ fontSize: 10, color: 'var(--muted)' }}>transfer fee {formatPrice(p.transferFee)} ({p.transferFeeBearer === 'SELLER' ? 'seller' : 'AgroBaba'})</div>}</td>
                      <td>{formatPrice(p.feeAmount)} <span style={{ fontSize: 10, color: 'var(--muted)' }}>({p.feeRate}%)</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.transferReference}</td>
                      <td style={{ fontSize: 11 }}>{p.releasedBy}</td>
                      <td><span className={`chip ${({ neutral: 'chip-neutral', pending: 'chip-pending', success: 'chip-success', danger: 'chip-danger' } as const)[PAYOUT_STATUS_TONE[p.status]]}`}
                        title={p.voidReason || p.failureReason || p.cancelReason || ''}>{PAYOUT_STATUS_LABELS[p.status]}</span></td>
                      <td>{p.status === 'RELEASED' && (
                        <button className="btn-outline btn-sm btn-inline" style={{ color: 'var(--danger)' }} onClick={() => setVoiding(p)}>Void</button>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
              <button className="btn-outline btn-sm btn-inline" disabled={history.data!.first} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span>Page {history.data!.number + 1} of {Math.max(history.data!.totalPages, 1)}</span>
              <button className="btn-outline btn-sm btn-inline" disabled={history.data!.last} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </>
        )}

      {releasing && <ReleaseDrawer candidate={releasing} onClose={() => setReleasing(null)} />}

      <ConfirmDialog
        open={!!voiding}
        title="Void this payout record?"
        message={`Use this only if the payout was recorded by mistake. It does NOT reverse the bank transfer; the order becomes releasable again.`}
        confirmLabel="Void record"
        destructive
        busy={voidMutation.isPending}
        onConfirm={() => void confirmVoid()}
        onCancel={() => { if (!voidMutation.isPending) { setVoiding(null); setVoidReason(''); } }}
      >
        <textarea
          aria-label="Reason for voiding" placeholder="Reason (required)" rows={3} maxLength={1000}
          value={voidReason} onChange={(e) => setVoidReason(e.target.value)}
          style={{ width: '100%', margin: '4px 0 12px', fontSize: 13 }}
        />
      </ConfirmDialog>
    </div>
  );
}

function ReleaseDrawer({ candidate: c, onClose }: { candidate: PayoutCandidate; onClose: () => void }) {
  const release = useReleasePayout();
  const { data: fees } = useFees();
  // The transfer fee and who pays it are configured on the server, which also records them on the payout.
  const transferFee = fees?.sellerTransferFee ?? 0;
  const sellerPaysTransfer = fees?.sellerTransferFeeBearer === 'SELLER' && transferFee > 0;
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const e = c.earning;
  const canSubmit = c.payoutReady && reference.trim().length > 0 && sent && !release.isPending;
  const toSend = sellerPaysTransfer ? Math.max(0, e.netAmount - transferFee) : e.netAmount;

  async function submit() {
    if (!canSubmit) return;
    const ok = await release.mutateAsync({ orderId: e.orderId, sellerId: c.sellerId, transferReference: reference.trim(), note: note.trim() || undefined });
    if (ok) onClose();
  }

  return (
    <div className="admin-drawer-overlay" onClick={() => { if (!release.isPending) onClose(); }}>
      <div className="admin-drawer" role="dialog" aria-modal="true" aria-label="Release payout" onClick={(ev) => ev.stopPropagation()}>
        <div className="admin-drawer-hdr">
          <div><h3>Release payout</h3><p>{c.sellerName || `Seller #${c.sellerId}`} · {e.invoiceNumber}</p></div>
          <button className="admin-drawer-close" aria-label="Close" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="admin-drawer-section">
          <h4>Send to</h4>
          {c.bankAccountNumber ? (
            <>
              <p><strong>Bank:</strong> {c.bankName}</p>
              <p><strong>Name at the bank:</strong> {c.bankAccountName ?? '—'}</p>
              <p><strong>Account number:</strong> <span style={{ fontFamily: 'monospace' }}>{c.bankAccountNumber}</span></p>
              {c.payoutReady && c.bankAccountId != null && (
                <RevealNumberButton defaultReason={`Sending payout for ${e.invoiceNumber}`} reveal={(reason) => revealBankAccount(c.bankAccountId!, reason)} />
              )}
            </>
          ) : (
            <p style={{ color: 'var(--danger)' }}>No payout bank account on file. The seller adds it on their Payout account page.</p>
          )}
          {!c.payoutReady && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontWeight: 700, color: 'var(--danger)', margin: '0 0 4px' }}>This seller can&apos;t be paid yet:</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{c.payoutBlockers.map((b) => <li key={b}>{b}</li>)}</ul>
              <Link to={`/admin/users/${c.sellerId}`} style={{ fontSize: 13 }}>Open seller</Link>
            </div>
          )}
        </div>

        <div className="admin-drawer-section">
          <h4>Amount</h4>
          <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Seller's items</span><span>{formatPrice(e.grossAmount)}</span></p>
          {e.refundedAmount > 0 && <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Refunded to buyer</span><span>−{formatPrice(e.refundedAmount)}</span></p>}
          <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform fee (on items only)</span><span>−{formatPrice(e.platformFee)}</span></p>
          {e.deliveryFee > 0 && <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery fee (seller delivered, no fee)</span><span>+{formatPrice(e.deliveryFee)}</span></p>}
          {sellerPaysTransfer && <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Flutterwave transfer fee (seller pays)</span><span>−{formatPrice(transferFee)}</span></p>}
          <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, color: 'var(--primary)' }}><span>Send exactly</span><span>{formatPrice(toSend)}</span></p>
          {!sellerPaysTransfer && transferFee > 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Flutterwave's {formatPrice(transferFee)} transfer fee is paid by AgroBaba.</p>}
        </div>

        <div className="admin-drawer-section">
          <h4>Record the transfer</h4>
          <div className="form-group">
            <label htmlFor="payout-ref">Flutterwave transfer reference <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input id="payout-ref" type="text" maxLength={120} value={reference} onChange={(ev) => setReference(ev.target.value)} placeholder="e.g. TRF-1234567890" />
          </div>
          <div className="form-group">
            <label htmlFor="payout-note">Note (optional)</label>
            <textarea id="payout-note" rows={2} maxLength={1000} value={note} onChange={(ev) => setNote(ev.target.value)} />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, margin: '4px 0 12px' }}>
            <input type="checkbox" checked={sent} onChange={(ev) => setSent(ev.target.checked)} style={{ marginTop: 3 }} />
            I have sent {formatPrice(toSend)} to this seller in the Flutterwave dashboard.
          </label>
          <button className="btn-primary btn-inline" style={{ width: '100%', justifyContent: 'center' }} disabled={!canSubmit} onClick={() => void submit()}>
            {release.isPending ? 'Recording…' : 'Record payout'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Verified payments whose money hasn't been confirmed in AgroBaba's Flutterwave balance yet. The
 *  admin ticks the payments included in a Flutterwave settlement and records its reference. */
function SettlementPanel() {
  const pending = usePendingSettlements();
  const record = useRecordSettlement();
  const [selected, setSelected] = useState<number[]>([]);
  const [reference, setReference] = useState('');
  const [settledAt, setSettledAt] = useState('');
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const rows = pending.data ?? [];
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  const chosen = rows.filter((r) => selected.includes(r.paymentId));
  const total = chosen.reduce((sum, r) => sum + r.amountNaira, 0);
  const canSubmit = chosen.length > 0 && reference.trim().length > 0 && checked && !record.isPending;

  function toggle(id: number) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function submit() {
    if (!canSubmit) return;
    const ok = await record.mutateAsync({
      paymentIds: chosen.map((r) => r.paymentId),
      settlementReference: reference.trim(),
      // A past day is recorded as that day's end; today (or blank) as now.
      settledAt: settledAt && settledAt !== today ? `${settledAt}T23:59:59` : undefined,
      note: note.trim() || undefined,
    });
    if (ok) { setSelected([]); setReference(''); setSettledAt(''); setNote(''); setChecked(false); }
  }

  if (pending.isLoading) return <PageLoadingSpinner message="Loading settlements…" />;
  if (pending.isError) return <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load payments awaiting settlement.</p></div>;
  if (rows.length === 0) return <div className="empty-cart"><i className="fa-solid fa-circle-check"></i><p>Every verified payment is recorded as settled.</p></div>;

  return (
    <>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>
        Open the Flutterwave dashboard&apos;s settlement report, tick the payments included in one settlement,
        and record its reference. Sellers&apos; money for these orders stays held until this is done.
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th></th><th>Order</th><th>Reference</th><th>Paid</th><th>Amount</th><th>Flutterwave fee</th><th>Expected settlement</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.paymentId}>
                <td><input type="checkbox" aria-label={`Select ${r.invoiceNumber ?? r.paymentId}`} checked={selected.includes(r.paymentId)} onChange={() => toggle(r.paymentId)} /></td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {r.invoiceNumber ?? `Order #${r.orderId}`}
                  {r.requiresReview && <span className="chip chip-danger" style={{ marginLeft: 6 }}>Review</span>}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.reference}{r.providerTransactionId ? ` · ${r.providerTransactionId}` : ''}</td>
                <td>{r.paidAt ? formatDate(r.paidAt) : '—'}</td>
                <td style={{ fontWeight: 700 }}>{formatPrice(r.amountNaira)}</td>
                <td>{r.gatewayFee != null ? formatPrice(r.gatewayFee) : '—'}</td>
                <td>{r.expectedSettlementAmount != null ? formatPrice(r.expectedSettlementAmount) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-drawer-section" style={{ marginTop: 16, maxWidth: 520 }}>
        <h4>Record settlement</h4>
        <p style={{ fontSize: 13 }}>{chosen.length} selected · {formatPrice(total)}</p>
        <div className="form-group">
          <label htmlFor="settle-ref">Flutterwave settlement reference <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input id="settle-ref" type="text" maxLength={120} value={reference} onChange={(ev) => setReference(ev.target.value)} placeholder="Settlement ID from the Flutterwave dashboard" />
        </div>
        <div className="form-group">
          <label htmlFor="settle-at">Settlement date (optional, defaults to now)</label>
          <input id="settle-at" type="date" max={today} value={settledAt} onChange={(ev) => setSettledAt(ev.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="settle-note">Note (optional)</label>
          <textarea id="settle-note" rows={2} maxLength={1000} value={note} onChange={(ev) => setNote(ev.target.value)} />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, margin: '4px 0 12px' }}>
          <input type="checkbox" checked={checked} onChange={(ev) => setChecked(ev.target.checked)} style={{ marginTop: 3 }} />
          I have checked these payments against the Flutterwave settlement report.
        </label>
        <button className="btn-primary btn-inline" style={{ width: '100%', justifyContent: 'center' }} disabled={!canSubmit} onClick={() => void submit()}>
          {record.isPending ? 'Recording…' : 'Record settlement'}
        </button>
      </div>
    </>
  );
}
