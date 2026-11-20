import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useInfluencer, useInfluencers, useInfluencerSettings, usePayInfluencer, useSaveInfluencer, useSaveInfluencerSettings, useVoidInfluencerPayout,
} from '../../hooks/queries/useInfluencers';
import { parseMinPayout, payoutState } from '../../lib/influencerRules';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { RevealNumberButton } from '../../components/BankAccountAdmin';
import { revealInfluencerBank } from '../../lib/bankAccounts';
import { formatDate, formatPrice } from '../../lib/format';
import { COMMISSION_LABELS, type Influencer, type InfluencerInput, type InfluencerPayout } from '../../lib/influencers';

/** Influencers who own coupon codes. AgroBaba pays their commission (e.g. 1% of each order that
 *  used their code); it becomes payable once the order is paid and delivered, and is paid once the amount
 *  due reaches the minimum payout (founder decision, 20 Nov 2026). Admin sends the money in the
 *  Flutterwave dashboard, then records it here. */
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
      <MinimumPayoutSetting />

      {isLoading ? <PageLoadingSpinner message="Loading influencers…" />
        : isError ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load influencers.</p></div>
        : influencers.length === 0 ? <div className="empty-cart"><i className="fa-solid fa-bullhorn"></i><p>No influencers yet.</p></div>
        : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Influencer</th><th>Codes</th><th>Orders</th><th>Earned</th><th>Ready to pay</th><th>Next payout</th><th>Paid</th><th></th></tr></thead>
              <tbody>
                {influencers.map((i) => (
                  <tr key={i.id} onClick={() => setOpenId(i.id)} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontWeight: 700 }}>{i.name}</div>{!i.active && <span className="chip chip-neutral">Inactive</span>}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{i.codes.join(', ') || '—'}</td>
                    <td>{i.orders}</td>
                    <td>{formatPrice(i.earned + i.awaitingPayment)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatPrice(i.payable)}</td>
                    <td>
                      {formatPrice(Math.max(i.nextPayout, 0))}
                      <div style={{ fontSize: 11, color: i.nextPayout >= i.minPayout ? 'var(--primary)' : 'var(--muted)' }}>
                        {i.nextPayout >= i.minPayout ? 'Ready to send' : `minimum ${formatPrice(i.minPayout)}`}
                      </div>
                    </td>
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
    // The saved number is never sent to the browser in full; leave blank to keep it.
    bankAccountNumber: '', notes: influencer?.notes ?? '', active: influencer?.active ?? true,
  });
  const [min, setMin] = useState(influencer?.ownMinPayout != null ? String(influencer.ownMinPayout) : '');
  const minCheck = parseMinPayout(min);
  const set = (k: keyof InfluencerInput) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    if (minCheck.error) return;
    if (await save.mutateAsync({ input: { ...f, minPayout: minCheck.value }, id: influencer?.id })) onClose();
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
        <div className="form-group"><label htmlFor="i-acct">Account number</label><input id="i-acct" type="text" inputMode="numeric" maxLength={10} value={f.bankAccountNumber} onChange={set('bankAccountNumber')}
          placeholder={influencer?.bankAccountNumber ? `Leave blank to keep ${influencer.bankAccountNumber}` : '10 digits'} /></div>
        <div className="form-group">
          <label htmlFor="i-min">Minimum payout for this influencer (₦)</label>
          <input id="i-min" type="text" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Leave blank to use the default" />
          {minCheck.error ? <small style={{ color: 'var(--danger)', fontSize: 11 }}>{minCheck.error}</small>
            : <small style={{ color: 'var(--muted)', fontSize: 11 }}>Commission is paid once what's due reaches this amount.</small>}
        </div>
        <div className="form-group"><label htmlFor="i-notes">Notes</label><textarea id="i-notes" rows={2} value={f.notes} onChange={set('notes')} /></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, margin: '4px 0 14px' }}>
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active
        </label>
        <button className="btn-primary btn-inline" disabled={save.isPending || !f.name.trim() || !!minCheck.error} onClick={() => void submit()}>Save</button>
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
  const [belowReason, setBelowReason] = useState('');
  const i = data?.influencer;
  const state = i ? payoutState({ payable: i.payable, overpaid: i.overpaid, minPayout: i.minPayout }) : null;

  async function recordPayout() {
    if (!i || !state || !reference.trim() || !sent) return;
    if (state.reasonNeeded && belowReason.trim().length < 5) return;
    if (await pay.mutateAsync({ id: i.id, reference: reference.trim(), belowMinimumReason: state.reasonNeeded ? belowReason.trim() : undefined })) {
      setReference(''); setSent(false); setBelowReason('');
    }
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
              {i.overpaid > 0 && (
                <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Overpaid earlier (taken off)</span><strong style={{ color: 'var(--danger)' }}>−{formatPrice(i.overpaid)}</strong></p>
              )}
              <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                <span>Minimum payout{i.ownMinPayout == null ? ' (default)' : ' (this influencer)'}</span><span>{formatPrice(i.minPayout)}</span>
              </p>
              {state && <p style={{ fontSize: 12, color: state.reasonNeeded || !state.canPay ? 'var(--text-secondary)' : 'var(--primary)' }}>{state.message}</p>}
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                {i.bankAccountNumber ? `${i.bankName ?? ''} · ${i.bankAccountName ?? ''} · ${i.bankAccountNumber}` : 'No bank details on file - edit the influencer first.'}
              </p>
              {i.bankAccountNumber && state?.canPay && (
                <div style={{ marginBottom: 10 }}>
                  <RevealNumberButton defaultReason={`Paying commission to ${i.name}`} reveal={(reason) => revealInfluencerBank(i.id, reason)} />
                </div>
              )}
              {state?.canPay && (
                <>
                  {state.reasonNeeded && (
                    <div className="form-group">
                      <label htmlFor="ip-below">Reason to pay below the minimum</label>
                      <input id="ip-below" type="text" maxLength={500} value={belowReason} onChange={(e) => setBelowReason(e.target.value)}
                        placeholder="e.g. influencer is leaving the programme" />
                      <small style={{ color: 'var(--muted)', fontSize: 11 }}>Recorded in the audit log. Leave the payout for later to wait for the minimum.</small>
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="ip-ref">Flutterwave transfer reference</label>
                    <input id="ip-ref" type="text" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
                  </div>
                  <label style={{ display: 'flex', gap: 8, fontSize: 13, margin: '4px 0 12px' }}>
                    <input type="checkbox" checked={sent} onChange={(e) => setSent(e.target.checked)} /> I have sent {formatPrice(state.amount)} to {i.name}.
                  </label>
                  <button className="btn-primary btn-inline"
                    disabled={!reference.trim() || !sent || pay.isPending || (state.reasonNeeded && belowReason.trim().length < 5)}
                    onClick={() => void recordPayout()}>Record payout</button>
                </>
              )}
            </div>
            <div className="admin-drawer-section">
              <h4>Orders with their code ({data.commissions.length})</h4>
              {data.commissions.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>None yet.</p>}
              {data.commissions.map((c) => (
                <div key={c.redemptionId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span><span style={{ fontFamily: 'monospace' }}>{c.invoiceNumber}</span><br /><span style={{ color: 'var(--muted)' }}>{COMMISSION_LABELS[c.status]} · {formatDate(c.createdAt)}</span></span>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {formatPrice(c.commission)}
                    {c.payoutId == null && c.originalCommission != null && c.originalCommission > c.commission && (
                      <><br /><span style={{ fontWeight: 400, color: 'var(--muted)' }}>was {formatPrice(c.originalCommission)} before refunds</span></>
                    )}
                    {(c.overpaid ?? 0) > 0 && (
                      <><br /><span style={{ fontWeight: 400, color: 'var(--danger)' }}>overpaid {formatPrice(c.overpaid ?? 0)} after a refund</span></>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="admin-drawer-section">
              <h4>Payouts</h4>
              {data.payouts.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>No payouts recorded.</p>}
              {data.payouts.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 0' }}>
                  <span>
                    {formatDate(p.releasedAt)} · <span style={{ fontFamily: 'monospace' }}>{p.transferReference}</span>{p.status === 'VOIDED' && <span className="chip chip-danger" style={{ marginLeft: 6 }}>Voided</span>}
                    {p.recoveredAmount > 0 && <><br /><span style={{ color: 'var(--muted)' }}>{formatPrice(p.grossAmount)} commission − {formatPrice(p.recoveredAmount)} overpaid earlier</span></>}
                    {p.belowMinimumReason && <><br /><span style={{ color: 'var(--muted)' }}>Below minimum: {p.belowMinimumReason}</span></>}
                  </span>
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
          message="Only if it was recorded by mistake. It does not reverse the bank transfer; the commission becomes payable again, and any overpayment it took back counts again."
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

/** The default minimum payout for every influencer (founder decision: N15,000). */
function MinimumPayoutSetting() {
  const { data } = useInfluencerSettings();
  const save = useSaveInfluencerSettings();
  const [value, setValue] = useState<string | null>(null);
  const shown = value ?? (data ? String(data.minPayout) : '');
  const check = parseMinPayout(shown);
  const changed = data != null && value != null && check.value !== data.minPayout;
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, background: 'var(--bg)', maxWidth: 560 }}>
      <label htmlFor="inf-min" style={{ fontSize: 13, fontWeight: 700 }}>Minimum payout (default for every influencer)</label>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 8px' }}>
        Commission builds up and is paid once what's due reaches this amount. Refunds before then reduce it; anything overpaid
        earlier is taken off the next payout. You can set a different minimum on an influencer.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>₦</span>
        <input id="inf-min" type="text" inputMode="decimal" value={shown} onChange={(e) => setValue(e.target.value)} style={{ maxWidth: 160 }} />
        <button className="btn-primary btn-sm btn-inline" disabled={!changed || !!check.error || check.value == null || save.isPending}
          onClick={() => { if (check.value != null) void save.mutateAsync(check.value).then((ok) => { if (ok) setValue(null); }); }}>Save</button>
      </div>
      {check.error && <small style={{ color: 'var(--danger)', fontSize: 11 }}>{check.error}</small>}
    </div>
  );
}
