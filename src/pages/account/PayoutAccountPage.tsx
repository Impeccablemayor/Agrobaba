import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDate } from '../../lib/format';
import { useBanks, useConfirmLegacyBankAccount, useMyPayoutAccount, useSaveBankAccount } from '../../hooks/queries/useBankAccounts';
import {
  BANK_EVENT_LABELS, BANK_STATUS_CHIP, BANK_STATUS_LABELS, cleanAccountNumber, inCoolingOff, resolveBankAccount,
  type BankAccountView, type ResolveResult,
} from '../../lib/bankAccounts';

const SUPPLIER_ROLES = ['farmer', 'agro-dealer', 'service-provider'];

const dateTime = (s?: string | null) => (s ? new Date(s).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

/** Where AgroBaba sends a seller's money (Batch 4). The bank confirms whose account it is; a new or
 *  changed account waits out a safety period before any payout goes to it. */
export default function PayoutAccountPage() {
  const { user } = useAuth();
  const isSupplier = !!user && SUPPLIER_ROLES.includes(user.role);
  const { data, isLoading, isError } = useMyPayoutAccount(isSupplier);
  const [changing, setChanging] = useState(false);

  if (!isSupplier) {
    return <Shell><div className="empty-cart"><i className="fa-solid fa-building-columns"></i><p>Payout accounts are for sellers and service providers.</p></div></Shell>;
  }
  if (isLoading) return <Shell><PageLoadingSpinner message="Loading your payout account…" /></Shell>;
  if (isError || !data) return <Shell><div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load your payout account.</p></div></Shell>;

  const r = data.readiness;
  const current = r.account;
  const lastRejected = !current && data.history[0]?.status === 'REJECTED' ? data.history[0] : null;
  const showForm = !current || changing;

  return (
    <Shell>
      <ReadinessCard ready={r.ready} identityVerified={r.identityVerified} account={current} />

      {current && (
        <div className="admin-drawer-section" style={{ margin: '0 0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Your payout account</h4>
            <span className={`chip ${BANK_STATUS_CHIP[current.status]}`}>{BANK_STATUS_LABELS[current.status]}</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, margin: '10px 0 2px' }}>{current.bankName} · <span style={{ fontFamily: 'monospace' }}>{current.maskedNumber}</span></p>
          {current.accountName && <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Name at the bank: {current.accountName}</p>}
          {current.status === 'PENDING_REVIEW' && (
            <p style={{ fontSize: 13, marginTop: 8 }}>Our team is checking this account (usually within one working day). We&apos;ll notify you.</p>
          )}
          {!changing && current.status !== 'NEEDS_CONFIRMATION' && (
            <button className="btn-outline btn-sm btn-inline" style={{ marginTop: 12 }} onClick={() => setChanging(true)}>Change account</button>
          )}
        </div>
      )}

      {current?.status === 'NEEDS_CONFIRMATION' && <ConfirmLegacy account={current} />}
      {lastRejected && (
        <p className="chip chip-danger" style={{ display: 'block', whiteSpace: 'normal', marginBottom: 12 }}>
          Your last account ({lastRejected.bankName} {lastRejected.maskedNumber}) was not accepted{lastRejected.reviewNote ? `: ${lastRejected.reviewNote}` : '.'}
        </p>
      )}

      {showForm && current?.status !== 'NEEDS_CONFIRMATION' && (
        <AccountForm hours={data.coolingOffHours} isChange={!!current} onDone={() => setChanging(false)}
          onCancel={changing ? () => setChanging(false) : undefined} />
      )}

      {data.history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>History</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {data.events.map((e) => (
              <li key={e.id} style={{ fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <strong>{BANK_EVENT_LABELS[e.event] ?? e.event}</strong> · <span style={{ color: 'var(--muted)' }}>{dateTime(e.createdAt)} · {e.actor}</span>
                {e.details && <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{e.details}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <Link to="/account" style={{ fontSize: 13 }}><i className="fa-solid fa-arrow-left"></i> My account</Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 4px' }}>Payout account</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
          The bank account AgroBaba pays your sales into. It must be in your name or your business&apos;s name.
        </p>
        {children}
      </div>
    </div>
  );
}

function ReadinessCard({ ready, identityVerified, account }: { ready: boolean; identityVerified: boolean; account: BankAccountView | null }) {
  const steps: { done: boolean; label: React.ReactNode }[] = [
    { done: identityVerified, label: identityVerified ? 'Your ID is verified' : <>Verify your ID — <Link to="/account/verify">Verify account</Link></> },
    { done: account?.status === 'VERIFIED', label: account?.status === 'VERIFIED' ? 'Your bank account is confirmed' : 'Add a bank account in your name' },
  ];
  if (account?.status === 'VERIFIED' && inCoolingOff(account)) {
    steps.push({ done: false, label: <>Safety wait: payouts start after <strong>{dateTime(account.coolingOffUntil)}</strong></> });
  }
  return (
    <div style={{ background: ready ? 'var(--primary-light)' : 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
      <p style={{ fontWeight: 800, margin: '0 0 8px' }}>
        {ready ? <><i className="fa-solid fa-circle-check" style={{ color: 'var(--primary)' }}></i> You can receive payouts</>
          : <><i className="fa-regular fa-clock" style={{ color: 'var(--accent)' }}></i> Before AgroBaba can pay you</>}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4, fontSize: 13 }}>
        {steps.map((s, i) => (
          <li key={i}><i className={`fa-solid ${s.done ? 'fa-check' : 'fa-circle-dot'}`} style={{ color: s.done ? 'var(--primary)' : 'var(--muted)', width: 18 }}></i>{s.label}</li>
        ))}
      </ul>
    </div>
  );
}

function BankSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const { data, isLoading } = useBanks();
  return (
    <div className="form-group">
      <label htmlFor={id}>Bank</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={isLoading}>
        <option value="">{isLoading ? 'Loading banks…' : 'Choose your bank'}</option>
        {data?.banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
      </select>
      {data && !data.available && <small style={{ color: 'var(--danger)' }}>We can&apos;t load the bank list right now. Please try again later.</small>}
    </div>
  );
}

function AccountForm({ hours, isChange, onDone, onCancel }: { hours: number; isChange: boolean; onDone: () => void; onCancel?: () => void }) {
  const [bankCode, setBankCode] = useState('');
  const [number, setNumber] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const save = useSaveBankAccount();
  const valid = bankCode !== '' && number.length === 10;

  async function check(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setChecking(true);
    const r = await resolveBankAccount(bankCode, number);
    setChecking(false);
    setResult(r || null);
  }

  async function confirmSave() {
    setConfirmOpen(false);
    const r = await save.mutateAsync({ bankCode, accountNumber: number });
    if (r) { setResult(null); setNumber(''); setBankCode(''); onDone(); }
  }

  const canSave = result && (result.found || !result.lookupAvailable);
  return (
    <form onSubmit={check} className="admin-drawer-section" style={{ margin: 0 }}>
      <h4>{isChange ? 'Change payout account' : 'Add your payout account'}</h4>
      <BankSelect id="pa-bank" value={bankCode} onChange={(v) => { setBankCode(v); setResult(null); }} />
      <div className="form-group">
        <label htmlFor="pa-number">Account number (10 digits)</label>
        <input id="pa-number" inputMode="numeric" autoComplete="off" value={number}
          onChange={(e) => { setNumber(cleanAccountNumber(e.target.value)); setResult(null); }} />
      </div>
      {!result && (
        <button type="submit" className="btn-primary btn-inline" disabled={!valid || checking} style={{ width: '100%', justifyContent: 'center' }}>
          {checking ? 'Checking with your bank…' : 'Check account'}
        </button>
      )}
      {result && (
        <div role="status" style={{ marginTop: 4 }}>
          {result.found && <p style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>{result.accountName}</p>}
          <p style={{ fontSize: 13, color: result.found && result.matchesYou ? 'var(--primary)' : 'var(--danger)', margin: '0 0 12px' }}>{result.message}</p>
          {canSave && (
            <button type="button" className="btn-primary btn-inline" style={{ width: '100%', justifyContent: 'center' }} disabled={save.isPending}
              onClick={() => setConfirmOpen(true)}>
              {save.isPending ? 'Saving…' : 'Save payout account'}
            </button>
          )}
        </div>
      )}
      {onCancel && <button type="button" className="btn-outline btn-sm btn-inline" style={{ marginTop: 10 }} onClick={onCancel}>Cancel</button>}
      <ConfirmDialog
        open={confirmOpen}
        title={isChange ? 'Change your payout account?' : 'Save this payout account?'}
        message={`For your safety, AgroBaba will not send any payout for ${hours} hours after this. We'll email you about the change.`}
        confirmLabel="Save"
        onConfirm={() => void confirmSave()}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  );
}

function ConfirmLegacy({ account }: { account: BankAccountView }) {
  const [bankCode, setBankCode] = useState('');
  const confirm = useConfirmLegacyBankAccount();
  return (
    <div className="admin-drawer-section" style={{ margin: '0 0 16px' }}>
      <h4>Please confirm your bank</h4>
      <p style={{ fontSize: 13 }}>
        You gave us account {account.maskedNumber} ({account.bankName}) on your verification form on {formatDate(account.createdAt)}.
        Choose the bank so we can check it. No waiting period applies.
      </p>
      <BankSelect id="pa-legacy-bank" value={bankCode} onChange={setBankCode} />
      <button className="btn-primary btn-inline" style={{ width: '100%', justifyContent: 'center' }} disabled={!bankCode || confirm.isPending}
        onClick={() => void confirm.mutateAsync({ id: account.id, bankCode })}>
        {confirm.isPending ? 'Checking…' : 'Check with my bank'}
      </button>
    </div>
  );
}
