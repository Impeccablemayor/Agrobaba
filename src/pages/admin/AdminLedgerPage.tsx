import { useState, type FormEvent } from 'react';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDate, formatPrice } from '../../lib/format';
import {
  useBackfillLedger, useLedgerAccounts, useLedgerSummary, useLedgerTransactions, useOrderReconciliation, useSyncOrderLedger,
} from '../../hooks/queries/useLedger';
import {
  ACCOUNT_TYPE_LABELS, TXN_TYPE_LABELS, type LedgerAccountBalance, type LedgerTransactionView, type TransactionFilters,
} from '../../lib/ledger';

type Tab = 'balances' | 'transactions' | 'reports' | 'order';

/** Batch 3: the double-entry ledger. Every naira that enters, leaves or becomes payable is a balanced
 *  transaction here; entries are never edited or deleted (corrections are reversals). */
export default function AdminLedgerPage() {
  const [tab, setTab] = useState<Tab>('balances');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [confirmBackfill, setConfirmBackfill] = useState(false);
  const backfill = useBackfillLedger();
  const openOrder = (id: number) => { setOrderId(id); setTab('order'); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Ledger</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 640 }}>
            Every payment, settlement, refund and payout as balanced debit/credit entries. Nothing here is ever
            edited or deleted; mistakes are corrected with reversing entries.
          </p>
        </div>
        <button className="btn-outline btn-inline" disabled={backfill.isPending} onClick={() => setConfirmBackfill(true)}>
          <i className="fa-solid fa-rotate"></i> {backfill.isPending ? 'Checking…' : 'Bring ledger up to date'}
        </button>
      </div>

      <div className="status-tabs">
        <button className={`status-tab ${tab === 'balances' ? 'active' : ''}`} onClick={() => setTab('balances')}>Balances</button>
        <button className={`status-tab ${tab === 'transactions' ? 'active' : ''}`} onClick={() => setTab('transactions')}>Transactions</button>
        <button className={`status-tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Reports</button>
        <button className={`status-tab ${tab === 'order' ? 'active' : ''}`} onClick={() => setTab('order')}>Order check</button>
      </div>

      {tab === 'balances' && <BalancesPanel />}
      {tab === 'transactions' && <TransactionsPanel onOpenOrder={openOrder} />}
      {tab === 'reports' && <ReportsPanel />}
      {tab === 'order' && <OrderPanel orderId={orderId} setOrderId={setOrderId} />}

      {backfill.data && backfill.data.errors.length > 0 && (
        <div className="admin-drawer-section" style={{ marginTop: 16 }}>
          <h4>Orders that need attention</h4>
          <ul style={{ fontSize: 13, paddingLeft: 18 }}>{backfill.data.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <ConfirmDialog
        open={confirmBackfill}
        title="Bring the ledger up to date?"
        message="Posts anything missing for every paid order (for example, orders paid before the ledger existed). Safe to run more than once: nothing is ever posted twice."
        confirmLabel="Run"
        onConfirm={() => { setConfirmBackfill(false); void backfill.mutateAsync(); }}
        onCancel={() => setConfirmBackfill(false)}
      />
    </div>
  );
}

function BalancesPanel() {
  const { data = [], isLoading, isError } = useLedgerAccounts();
  if (isLoading) return <PageLoadingSpinner message="Loading balances…" />;
  if (isError) return <ErrorState text="Unable to load ledger balances." />;
  const platform = data.filter((a) => a.ownerType === 'PLATFORM');
  const sellers = groupOwned(data.filter((a) => a.ownerType === 'SELLER'));
  const influencers = data.filter((a) => a.ownerType === 'INFLUENCER' && a.balance !== 0);
  const total = (code: string) => data.filter((a) => a.code === code).reduce((s, a) => s + a.balance, 0);

  return (
    <>
      <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Stat value={total('FLUTTERWAVE_BALANCE')} label="In AgroBaba's Flutterwave balance" />
        <Stat value={total('PAYMENT_CLEARING')} label="Verified, not yet settled" />
        <Stat value={total('SELLER_PAYABLE_HELD') + total('SELLER_PAYABLE_DISPUTED')} label="Owed to sellers - held" />
        <Stat value={total('SELLER_PAYABLE_AVAILABLE')} label="Owed to sellers - available" />
        <Stat value={total('PLATFORM_COMMISSION')} label="Commission earned" />
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 800, margin: '4px 0 8px' }}>AgroBaba accounts</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Account</th><th>Kind</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
          <tbody>
            {platform.map((a) => (
              <tr key={a.id}>
                <td><div style={{ fontWeight: 700 }}>{a.name}</div><div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{a.code}</div></td>
                <td>{ACCOUNT_TYPE_LABELS[a.accountType]}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: a.balance < 0 ? 'var(--danger)' : undefined }}>{formatPrice(a.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 800, margin: '20px 0 8px' }}>Sellers</h3>
      {sellers.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No seller balances yet.</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Seller</th><th>Held</th><th>Under refund</th><th>Available</th><th>To recover</th></tr></thead>
            <tbody>
              {sellers.map((s) => (
                <tr key={s.ownerId}>
                  <td style={{ fontWeight: 700 }}>{s.name ?? `Seller #${s.ownerId}`}</td>
                  <td>{formatPrice(s.SELLER_PAYABLE_HELD)}</td>
                  <td>{formatPrice(s.SELLER_PAYABLE_DISPUTED)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(s.SELLER_PAYABLE_AVAILABLE)}</td>
                  <td style={{ color: s.SELLER_RECOVERY_RECEIVABLE > 0 ? 'var(--danger)' : undefined }}>{formatPrice(s.SELLER_RECOVERY_RECEIVABLE)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {influencers.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: '20px 0 8px' }}>Influencer commission owed</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Influencer</th><th style={{ textAlign: 'right' }}>Owed</th></tr></thead>
              <tbody>{influencers.map((a) => <tr key={a.id}><td>{a.ownerName ?? `#${a.ownerId}`}</td><td style={{ textAlign: 'right' }}>{formatPrice(a.balance)}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

type SellerCode = 'SELLER_PAYABLE_HELD' | 'SELLER_PAYABLE_DISPUTED' | 'SELLER_PAYABLE_AVAILABLE' | 'SELLER_RECOVERY_RECEIVABLE';
type SellerRow = { ownerId: number; name: string | null } & Record<SellerCode, number>;
const SELLER_CODES: SellerCode[] = ['SELLER_PAYABLE_HELD', 'SELLER_PAYABLE_DISPUTED', 'SELLER_PAYABLE_AVAILABLE', 'SELLER_RECOVERY_RECEIVABLE'];

function groupOwned(accounts: LedgerAccountBalance[]): SellerRow[] {
  const rows = new Map<number, SellerRow>();
  for (const a of accounts) {
    const id = a.ownerId ?? 0;
    const row: SellerRow = rows.get(id) ?? { ownerId: id, name: a.ownerName, SELLER_PAYABLE_HELD: 0, SELLER_PAYABLE_DISPUTED: 0,
      SELLER_PAYABLE_AVAILABLE: 0, SELLER_RECOVERY_RECEIVABLE: 0 };
    const code = a.code as SellerCode;
    if (SELLER_CODES.includes(code)) row[code] += a.balance;
    rows.set(id, row);
  }
  return [...rows.values()].filter((r) => SELLER_CODES.some((c) => r[c] !== 0));
}

function TransactionsPanel({ onOpenOrder }: { onOpenOrder: (id: number) => void }) {
  const [draft, setDraft] = useState<TransactionFilters>({});
  const [filters, setFilters] = useState<TransactionFilters>({ page: 0 });
  const { data, isLoading, isError } = useLedgerTransactions(filters);
  const set = (k: keyof TransactionFilters) => (e: { target: { value: string } }) => setDraft({ ...draft, [k]: e.target.value });
  const apply = (e: FormEvent) => { e.preventDefault(); setFilters({ ...draft, page: 0 }); };

  return (
    <>
      <form onSubmit={apply} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12, alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}><label htmlFor="l-order">Order ID</label><input id="l-order" inputMode="numeric" value={draft.orderId ?? ''} onChange={set('orderId')} /></div>
        <div className="form-group" style={{ margin: 0 }}><label htmlFor="l-seller">Seller ID</label><input id="l-seller" inputMode="numeric" value={draft.sellerId ?? ''} onChange={set('sellerId')} /></div>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="l-type">Type</label>
          <select id="l-type" value={draft.type ?? ''} onChange={set('type')}>
            <option value="">All types</option>
            {Object.entries(TXN_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}><label htmlFor="l-from">From</label><input id="l-from" type="date" value={draft.from ?? ''} onChange={set('from')} /></div>
        <div className="form-group" style={{ margin: 0 }}><label htmlFor="l-to">To</label><input id="l-to" type="date" value={draft.to ?? ''} onChange={set('to')} /></div>
        <button type="submit" className="btn-primary btn-inline" style={{ justifyContent: 'center' }}>Filter</button>
      </form>

      {isLoading ? <PageLoadingSpinner message="Loading transactions…" />
        : isError ? <ErrorState text="Unable to load transactions." />
        : !data || data.content.length === 0 ? <div className="empty-cart"><i className="fa-solid fa-book"></i><p>No ledger transactions match.</p></div>
        : (
          <>
            <div style={{ display: 'grid', gap: 10 }}>
              {data.content.map((t) => <TransactionCard key={t.id} t={t} onOpenOrder={onOpenOrder} />)}
            </div>
            {data.totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, alignItems: 'center' }}>
                <button className="btn-outline btn-sm btn-inline" disabled={data.number === 0} onClick={() => setFilters({ ...filters, page: data.number - 1 })}>Previous</button>
                <span style={{ fontSize: 13 }}>Page {data.number + 1} of {data.totalPages}</span>
                <button className="btn-outline btn-sm btn-inline" disabled={data.number + 1 >= data.totalPages} onClick={() => setFilters({ ...filters, page: data.number + 1 })}>Next</button>
              </div>
            )}
          </>
        )}
    </>
  );
}

function TransactionCard({ t, onOpenOrder }: { t: LedgerTransactionView; onOpenOrder?: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-drawer-section" style={{ margin: 0 }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', flexWrap: 'wrap' }}>
        <span>
          <span className={`chip ${t.type.includes('REVERSAL') ? 'chip-danger' : 'chip-info'}`}>{TXN_TYPE_LABELS[t.type] ?? t.type}</span>
          {!t.balanced && <span className="chip chip-danger" style={{ marginLeft: 6 }}>Unbalanced</span>}
          <span style={{ fontSize: 13, marginLeft: 8 }}>{t.description}</span>
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {formatDate(t.occurredAt)} · <strong style={{ color: 'var(--text)' }}>{formatPrice(t.amount)}</strong> <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`}></i>
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {t.reference} · by {t.createdBy}
            {t.orderId != null && onOpenOrder && (
              <> · <button type="button" onClick={() => onOpenOrder(t.orderId!)} style={{ fontSize: 11, background: 'none', border: 0, padding: 0, color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer' }}>{t.invoiceNumber ?? `order #${t.orderId}`}</button></>
            )}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Account</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
              <tbody>
                {t.entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.accountName}{e.ownerId != null && <span style={{ color: 'var(--muted)' }}> · {e.ownerType.toLowerCase()} #{e.ownerId}</span>}</td>
                    <td style={{ textAlign: 'right' }}>{e.direction === 'D' ? formatPrice(e.amount) : ''}</td>
                    <td style={{ textAlign: 'right' }}>{e.direction === 'C' ? formatPrice(e.amount) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPanel() {
  const monthStart = new Date(); monthStart.setDate(1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [from, setFrom] = useState(iso(monthStart));
  const [to, setTo] = useState(iso(new Date()));
  const { data, isLoading, isError } = useLedgerSummary(from, to);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="form-group" style={{ margin: 0 }}><label htmlFor="r-from">From</label><input id="r-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="form-group" style={{ margin: 0 }}><label htmlFor="r-to">To</label><input id="r-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {isLoading ? <PageLoadingSpinner message="Building report…" />
        : isError || !data ? <ErrorState text="Unable to build the report." />
        : (
          <>
            {data.unbalancedTransactions > 0 && <p className="chip chip-danger">{data.unbalancedTransactions} unbalanced transaction(s) - contact the lead developer.</p>}
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '4px 0 8px' }}>By transaction type</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Type</th><th>Count</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {data.byType.length === 0 ? <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>Nothing in this period.</td></tr>
                    : data.byType.map((r) => <tr key={r.type}><td>{TXN_TYPE_LABELS[r.type] ?? r.type}</td><td>{r.transactions}</td><td style={{ textAlign: 'right' }}>{formatPrice(r.amount)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '20px 0 8px' }}>Movement by account</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Account</th><th style={{ textAlign: 'right' }}>Debits</th><th style={{ textAlign: 'right' }}>Credits</th></tr></thead>
                <tbody>
                  {data.byAccount.map((r) => <tr key={r.code}><td>{r.name}</td><td style={{ textAlign: 'right' }}>{formatPrice(r.debits)}</td><td style={{ textAlign: 'right' }}>{formatPrice(r.credits)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </>
        )}
    </>
  );
}

function OrderPanel({ orderId, setOrderId }: { orderId: number | null; setOrderId: (id: number | null) => void }) {
  const [input, setInput] = useState(orderId != null ? String(orderId) : '');
  const { data, isLoading, isError, error } = useOrderReconciliation(orderId);
  const sync = useSyncOrderLedger();
  const submit = (e: FormEvent) => { e.preventDefault(); const n = Number(input.trim()); setOrderId(Number.isInteger(n) && n > 0 ? n : null); };

  return (
    <>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}><label htmlFor="o-id">Order ID</label><input id="o-id" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value)} /></div>
        <button type="submit" className="btn-primary btn-inline">Check</button>
      </form>
      {orderId == null ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Enter an order ID to check that its payment, sellers&apos; shares and fees add up.</p>
        : isLoading ? <PageLoadingSpinner message="Checking order…" />
        : isError || !data ? <ErrorState text={error instanceof Error ? error.message : 'Unable to check this order.'} />
        : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong>{data.invoiceNumber}</strong>{' '}
                <span className={`chip ${data.reconciled ? 'chip-success' : 'chip-danger'}`}>{data.reconciled ? 'Reconciled' : 'Needs attention'}</span>
                {data.requiresReview && <span className="chip chip-danger" style={{ marginLeft: 6 }}>Payment flagged</span>}
              </div>
              <button className="btn-outline btn-sm btn-inline" disabled={sync.isPending} onClick={() => void sync.mutateAsync(data.orderId)}>
                {sync.isPending ? 'Syncing…' : 'Sync this order'}
              </button>
            </div>
            <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              <Stat value={data.paymentAmount ?? 0} label={`Paid (${data.paymentStatus ? data.paymentStatus.toLowerCase().replace(/_/g, ' ') : 'no payment'})`} />
              <Stat value={data.refunded} label="Refunded" />
              <Stat value={data.gatewayFee} label="Flutterwave fee" />
              <Stat value={data.unallocated} label="Unallocated" />
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'grid', gap: 6 }}>
              {data.checks.map((c) => (
                <li key={c.name} style={{ fontSize: 13 }}>
                  <i className={`fa-solid ${c.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`} style={{ color: c.ok ? 'var(--primary)' : 'var(--danger)', marginRight: 6 }}></i>
                  <strong>{c.name}</strong> - <span style={{ color: 'var(--muted)' }}>{c.detail}</span>
                </li>
              ))}
            </ul>
            {data.sellers.length > 0 && (
              <div className="admin-table-wrap" style={{ marginBottom: 16 }}>
                <table className="admin-table">
                  <thead><tr><th>Seller part</th><th>Owed (after commission)</th><th>Held</th><th>Available</th><th>Paid out</th><th>To recover</th><th>Commission</th><th></th></tr></thead>
                  <tbody>
                    {data.sellers.map((s) => (
                      <tr key={s.sellerId}>
                        <td><div style={{ fontWeight: 700 }}>{s.sellerName ?? `Seller #${s.sellerId}`}</div><div style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.vendorOrderNumber}{s.commissionRate != null ? ` · ${s.commissionRate}%` : ''}</div></td>
                        <td>{formatPrice(s.expectedNet)}</td>
                        <td>{formatPrice(s.held + s.underDispute)}</td>
                        <td>{formatPrice(s.available)}</td>
                        <td>{formatPrice(s.paidOut)}</td>
                        <td>{formatPrice(s.recovery)}</td>
                        <td>{formatPrice(s.commission)}</td>
                        <td>{s.matches ? <span className="chip chip-success">OK</span> : <span className="chip chip-danger">Mismatch</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>{data.transactions.map((t) => <TransactionCard key={t.id} t={t} />)}</div>
          </>
        )}
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="admin-stat-card"><div className="admin-stat-value">{formatPrice(value)}</div><div className="admin-stat-label">{label}</div></div>;
}

function ErrorState({ text }: { text: string }) {
  return <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>{text}</p></div>;
}
