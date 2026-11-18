import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfluencer, useInfluencers, usePayInfluencer, useSaveInfluencer, useVoidInfluencerPayout } from '../../hooks/queries/useInfluencers';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDate, formatPrice } from '../../lib/format';
import { COMMISSION_LABELS, type Influencer, type InfluencerInput, type InfluencerPayout } from '../../lib/influencers';

/** Influencers who own coupon codes. AgroBaba pays their commission (e.g. 1% of each order that
 *  used their code); it becomes payable once the order is paid and delivered. Admin sends the money
 *  in the Flutterwave dashboard, then records it here. */
export default function AdminInfluencersPage() {
  const { data: influencers = [], isLoading, isError } = useInfluencers();
  const [editing, setEditing] = useState<Influencer | 'new' | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Influencers</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Their commission is paid by AgroBaba, never by sellers. Give them a code on the <Link to="/admin/coupons">Coupons</Link> page.
          </p>
        </div>
        <button className="btn-primary btn-inline" onClick={() => setEditing('new')}><i className="fa-solid fa-plus"></i> Add influencer</button>
      </div>

      {isLoading ? <PageLoadingSpinner message="Loading influencers…" />
        : isError ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load influencers.</p></div>
        : influencers.length === 0 ? <div className="empty-cart"><i className="fa-solid fa-bullhorn"></i><p>No influencers yet.</p></div>
        : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Influencer</th><th>Codes</th><th>Orders</th><th>Earned</th><th>Ready to pay</th><th>Paid</th><th></th></tr></thead>
              <tbody>
                {influencers.map((i) => (
                  <tr key={i.id} onClick={() => setOpenId(i.id)} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontWeight: 700 }}>{i.name}</div>{!i.active && <span className="chip chip-neutral">Inactive</span>}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{i.codes.join(', ') || '—'}</td>
                    <td>{i.orders}</td>
                    <td>{formatPrice(i.earned + i.awaitingPayment)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatPrice(i.payable)}</td>
                    <td>{formatPrice(i.paidOut)}</td>
                    <td><button className="btn-outline btn-sm btn-inline" onClick={(e) => { e.stopPropagation(); setEditing(i); }}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {editing && <InfluencerForm influencer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {openId != null && <InfluencerDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function InfluencerForm({ influencer, onClose }: { influencer: Influencer | null; onClose: () => void }) {
  const save = useSaveInfluencer();
  const [f, setF] = useState<InfluencerInput>({
    name: influencer?.name ?? '', phone: influencer?.phone ?? '', email: influencer?.email ?? '',
    bankName: influencer?.bankName ?? '', bankAccountName: influencer?.bankAccountName ?? '',
    bankAccountNumber: influencer?.bankAccountNumber ?? '', notes: influencer?.notes ?? '', active: influencer?.active ?? true,
  });
  const set = (k: keyof InfluencerInput) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    if (await save.mutateAsync({ input: f, id: influencer?.id })) onClose();
  }

  return (
    <div className="admin-drawer-overlay" onClick={onClose}>
      <div className="admin-drawer" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100vw)' }}>
        <div className="admin-drawer-hdr">
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>{influencer ? `Edit ${influencer.name}` : 'Add influencer'}</h3>
          <button className="admin-drawer-close" aria-label="Close" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="form-group"><label htmlFor="i-name">Name</label><input id="i-name" type="text" value={f.name} onChange={set('name')} /></div>
        <div className="form-group"><label htmlFor="i-phone">Phone</label><input id="i-phone" type="tel" value={f.phone} onChange={set('phone')} /></div>
        <div className="form-group"><label htmlFor="i-email">Email</label><input id="i-email" type="email" value={f.email} onChange={set('email')} /></div>
        <div className="form-group"><label htmlFor="i-bank">Bank</label><input id="i-bank" type="text" value={f.bankName} onChange={set('bankName')} /></div>
        <div className="form-group"><label htmlFor="i-acct-name">Account name</label><input id="i-acct-name" type="text" value={f.bankAccountName} onChange={set('bankAccountName')} /></div>
        <div className="form-group"><label htmlFor="i-acct">Account number</label><input id="i-acct" type="text" inputMode="numeric" maxLength={10} value={f.bankAccountNumber} onChange={set('bankAccountNumber')} /></div>
        <div className="form-group"><label htmlFor="i-notes">Notes</label><textarea id="i-notes" rows={2} value={f.notes} onChange={set('notes')} /></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, margin: '4px 0 14px' }}>
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active
        </label>
        <button className="btn-primary btn-inline" disabled={save.isPending || !f.name.trim()} onClick={() => void submit()}>Save</button>
      </div>
    </div>
  );
}

function InfluencerDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useInfluencer(id);
  const pay = usePayInfluencer();
  const voidPayout = useVoidInfluencerPayout();
  const [reference, setReference] = useState('');
  const [sent, setSent] = useState(false);
  const [voiding, setVoiding] = useState<InfluencerPayout | null>(null);
  const [reason, setReason] = useState('');
  const i = data?.influencer;

  async function recordPayout() {
    if (!i || !reference.trim() || !sent) return;
    if (await pay.mutateAsync({ id: i.id, reference: reference.trim() })) { setReference(''); setSent(false); }
  }

  return (
    <div className="admin-drawer-overlay" onClick={onClose}>
      <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="admin-drawer-hdr">
          <div><h3>{i?.name ?? 'Influencer'}</h3><p>{i?.codes.join(', ') || 'No code yet'}</p></div>
          <button className="admin-drawer-close" aria-label="Close" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        {isLoading || !data || !i ? <PageLoadingSpinner message="Loading…" /> : (
          <>
            <div className="admin-drawer-section">
              <h4>Pay commission</h4>
              <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ready to pay</span><strong style={{ color: 'var(--primary)' }}>{formatPrice(i.payable)}</strong></p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                {i.bankAccountNumber ? `${i.bankName ?? ''} · ${i.bankAccountName ?? ''} · ${i.bankAccountNumber}` : 'No bank details on file - edit the influencer first.'}
              </p>
              {i.payable > 0 && (
                <>
                  <div className="form-group">
                    <label htmlFor="ip-ref">Flutterwave transfer reference</label>
                    <input id="ip-ref" type="text" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
                  </div>
                  <label style={{ display: 'flex', gap: 8, fontSize: 13, margin: '4px 0 12px' }}>
                    <input type="checkbox" checked={sent} onChange={(e) => setSent(e.target.checked)} /> I have sent {formatPrice(i.payable)} to {i.name}.
                  </label>
                  <button className="btn-primary btn-inline" disabled={!reference.trim() || !sent || pay.isPending} onClick={() => void recordPayout()}>Record payout</button>
                </>
              )}
            </div>
            <div className="admin-drawer-section">
              <h4>Orders with their code ({data.commissions.length})</h4>
              {data.commissions.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>None yet.</p>}
              {data.commissions.map((c) => (
                <div key={c.redemptionId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span><span style={{ fontFamily: 'monospace' }}>{c.invoiceNumber}</span><br /><span style={{ color: 'var(--muted)' }}>{COMMISSION_LABELS[c.status]} · {formatDate(c.createdAt)}</span></span>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(c.commission)}</span>
                </div>
              ))}
            </div>
            <div className="admin-drawer-section">
              <h4>Payouts</h4>
              {data.payouts.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>No payouts recorded.</p>}
              {data.payouts.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 0' }}>
                  <span>{formatDate(p.releasedAt)} · <span style={{ fontFamily: 'monospace' }}>{p.transferReference}</span>{p.status === 'VOIDED' && <span className="chip chip-danger" style={{ marginLeft: 6 }}>Voided</span>}</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong>{formatPrice(p.amount)}</strong>
                    {p.status === 'RELEASED' && <button className="btn-outline btn-sm btn-inline" onClick={() => setVoiding(p)}>Void</button>}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        <ConfirmDialog
          open={!!voiding}
          title="Void this payout record?"
          message="Only if it was recorded by mistake. It does not reverse the bank transfer; the commission becomes payable again."
          confirmLabel="Void record"
          destructive
          busy={voidPayout.isPending}
          onConfirm={() => { if (voiding && reason.trim()) void voidPayout.mutateAsync({ payoutId: voiding.id, reason: reason.trim() }).then((ok) => { if (ok) { setVoiding(null); setReason(''); } }); }}
          onCancel={() => { setVoiding(null); setReason(''); }}
        >
          <textarea aria-label="Reason" placeholder="Reason (required)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', margin: '4px 0 12px', fontSize: 13 }} />
        </ConfirmDialog>
      </div>
    </div>
  );
}
