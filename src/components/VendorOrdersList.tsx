import { useState } from 'react';
import { formatPrice } from '../lib/format';
import {
  acceptVendorOrder, adminCompleteVendorOrder, adminHoldVendorOrder, adminReleaseVendorOrder, canAccept, canReportProblem,
  describeStage, reportVendorOrderProblem, type Viewer,
} from '../lib/fulfilment';
import { ConfirmDialog } from './ConfirmDialog';
import type { VendorOrderView } from '../types';

const TONE_CHIP = { neutral: 'chip-neutral', pending: 'chip-pending', success: 'chip-success', danger: 'chip-danger' } as const;

/** One checkout can include several sellers. Each seller's part has its own number, stage and
 *  inspection period, so one seller's delay never holds up another. Buyers can accept early or report
 *  a problem; admins can hold, release or complete a part (Batch 5). */
export function VendorOrdersList({ vendorOrders, viewer = 'buyer', onChanged }: {
  vendorOrders: VendorOrderView[];
  viewer?: Viewer;
  onChanged?: (updated: VendorOrderView) => void;
}) {
  if (!vendorOrders || vendorOrders.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {vendorOrders.map((v) => <VendorOrderRow key={v.id} v={v} viewer={viewer} onChanged={onChanged} />)}
    </div>
  );
}

type Prompt = { kind: 'report' | 'hold' | 'release' | 'complete'; text: string } | null;

function VendorOrderRow({ v, viewer, onChanged }: { v: VendorOrderView; viewer: Viewer; onChanged?: (u: VendorOrderView) => void }) {
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const d = v.fulfilmentStage ? describeStage(v, viewer) : null;

  async function run(fn: () => Promise<VendorOrderView | false>) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r) { setPrompt(null); onChanged?.({ ...v, ...r, sellerName: v.sellerName }); }
  }

  const PROMPTS = {
    report: { title: 'What is wrong?', hint: 'For example: items missing, damaged, spoilt or not what you ordered.', button: 'Report problem',
      go: (t: string) => run(() => reportVendorOrderProblem(v.id, t)) },
    hold: { title: 'Why hold this payout?', hint: 'Recorded, and the seller is told it is on hold.', button: 'Hold payout',
      go: (t: string) => run(() => adminHoldVendorOrder(v.id, t)) },
    release: { title: 'How was it resolved?', hint: 'Sent to the buyer and the seller.', button: 'Release hold',
      go: (t: string) => run(() => adminReleaseVendorOrder(v.id, t)) },
    complete: { title: 'Why complete it now?', hint: 'Ends inspection (and confirms receipt if needed); the seller becomes payable.', button: 'Complete',
      go: (t: string) => run(() => adminCompleteVendorOrder(v.id, t)) },
  };

  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 12px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{v.sellerName || `Seller #${v.sellerId}`}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{v.vendorOrderNumber}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {d && d.label
            ? <span className={`chip ${TONE_CHIP[d.tone]}`}>{d.label}</span>
            : <span className={`status-${v.status === 'delivered' ? 'delivered' : 'pending'}`} style={{ textTransform: 'capitalize', fontSize: 11.5 }}>{v.status}</span>}
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>{formatPrice(v.total)}</span>
        </div>
      </div>
      {d?.detail && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0' }}>{d.detail}</p>}

      {viewer === 'buyer' && (canAccept(v) || (canReportProblem(v) && !v.onHold)) && !prompt && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {canAccept(v) && (
            <button className="btn-primary btn-sm btn-inline" disabled={busy} onClick={() => setConfirmAccept(true)}>
              <i className="fa-solid fa-thumbs-up"></i> Everything is fine
            </button>
          )}
          {canReportProblem(v) && !v.onHold && (
            <button className="btn-outline btn-sm btn-inline" style={{ color: 'var(--danger)' }} disabled={busy}
              onClick={() => setPrompt({ kind: 'report', text: '' })}>
              <i className="fa-solid fa-flag"></i> Report a problem
            </button>
          )}
        </div>
      )}

      {viewer === 'admin' && v.fulfilmentStage && !['UNPAID', 'CANCELLED', 'COMPLETED'].includes(v.fulfilmentStage) && !prompt && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {v.onHold
            ? <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => setPrompt({ kind: 'release', text: '' })}>Release hold</button>
            : <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => setPrompt({ kind: 'hold', text: '' })}>Hold payout</button>}
          <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => setPrompt({ kind: 'complete', text: '' })}>Complete now</button>
        </div>
      )}

      {prompt && (
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          <label htmlFor={`vo-${v.id}-${prompt.kind}`} style={{ fontSize: 12, fontWeight: 700 }}>{PROMPTS[prompt.kind].title}</label>
          <textarea id={`vo-${v.id}-${prompt.kind}`} rows={2} maxLength={1000} value={prompt.text}
            onChange={(e) => setPrompt({ ...prompt, text: e.target.value })} />
          <small style={{ color: 'var(--muted)', fontSize: 11 }}>{PROMPTS[prompt.kind].hint}</small>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary btn-sm btn-inline" disabled={busy || prompt.text.trim().length < 5}
              onClick={() => void PROMPTS[prompt.kind].go(prompt.text.trim())}>{busy ? '…' : PROMPTS[prompt.kind].button}</button>
            <button className="btn-outline btn-sm btn-inline" onClick={() => setPrompt(null)}>Cancel</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAccept}
        title="Is everything fine?"
        message="Confirm only if you have checked the goods. The seller will be paid and you can no longer report a problem with this part of your order."
        confirmLabel="Yes, everything is fine"
        onConfirm={() => { setConfirmAccept(false); void run(() => acceptVendorOrder(v.id)); }}
        onCancel={() => setConfirmAccept(false)}
      />
    </div>
  );
}
