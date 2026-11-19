import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLoadingSpinner } from './LoadingSpinner';
import { useBankAccountDecision, useBankReviewQueue, useRecheckLegacyBankAccounts, useSellerBankAccounts } from '../hooks/queries/useBankAccounts';
import { BANK_EVENT_LABELS, BANK_STATUS_CHIP, BANK_STATUS_LABELS, type RevealResult } from '../lib/bankAccounts';
import { formatDate } from '../lib/format';
import { showToast } from '../lib/toastBus';

/** Admin pieces for payout bank accounts (Batch 4). */

const dateTime = (s?: string | null) => (s ? new Date(s).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

/** "Show full number": asks why, records the view on the server, shows the number until closed. */
export function RevealNumberButton({ reveal, label = 'Show full number', defaultReason = '' }: {
  reveal: (reason: string) => Promise<RevealResult | false>;
  label?: string;
  defaultReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(defaultReason);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<RevealResult | null>(null);

  async function go() {
    setBusy(true);
    const r = await reveal(reason.trim());
    setBusy(false);
    if (r) { setShown(r); setOpen(false); }
  }

  if (shown) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>{shown.accountNumber}</span>
        <button type="button" className="btn-outline btn-sm btn-inline" onClick={() => {
          void navigator.clipboard?.writeText(shown.accountNumber).then(() => showToast('Copied.', 'success'), () => undefined);
        }}>Copy</button>
        <button type="button" className="btn-outline btn-sm btn-inline" onClick={() => setShown(null)}>Hide</button>
      </div>
    );
  }
  if (!open) {
    return <button type="button" className="btn-outline btn-sm btn-inline" onClick={() => setOpen(true)}><i className="fa-solid fa-eye"></i> {label}</button>;
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label htmlFor="reveal-reason" style={{ fontSize: 12 }}>Why do you need the full number? (recorded)</label>
      <input id="reveal-reason" type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Sending payout for AGR-1234" />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-primary btn-sm btn-inline" disabled={reason.trim().length < 5 || busy} onClick={() => void go()}>{busy ? '…' : 'Show'}</button>
        <button type="button" className="btn-outline btn-sm btn-inline" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

/** Review queue: accounts the bank couldn't confirm automatically, and old typed-in entries. */
export function BankReviewPanel() {
  const { data = [], isLoading, isError } = useBankReviewQueue();
  const decide = useBankAccountDecision();
  const recheckLegacy = useRecheckLegacyBankAccounts();
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [note, setNote] = useState('');

  if (isLoading) return <PageLoadingSpinner message="Loading bank accounts…" />;
  if (isError) return <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load bank accounts.</p></div>;
  const legacyCount = data.filter((i) => i.account.status === 'NEEDS_CONFIRMATION').length;

  return (
    <>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>
        Payout accounts the bank could not confirm automatically (name doesn&apos;t match, number used by another seller, bank lookup
        down) and bank numbers typed in before bank checks existed. Nobody is paid into these until they are confirmed.
      </p>
      {legacyCount > 0 && (
        <button className="btn-outline btn-sm btn-inline" style={{ marginBottom: 12 }} disabled={recheckLegacy.isPending}
          onClick={() => void recheckLegacy.mutateAsync().then((r) => {
            if (r) showToast(`Checked ${r.checked}: ${r.verified} confirmed, ${r.sentForReview} need review${r.unavailable ? `, ${r.unavailable} lookup unavailable` : ''}.`, 'success');
          })}>
          <i className="fa-solid fa-rotate"></i> {recheckLegacy.isPending ? 'Checking…' : `Check ${legacyCount} old entr${legacyCount === 1 ? 'y' : 'ies'} with the bank`}
        </button>
      )}
      {data.length === 0 ? <div className="empty-cart"><i className="fa-solid fa-circle-check"></i><p>No bank accounts waiting.</p></div> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {data.map((i) => (
            <div key={i.account.id} className="admin-drawer-section" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <Link to={`/admin/users/${i.sellerId}`} style={{ fontWeight: 800 }}>{i.sellerName ?? `Seller #${i.sellerId}`}</Link>
                  {i.businessName && <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {i.businessName}</span>}
                  {!i.identityVerified && <span className="chip chip-pending" style={{ marginLeft: 6 }}>ID not verified</span>}
                </div>
                <span className={`chip ${BANK_STATUS_CHIP[i.account.status]}`}>{BANK_STATUS_LABELS[i.account.status]}</span>
              </div>
              <p style={{ margin: '8px 0 2px', fontSize: 14 }}>{i.account.bankName} · <span style={{ fontFamily: 'monospace' }}>{i.account.maskedNumber}</span></p>
              <p style={{ margin: 0, fontSize: 13 }}>Name at the bank: <strong>{i.account.accountName ?? 'not checked yet'}</strong></p>
              {i.account.reviewReason && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--danger)' }}>{i.account.reviewReason}</p>}
              {i.sameNumberSellerIds.length > 0 && (
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Same number on: {i.sameNumberSellerIds.map((id) => <Link key={id} to={`/admin/users/${id}`} style={{ marginRight: 6 }}>#{id}</Link>)}</p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button className="btn-outline btn-sm btn-inline" disabled={decide.isPending} onClick={() => void decide.mutateAsync({ id: i.account.id, action: 'recheck' })}>Check with bank</button>
                {i.account.status === 'PENDING_REVIEW' && (
                  <button className="btn-primary btn-sm btn-inline" disabled={decide.isPending} onClick={() => void decide.mutateAsync({ id: i.account.id, action: 'approve' })}>Approve</button>
                )}
                <button className="btn-outline btn-sm btn-inline" style={{ color: 'var(--danger)' }} onClick={() => { setRejecting(i.account.id); setNote(''); }}>Reject</button>
              </div>
              {rejecting === i.account.id && (
                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                  <label htmlFor={`rej-${i.account.id}`} style={{ fontSize: 12 }}>Reason (sent to the seller)</label>
                  <input id={`rej-${i.account.id}`} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary btn-sm btn-inline" disabled={!note.trim() || decide.isPending}
                      onClick={() => void decide.mutateAsync({ id: i.account.id, action: 'reject', note: note.trim() }).then((r) => { if (r) setRejecting(null); })}>Reject account</button>
                    <button className="btn-outline btn-sm btn-inline" onClick={() => setRejecting(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** One seller's payout readiness, accounts and full history (admin user page). */
export function SellerPayoutAccountPanel({ sellerId, reveal }: { sellerId: number; reveal: (accountId: number, reason: string) => Promise<RevealResult | false> }) {
  const { data, isLoading, isError } = useSellerBankAccounts(sellerId);
  if (isLoading) return <PageLoadingSpinner message="Loading payout account…" />;
  if (isError || !data) return <p style={{ fontSize: 13, color: 'var(--muted)' }}>Unable to load the payout account.</p>;
  const r = data.readiness;
  return (
    <div>
      <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
        {r.ready ? <span className="chip chip-success">Can be paid</span> : <span className="chip chip-pending">Can&apos;t be paid yet</span>}
      </p>
      {!r.ready && <ul style={{ fontSize: 13, margin: '0 0 10px', paddingLeft: 18 }}>{r.blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
      {data.history.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>No payout account added.</p> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {data.history.map((a) => (
            <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span>{a.bankName} · <span style={{ fontFamily: 'monospace' }}>{a.maskedNumber}</span></span>
                <span className={`chip ${BANK_STATUS_CHIP[a.status]}`}>{BANK_STATUS_LABELS[a.status]}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {a.accountName ? `Name at bank: ${a.accountName} · ` : ''}added {formatDate(a.createdAt)}
                {a.verificationMethod ? ` · confirmed by ${a.verificationMethod === 'FLUTTERWAVE' ? 'the bank' : 'an admin'}` : ''}
                {a.coolingOffUntil ? ` · payouts from ${dateTime(a.coolingOffUntil)}` : ''}
              </div>
              {a.status !== 'REPLACED' && a.status !== 'REJECTED' && (
                <div style={{ marginTop: 8 }}><RevealNumberButton reveal={(reason) => reveal(a.id, reason)} /></div>
              )}
            </div>
          ))}
        </div>
      )}
      {data.events.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13 }}>History ({data.events.length})</summary>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 6 }}>
            {data.events.map((e) => (
              <li key={e.id} style={{ fontSize: 12 }}>
                <strong>{BANK_EVENT_LABELS[e.event] ?? e.event}</strong> · {dateTime(e.createdAt)} · {e.actor}{e.details ? ` — ${e.details}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
