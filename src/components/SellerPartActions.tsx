import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatPrice } from '../lib/format';
import {
  canChangeBeforeDispatch, describeShortfall, reportShortfall, SHORTFALL_REASONS, shortfallLines, shortfallReasonError, type ShortfallReason,
} from '../lib/disputes';
import type { Order } from '../types';

/** Batch 6, seller side of one order in My Sales: before sending, report that some units can't be
 *  supplied (the buyer is refunded for them automatically; nothing at all cancels the part with a full
 *  refund). When the part is on hold because of a dispute, link to it. */
export function SellerPartActions({ order }: { order: Order }) {
  const qc = useQueryClient();
  const vo = order.vendorOrders?.[0];
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<ShortfallReason | ''>('');
  const [busy, setBusy] = useState(false);
  if (!vo) return null;

  const shorts = order.items.filter((it) => (it.shortfallQuantity ?? 0) > 0);
  const { lines, error: qtyError } = shortfallLines(order.items, available);
  const touched = Object.values(available).some((v) => v.trim() !== '');
  const error = qtyError ?? shortfallReasonError(reason, note);

  async function submit() {
    if (!vo || error || reason === '') return;
    setBusy(true);
    const r = await reportShortfall(vo.id, lines, reason, note.trim() || undefined);
    setBusy(false);
    if (r) {
      setOpen(false);
      setAvailable({});
      setNote('');
      setReason('');
      void qc.invalidateQueries({ queryKey: ['orders', 'sales'] });
    }
  }

  return (
    <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
      {shorts.map((it) => (
        <div key={it.id} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {it.name}: {describeShortfall(it)}
        </div>
      ))}
      {vo.onHold && (
        <Link to="/account/disputes" style={{ fontSize: 12 }}><i className="fa-solid fa-scale-balanced"></i> Respond to the dispute</Link>
      )}
      {canChangeBeforeDispatch(vo) && !open && (
        <button className="btn-outline btn-sm btn-inline" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setOpen(true)}>
          <i className="fa-solid fa-boxes-stacked"></i> Can’t supply everything?
        </button>
      )}
      {open && (
        <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 10, display: 'grid', gap: 8, minWidth: 240, maxWidth: 360, background: 'var(--bg)' }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>How many can you supply?</div>
          {order.items.map((it) => {
            const owed = it.quantity - (it.shortfallQuantity ?? 0);
            return (
              <label key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ minWidth: 0 }}>{it.name} <span style={{ color: 'var(--muted)' }}>(ordered {owed} × {formatPrice(it.price)})</span></span>
                <input type="number" inputMode="numeric" min={0} max={owed} step={1} placeholder={String(owed)} style={{ width: 70 }}
                  value={available[it.id] ?? ''} onChange={(e) => setAvailable({ ...available, [it.id]: e.target.value })}
                  aria-label={`Units of ${it.name} you can supply`} />
              </label>
            );
          })}
          <select value={reason} onChange={(e) => setReason(e.target.value as ShortfallReason)} aria-label="Why can't you supply it?">
            <option value="">Why can’t you supply it?</option>
            {(Object.keys(SHORTFALL_REASONS) as ShortfallReason[]).map((k) => <option key={k} value={k}>{SHORTFALL_REASONS[k]}</option>)}
          </select>
          <input type="text" maxLength={500} placeholder={reason === 'OTHER' ? 'Say briefly why (shown to the buyer)' : 'Note for the buyer (optional)'}
            value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note for the buyer" />
          <small style={{ color: 'var(--muted)', fontSize: 11 }}>
            The buyer sees your reason and is refunded for the missing units straight away. Don’t share phone numbers or emails.
            Entering 0 for everything cancels your part with a full refund.
          </small>
          {(touched || reason !== '') && error && <small style={{ color: 'var(--danger)', fontSize: 11 }}>{error}</small>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-primary btn-sm btn-inline" disabled={busy || !!error} onClick={() => void submit()}>{busy ? '…' : 'Refund missing units'}</button>
            <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => { setOpen(false); setAvailable({}); setReason(''); setNote(''); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
