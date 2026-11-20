import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatPrice } from '../lib/format';
import { canChangeBeforeDispatch, reportShortfall, shortfallLines } from '../lib/disputes';
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
  const [busy, setBusy] = useState(false);
  if (!vo) return null;

  const shorts = order.items.filter((it) => (it.shortfallQuantity ?? 0) > 0);
  const { lines, error } = shortfallLines(order.items, available);
  const touched = Object.values(available).some((v) => v.trim() !== '');

  async function submit() {
    if (!vo || error) return;
    setBusy(true);
    const r = await reportShortfall(vo.id, lines, note.trim() || undefined);
    setBusy(false);
    if (r) {
      setOpen(false);
      setAvailable({});
      setNote('');
      void qc.invalidateQueries({ queryKey: ['orders', 'sales'] });
    }
  }

  return (
    <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
      {shorts.map((it) => (
        <div key={it.id} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {it.name}: {it.shortfallQuantity} of {it.quantity} not supplied (refunded)
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
          <input type="text" maxLength={500} placeholder="Reason (optional, kept on the order record)" value={note} onChange={(e) => setNote(e.target.value)}
            aria-label="Reason for the shortfall" />
          <small style={{ color: 'var(--muted)', fontSize: 11 }}>
            The buyer is refunded for the missing units straight away. Entering 0 for everything cancels your part with a full refund.
          </small>
          {touched && error && <small style={{ color: 'var(--danger)', fontSize: 11 }}>{error}</small>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-primary btn-sm btn-inline" disabled={busy || !!error} onClick={() => void submit()}>{busy ? '…' : 'Refund missing units'}</button>
            <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => { setOpen(false); setAvailable({}); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
