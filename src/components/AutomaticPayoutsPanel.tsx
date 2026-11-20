import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLoadingSpinner } from './LoadingSpinner';
import { ConfirmDialog } from './ConfirmDialog';
import { formatPrice } from '../lib/format';
import { shortDateTime } from '../lib/fulfilmentRules';
import {
  approvePayout, approvePayoutBatch, canCancelPayout, cancelAutoPayout, canSendNow, checkPayoutStatuses, gateLines, getPayoutPipeline,
  needsOwnApproval, pausePayouts, PAYOUT_STATUS_LABELS, PAYOUT_STATUS_TONE, preparePayouts, resumePayouts, savePayoutSettings,
  sendApprovedPayouts, skippedLines, type Payout, type PayoutBatch,
} from '../lib/payouts';

const TONE = { neutral: 'chip-neutral', pending: 'chip-pending', success: 'chip-success', danger: 'chip-danger' } as const;

/**
 * Batch 7: automatic payouts through Flutterwave transfers (founder decisions, 20 Nov 2026): one transfer
 * per order, prepared daily at 10:00 Lagos, approved by an admin (large payouts one by one), sent, and
 * confirmed by Flutterwave before anything is recorded as paid.
 */
export function AutomaticPayoutsPanel() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin', 'payouts', 'automation'], queryFn: getPayoutPipeline, refetchInterval: 20_000 });
  const [busy, setBusy] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [cancelling, setCancelling] = useState<Payout | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    window.setTimeout(() => void qc.invalidateQueries({ queryKey: ['admin', 'payouts', 'automation'] }), 2500);
  };
  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    refresh();
    return r;
  }

  if (isLoading) return <PageLoadingSpinner message="Loading automatic payouts…" />;
  if (isError || !data) return <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load automatic payouts.</p></div>;
  const g = data.gates;
  const sendable = canSendNow(g);
  const byBatch = new Map<number, Payout[]>();
  data.awaitingApproval.forEach((p) => { const k = p.batchId ?? 0; byBatch.set(k, [...(byBatch.get(k) ?? []), p]); });

  return (
    // minmax(0, 1fr): wide tables scroll inside their own box instead of widening the page on phones.
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      {/* Safety gates */}
      <section className="card-panel" style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={h3}>Can money move right now?</h3>
          <span className={`chip ${sendable ? 'chip-success' : 'chip-danger'}`}>{sendable ? 'Yes - transfers can be sent' : 'No - transfers are stopped'}</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0', display: 'grid', gap: 6 }}>
          {gateLines(g).map((l) => (
            <li key={l.label} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
              <i className={`fa-solid ${l.ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ color: l.ok ? 'var(--primary)' : 'var(--danger)', marginTop: 3 }}></i>
              <span><strong>{l.label}.</strong> <span style={{ color: 'var(--text-secondary)' }}>{l.detail}</span></span>
            </li>
          ))}
        </ul>
        {g.paused
          ? <button className="btn-primary btn-sm btn-inline" disabled={busy} onClick={() => void run(resumePayouts)}>Resume payouts</button>
          : <button className="btn-outline btn-sm btn-inline" style={{ color: 'var(--danger)' }} disabled={busy} onClick={() => setPausing(true)}>
            <i className="fa-solid fa-circle-pause"></i> Pause all payouts</button>}
      </section>

      <SettingsCard mode={g.mode} threshold={g.approvalThreshold} minimum={g.minimum} onSaved={refresh} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-outline btn-sm btn-inline" disabled={busy || !g.transfersEnabled || g.paused} onClick={() => void run(preparePayouts)}>
          <i className="fa-solid fa-list-check"></i> Prepare payouts now</button>
        <button className="btn-outline btn-sm btn-inline" disabled={busy || !sendable || data.queued.length === 0} onClick={() => void run(sendApprovedPayouts)}>
          <i className="fa-solid fa-paper-plane"></i> Send approved ({data.queued.length})</button>
        <button className="btn-outline btn-sm btn-inline" disabled={busy || data.inFlight.length === 0} onClick={() => void run(checkPayoutStatuses)}>
          <i className="fa-solid fa-rotate"></i> Check status with Flutterwave ({data.inFlight.length})</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '-8px 0 0' }}>
        Payouts are prepared every day at 10:00 (Lagos). Each is re-checked just before it is sent; anything no longer eligible (refund,
        dispute, bank change) is cancelled automatically. A payout is marked paid only when Flutterwave confirms it.
      </p>

      <section style={panel}>
        <h3 style={h3}>Waiting for approval ({data.awaitingApproval.length})</h3>
        {data.awaitingApproval.length === 0 ? <p style={empty}>Nothing to approve.</p> : [...byBatch.entries()].map(([batchId, list]) => {
          const batchable = list.filter((p) => !needsOwnApproval(p));
          const total = batchable.reduce((s, p) => s + p.amountSent, 0);
          return (
            <div key={batchId} style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 13 }}>Batch #{batchId}</strong>
                {batchable.length > 0 && (
                  <button className="btn-primary btn-sm btn-inline" disabled={busy || g.paused} onClick={() => void run(() => approvePayoutBatch(batchId))}>
                    Approve {batchable.length} ({formatPrice(total)})</button>
                )}
              </div>
              <PayoutTable rows={list} actions={(p) => (
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {needsOwnApproval(p) && <button className="btn-primary btn-sm btn-inline" disabled={busy || g.paused} onClick={() => void run(() => approvePayout(p.id))}>Approve</button>}
                  <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => setCancelling(p)}>Cancel</button>
                </span>
              )} />
            </div>
          );
        })}
      </section>

      {data.queued.length > 0 && (
        <section style={panel}>
          <h3 style={h3}>Approved, sending next ({data.queued.length})</h3>
          <PayoutTable rows={data.queued} actions={(p) => canCancelPayout(p.status)
            ? <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => setCancelling(p)}>Cancel</button> : null} />
        </section>
      )}

      <section style={panel}>
        <h3 style={h3}>Sent, waiting for Flutterwave ({data.inFlight.length})</h3>
        {data.inFlight.length === 0 ? <p style={empty}>No transfers waiting.</p> : <PayoutTable rows={data.inFlight} />}
        {data.inFlight.some((p) => p.status === 'UNKNOWN') && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            “Checking” means Flutterwave didn’t answer clearly. It is never resent blindly: AgroBaba looks it up by its reference, and only if
            Flutterwave has no trace of it after 30 minutes is it sent again with the same reference (Flutterwave refuses duplicates).
          </p>
        )}
      </section>

      {data.recentProblems.length > 0 && (
        <section style={panel}>
          <h3 style={h3}>Recent failed or cancelled</h3>
          <PayoutTable rows={data.recentProblems} showReason />
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>No money left AgroBaba for these. The seller’s share stays available and is prepared again on the next run
            (after 3 failed transfers it stops - check the seller’s bank details or pay manually).</p>
        </section>
      )}

      <BatchHistory batches={data.batches} />

      <ConfirmDialog open={pausing} title="Pause all payouts?" confirmLabel="Pause payouts" destructive busy={busy}
        message="Nothing is prepared or sent until you resume. Transfers already sent are still checked so their outcome is recorded."
        onConfirm={() => { if (pauseReason.trim()) void run(() => pausePayouts(pauseReason.trim())).then((ok) => { if (ok) { setPausing(false); setPauseReason(''); } }); }}
        onCancel={() => { setPausing(false); setPauseReason(''); }}>
        <textarea aria-label="Why pause" placeholder="Why (required)" rows={2} maxLength={500} value={pauseReason} onChange={(e) => setPauseReason(e.target.value)}
          style={{ width: '100%', margin: '4px 0 12px', fontSize: 13 }} />
      </ConfirmDialog>
      <ConfirmDialog open={!!cancelling} title="Cancel this payout?" confirmLabel="Cancel payout" destructive busy={busy}
        message="It won't be sent. The money stays available for the seller and is prepared again on the next run unless something changes."
        onConfirm={() => { if (cancelling && cancelReason.trim()) void run(() => cancelAutoPayout(cancelling.id, cancelReason.trim())).then((ok) => { if (ok) { setCancelling(null); setCancelReason(''); } }); }}
        onCancel={() => { setCancelling(null); setCancelReason(''); }}>
        <textarea aria-label="Why cancel" placeholder="Why (required)" rows={2} maxLength={500} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
          style={{ width: '100%', margin: '4px 0 12px', fontSize: 13 }} />
      </ConfirmDialog>
    </div>
  );
}

function PayoutTable({ rows, actions, showReason }: { rows: Payout[]; actions?: (p: Payout) => React.ReactNode; showReason?: boolean }) {
  return (
    <div className="admin-table-wrap" style={{ marginTop: 8 }}>
      <table className="admin-table">
        <thead><tr><th>Seller</th><th>Order</th><th>To send</th><th>Status</th><th>{showReason ? 'Why' : 'Details'}</th>{actions && <th></th>}</tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.sellerName || `Seller #${p.sellerId}`}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.invoiceNumber}</td>
              <td style={{ fontWeight: 700 }}>{formatPrice(p.amountSent)}
                {p.approvalReason === 'LARGE_AMOUNT' && <div style={{ fontSize: 10, color: 'var(--danger)' }}>large payout</div>}</td>
              <td><span className={`chip ${TONE[PAYOUT_STATUS_TONE[p.status]]}`}>{PAYOUT_STATUS_LABELS[p.status]}</span></td>
              <td style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 280 }}>
                {showReason ? (p.failureReason || p.cancelReason || '—') : (
                  <>
                    <span style={{ fontFamily: 'monospace' }}>{p.transferReference}</span>
                    {p.submittedAt && <div>sent {shortDateTime(p.submittedAt)}{p.attemptCount > 1 ? ` · attempt ${p.attemptCount}` : ''}</div>}
                    {p.approvedBy && <div>approved by {p.approvedBy}</div>}
                  </>
                )}
              </td>
              {actions && <td>{actions(p)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsCard({ mode, threshold, minimum, onSaved }: { mode: string; threshold: number; minimum: number; onSaved: () => void }) {
  const [m, setM] = useState(mode);
  const [t, setT] = useState(String(threshold));
  const [min, setMin] = useState(String(minimum));
  const [busy, setBusy] = useState(false);
  const tn = Number(t), mn = Number(min);
  const valid = Number.isFinite(tn) && tn >= 0 && Number.isFinite(mn) && mn >= 0;
  const changed = m !== mode || tn !== threshold || mn !== minimum;
  return (
    <section style={panel}>
      <h3 style={h3}>Settings</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 8 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="po-mode">Approval</label>
          <select id="po-mode" value={m} onChange={(e) => setM(e.target.value)}>
            <option value="APPROVAL">An admin approves each batch</option>
            <option value="AUTOMATIC">Fully automatic</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="po-large">Large payout - always needs approval above (₦)</label>
          <input id="po-large" type="number" inputMode="decimal" min="0" value={t} onChange={(e) => setT(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="po-min">Smallest automatic payout (₦)</label>
          <input id="po-min" type="number" inputMode="decimal" min="0" value={min} onChange={(e) => setMin(e.target.value)} />
          <small style={{ color: 'var(--muted)', fontSize: 11 }}>Smaller ones are left for a manual payout. 0 = no minimum.</small>
        </div>
      </div>
      <button className="btn-primary btn-sm btn-inline" style={{ marginTop: 10 }} disabled={busy || !valid || !changed}
        onClick={async () => { setBusy(true); const ok = await savePayoutSettings({ mode: m, approvalThreshold: tn, minimum: mn }); setBusy(false); if (ok) onSaved(); }}>
        Save settings</button>
    </section>
  );
}

function BatchHistory({ batches }: { batches: PayoutBatch[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (batches.length === 0) return null;
  return (
    <section style={panel}>
      <h3 style={h3}>Recent batches</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 6 }}>
        {batches.map((b) => {
          const skipped = skippedLines(b.skipped);
          return (
            <li key={b.id} style={{ fontSize: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span><strong>#{b.id}</strong> · {shortDateTime(b.createdAt)} · {b.trigger === 'SCHEDULED' ? 'daily run' : `by ${b.createdBy ?? 'admin'}`}</span>
                <span>{b.payoutCount} payout{b.payoutCount === 1 ? '' : 's'} · {formatPrice(b.totalAmount)}{b.approvedBy ? ` · approved by ${b.approvedBy}` : ''}</span>
              </div>
              {skipped.length > 0 && (
                <button className="btn-link" style={{ fontSize: 11, padding: 0, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                  onClick={() => setOpen(open === b.id ? null : b.id)}>{skipped.length} left out - {open === b.id ? 'hide' : 'why?'}</button>
              )}
              {open === b.id && <ul style={{ margin: '4px 0 0 16px', color: 'var(--text-secondary)' }}>{skipped.map((s) => <li key={s}>{s}</li>)}</ul>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const panel = { border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', background: 'var(--bg)' } as const;
const h3 = { fontSize: 14, fontWeight: 800, margin: 0 } as const;
const empty = { fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' } as const;
