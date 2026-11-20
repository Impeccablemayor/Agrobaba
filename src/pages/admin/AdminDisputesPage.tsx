import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { DisputeSummary, DisputeThread } from '../../components/DisputeThread';
import { formatPrice } from '../../lib/format';
import { shortDateTime } from '../../lib/fulfilmentRules';
import {
  adminListDisputes, adminResolveDispute, allowedOutcomes, isOpenDispute, OUTCOME_LABELS, REASON_LABELS, resolveError, statusLabel,
  type Dispute, type DisputeOutcome,
} from '../../lib/disputes';

const FILTERS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'RESOLVED', label: 'Decided' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
  { key: '', label: 'All' },
] as const;

/** Batch 6: every dispute, oldest open first. An open dispute holds that seller's payout (only that
 *  seller's part of the order). The decision refunds from the platform while AgroBaba still holds the
 *  money; once the seller is paid out, only "seller refunded the buyer directly" or another
 *  documented resolution can be recorded (founder decision, 19 Nov 2026). */
export default function AdminDisputesPage() {
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<string>('OPEN');
  const selectedId = params.get('id') ? Number(params.get('id')) : null;
  const { data = [], isLoading, isError } = useQuery({ queryKey: ['admin', 'disputes', filter], queryFn: () => adminListDisputes(filter || undefined) });
  const selectedFromList = data.find((d) => d.id === selectedId);
  const { data: all = [] } = useQuery({
    queryKey: ['admin', 'disputes', ''],
    queryFn: () => adminListDisputes(),
    enabled: selectedId != null && !selectedFromList,
  });
  const selected = selectedFromList ?? all.find((d) => d.id === selectedId) ?? null;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Disputes</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 680 }}>
          Problems buyers reported after an order was sent. The seller’s payout for that part is held until you decide.
          Sellers have 48 hours to respond; after that the dispute comes to you anyway.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f.key} className={`btn-sm btn-inline ${filter === f.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>
      {selected && (
        <AdminDisputeDetail key={selected.id} d={selected} onClose={() => setParams({})} />
      )}
      {isLoading ? <PageLoadingSpinner message="Loading disputes…" />
        : isError ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load disputes.</p></div>
        : data.length === 0 ? <div className="empty-cart"><i className="fa-solid fa-scale-balanced"></i><p>No disputes here.</p></div>
        : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>#</th><th>Order</th><th>Seller</th><th>Reason</th><th>Status</th><th>Opened</th><th></th></tr></thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id} style={d.id === selectedId ? { background: 'var(--primary-subtle)' } : undefined}>
                    <td>{d.id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.vendorOrderNumber}</td>
                    <td>{d.sellerName ?? `#${d.sellerId}`}{d.sellerPaidOut && <div style={{ fontSize: 11, color: 'var(--danger)' }}>Already paid out</div>}</td>
                    <td>{REASON_LABELS[d.reason]}</td>
                    <td>
                      {statusLabel(d.status, 'admin')}
                      {d.status === 'AWAITING_SELLER' && d.sellerResponseDueAt && <div style={{ fontSize: 11, color: 'var(--muted)' }}>seller by {shortDateTime(d.sellerResponseDueAt)}</div>}
                      {d.outcome && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{OUTCOME_LABELS[d.outcome]}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{shortDateTime(d.createdAt)}</td>
                    <td><button className="btn-outline btn-sm btn-inline" onClick={() => { setParams({ id: String(d.id) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function AdminDisputeDetail({ d, onClose }: { d: Dispute; onClose: () => void }) {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin', 'disputes'] });
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: 16, background: 'var(--bg)', marginBottom: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-outline btn-sm btn-inline" onClick={onClose} aria-label="Close dispute"><i className="fa-solid fa-xmark"></i> Close</button>
      </div>
      <DisputeSummary d={d} role="admin" />
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        Invoice <span style={{ fontFamily: 'monospace' }}>{d.invoiceNumber}</span>
        {d.requestedOutcome && <> · buyer asks for: <strong>{d.requestedOutcome.replace('_', ' ').toLowerCase()}</strong></>}
        {d.refundable != null && <> · still refundable on this part: <strong>{formatPrice(d.refundable)}</strong>
          {(d.refundableDelivery ?? 0) > 0 && <> (of which delivery {formatPrice(d.refundableDelivery ?? 0)})</>}</>}
      </div>
      <DisputeThread d={d} role="admin" onUpdated={refresh} />
      {isOpenDispute(d.status) && <ResolveForm d={d} onDone={refresh} />}
    </div>
  );
}

function ResolveForm({ d, onDone }: { d: Dispute; onDone: () => void }) {
  const options = allowedOutcomes(d.sellerPaidOut);
  const [outcome, setOutcome] = useState<DisputeOutcome>(options[0]);
  const [amount, setAmount] = useState('');
  const [delivery, setDelivery] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const refundable = d.refundable ?? 0;
  const err = resolveError({
    outcome, amount: amount ? Number(amount) : null, deliveryPortion: delivery ? Number(delivery) : null, note,
    refundable, refundableDelivery: d.refundableDelivery ?? 0, sellerPaidOut: d.sellerPaidOut,
  });

  async function submit() {
    if (err) return;
    setBusy(true);
    const r = await adminResolveDispute(d.id, {
      outcome,
      amount: outcome === 'PARTIAL_REFUND' ? Number(amount) : undefined,
      deliveryPortion: outcome === 'PARTIAL_REFUND' && delivery ? Number(delivery) : undefined,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (r) onDone();
  }

  const hint: Record<DisputeOutcome, string> = {
    FULL_REFUND: `Refunds ${formatPrice(refundable)} to the buyer’s payment method. The part is closed and the seller gets nothing for it.`,
    PARTIAL_REFUND: 'Refunds this amount; the seller is paid the rest (less the 3% commission on what they keep).',
    RELEASE_TO_SELLER: 'No refund. The part is completed and the seller becomes payable.',
    SELLER_REFUNDED_DIRECTLY: 'The seller was already paid out. Record how they refunded the buyer (amount, date, reference). AgroBaba makes no refund.',
    OTHER: d.sellerPaidOut ? 'Record what was agreed. No money moves.' : 'Record what was agreed (e.g. a replacement). No money moves; the hold is lifted and inspection carries on.',
  };

  return (
    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, display: 'grid', gap: 8 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Decision</h3>
      {d.sellerPaidOut && (
        <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>
          This seller has already been paid for this order, so AgroBaba no longer holds the money and can’t refund it from the platform.
        </p>
      )}
      <div style={{ display: 'grid', gap: 4 }}>
        {options.map((o) => (
          <label key={o} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input type="radio" name={`outcome-${d.id}`} checked={outcome === o} onChange={() => setOutcome(o)} /> {OUTCOME_LABELS[o]}
          </label>
        ))}
      </div>
      <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{hint[outcome]}</small>
      {outcome === 'PARTIAL_REFUND' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 160, flex: 1 }}>
            <label htmlFor={`amt-${d.id}`}>Amount to refund (₦)</label>
            <input id={`amt-${d.id}`} type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {(d.refundableDelivery ?? 0) > 0 && (
            <div className="form-group" style={{ margin: 0, minWidth: 160, flex: 1 }}>
              <label htmlFor={`del-${d.id}`}>Of which delivery fee (₦)</label>
              <input id={`del-${d.id}`} type="number" inputMode="decimal" min="0" step="0.01" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
            </div>
          )}
        </div>
      )}
      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor={`note-${d.id}`}>Note to both sides{outcome === 'OTHER' || outcome === 'SELLER_REFUNDED_DIRECTLY' ? '' : ' (optional)'}</label>
        <textarea id={`note-${d.id}`} rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {err && (amount || note || outcome === 'FULL_REFUND' || outcome === 'RELEASE_TO_SELLER') && <small style={{ color: 'var(--danger)', fontSize: 12 }}>{err}</small>}
      <div>
        <button className="btn-primary btn-sm btn-inline" disabled={busy || !!err} onClick={() => void submit()}>{busy ? 'Recording…' : 'Record decision'}</button>
      </div>
    </div>
  );
}
