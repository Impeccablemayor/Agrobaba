import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import {
  acceptVendorOrder, adminCompleteVendorOrder, adminHoldVendorOrder, adminReleaseVendorOrder, canAccept,
  describeStage, type Viewer,
} from '../lib/fulfilment';
import {
  cancelPaidPart, canChangeBeforeDispatch, canOpenDispute, getDisputesForPart, isOpenDispute, openDispute, REASON_LABELS,
  REQUESTED_OUTCOMES, type DisputeReason,
} from '../lib/disputes';
import { showToast } from '../lib/toastBus';
import { ConfirmDialog } from './ConfirmDialog';
import { EvidencePicker } from './EvidencePicker';
import type { VendorOrderView } from '../types';

const TONE_CHIP = { neutral: 'chip-neutral', pending: 'chip-pending', success: 'chip-success', danger: 'chip-danger' } as const;

/** One checkout can include several sellers. Each seller's part has its own number, stage and
 *  inspection period, so one seller's delay never holds up another. Buyers can accept early, open a
 *  dispute once it is sent, or cancel a paid part before it is sent (Batch 6); admins can hold,
 *  release or complete a part (Batch 5). A hold from a dispute is decided on the dispute. */
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

type Prompt = { kind: 'cancel' | 'hold' | 'release' | 'complete'; text: string } | null;

function VendorOrderRow({ v, viewer, onChanged }: { v: VendorOrderView; viewer: Viewer; onChanged?: (u: VendorOrderView) => void }) {
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const navigate = useNavigate();
  const d = v.fulfilmentStage ? describeStage(v, viewer) : null;

  async function goToDispute() {
    setBusy(true);
    try {
      const list = await getDisputesForPart(v.id);
      const target = list.find((x) => isOpenDispute(x.status)) ?? list[0];
      if (!target) { showToast('No dispute on this part - it was put on hold by AgroBaba.', 'info'); return; }
      navigate(viewer === 'admin' ? `/admin/disputes?id=${target.id}` : `/account/disputes/${target.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to open the dispute', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function run(fn: () => Promise<VendorOrderView | false>) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r) { setPrompt(null); onChanged?.({ ...v, ...r, sellerName: v.sellerName }); }
  }

  const PROMPTS = {
    cancel: { title: 'Why are you cancelling?', hint: 'You get back everything you paid for this seller’s part, including delivery paid online. Other sellers in your order are not affected.',
      button: 'Cancel and refund',
      go: async (t: string) => {
        setBusy(true);
        const r = await cancelPaidPart(v.id, t);
        setBusy(false);
        if (r) { setPrompt(null); onChanged?.({ ...v, status: 'cancelled', fulfilmentStage: 'CANCELLED' }); }
      } },
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

      {viewer === 'buyer' && (canAccept(v) || canOpenDispute(v) || canChangeBeforeDispatch(v)) && !prompt && !disputeOpen && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {canAccept(v) && (
            <button className="btn-primary btn-sm btn-inline" disabled={busy} onClick={() => setConfirmAccept(true)}>
              <i className="fa-solid fa-thumbs-up"></i> Everything is fine
            </button>
          )}
          {canOpenDispute(v) && (
            <button className="btn-outline btn-sm btn-inline" style={{ color: 'var(--danger)' }} disabled={busy}
              onClick={() => setDisputeOpen(true)}>
              <i className="fa-solid fa-flag"></i> Report a problem
            </button>
          )}
          {canChangeBeforeDispatch(v) && (
            <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => setPrompt({ kind: 'cancel', text: '' })}>
              <i className="fa-solid fa-ban"></i> Cancel this part
            </button>
          )}
        </div>
      )}

      {v.onHold && !prompt && (
        <div style={{ marginTop: 8 }}>
          <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => void goToDispute()}>
            <i className="fa-solid fa-scale-balanced"></i> {viewer === 'admin' ? 'Open dispute' : 'View dispute'}
          </button>
        </div>
      )}

      {disputeOpen && <DisputeForm vendorOrderId={v.id} onCancel={() => setDisputeOpen(false)}
        onOpened={(id) => { setDisputeOpen(false); onChanged?.({ ...v, onHold: true, fulfilmentStage: 'ON_HOLD' }); navigate(`/account/disputes/${id}`); }} />}

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
            <button className="btn-primary btn-sm btn-inline" disabled={busy || prompt.text.trim().length < (prompt.kind === 'cancel' ? 3 : 5)}
              onClick={() => void PROMPTS[prompt.kind].go(prompt.text.trim())}>{busy ? '…' : PROMPTS[prompt.kind].button}</button>
            <button className="btn-outline btn-sm btn-inline" onClick={() => setPrompt(null)}>{prompt.kind === 'cancel' ? 'Keep my order' : 'Cancel'}</button>
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

/** Buyer's dispute: what is wrong, what they would like, and photos or documents as evidence. */
function DisputeForm({ vendorOrderId, onOpened, onCancel }: { vendorOrderId: number; onOpened: (disputeId: number) => void; onCancel: () => void }) {
  const [reason, setReason] = useState<DisputeReason | ''>('');
  const [description, setDescription] = useState('');
  const [wanted, setWanted] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const ready = reason !== '' && description.trim().length >= 10;

  async function submit() {
    if (reason === '' || !ready) return;
    setBusy(true);
    const r = await openDispute(vendorOrderId, { reason, description: description.trim(), requestedOutcome: wanted || undefined, attachments: files });
    setBusy(false);
    if (r) onOpened(r.id);
  }

  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 10, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
        The seller’s payment for this part is held while we look into it. The seller has 48 hours to respond, then AgroBaba decides.
      </p>
      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor={`dr-${vendorOrderId}`}>What went wrong?</label>
        <select id={`dr-${vendorOrderId}`} value={reason} onChange={(e) => setReason(e.target.value as DisputeReason)}>
          <option value="">Choose one</option>
          {(Object.keys(REASON_LABELS) as DisputeReason[]).map((k) => <option key={k} value={k}>{REASON_LABELS[k]}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor={`dd-${vendorOrderId}`}>Tell us what happened</label>
        <textarea id={`dd-${vendorOrderId}`} rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="For example: 2 of the 5 bags were wet and the maize had started to rot." />
        <small style={{ color: 'var(--muted)', fontSize: 11 }}>At least 10 characters. Phone numbers and emails are removed - keep the conversation here.</small>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor={`dw-${vendorOrderId}`}>What would you like? (optional)</label>
        <select id={`dw-${vendorOrderId}`} value={wanted} onChange={(e) => setWanted(e.target.value)}>
          <option value="">Let AgroBaba decide</option>
          {REQUESTED_OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Photos or documents</div>
        <EvidencePicker files={files} onChange={setFiles} disabled={busy} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary btn-sm btn-inline" disabled={busy || !ready} onClick={() => void submit()}>{busy ? 'Sending…' : 'Open dispute'}</button>
        <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
