import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { formatPrice } from '../../lib/format';
import { shortDateTime } from '../../lib/fulfilmentRules';
import { downloadReport, getFinanceDashboard, REPORTS, type Amount } from '../../lib/adminAccess';

/**
 * Batch 8: AgroBaba's money at a glance. Balances (what sellers are owed, commission, fees, recovery) come
 * from the double-entry ledger, as of now; money that moved (payments, payouts, refunds) can be limited to
 * dates. Every figure is computed on the server.
 */
export default function AdminFinancePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { data: d, isLoading, isError } = useQuery({
    queryKey: ['admin', 'finance', 'dashboard', from, to],
    queryFn: () => getFinanceDashboard(from || undefined, to || undefined),
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Finance</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 720 }}>
          Seller balances, commission and fees are today’s ledger balances. Payments, payouts and refunds follow the dates you pick
          (leave them empty for all time).
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="fin-from">From</label>
          <input id="fin-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="fin-to">To</label>
          <input id="fin-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(from || to) && <button className="btn-outline btn-sm btn-inline" onClick={() => { setFrom(''); setTo(''); }}>All time</button>}
      </div>

      {isLoading ? <PageLoadingSpinner message="Adding up the money…" />
        : isError || !d ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load the finance dashboard.</p></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18 }}>
            <Section title="Money in">
              <Tile label="Verified payments" amount={d.verifiedPayments} />
              <Tile label="Settled into Flutterwave" amount={d.settledFunds} hint="after Flutterwave's fee" />
              <Tile label="Refunded to buyers" amount={d.refunds} />
              <Tile label="Refunds in progress" amount={d.refundsPending} />
            </Section>

            <Section title="Owed to sellers (ledger, now)">
              <Tile label="Total seller payables" value={d.sellerPayables} />
              <Tile label="Held (receipt / inspection)" value={d.heldSellerBalances} />
              <Tile label="Available for payout" value={d.availableSellerBalances} />
              <Tile label="Under dispute" value={d.disputedSellerBalances} hint={`${d.openDisputes} open dispute${d.openDisputes === 1 ? '' : 's'}`} />
            </Section>

            <Section title="Payouts">
              <Tile label="Pending (waiting, queued or with Flutterwave)" amount={d.pendingPayouts} />
              <Tile label="Paid to sellers" amount={d.successfulPayouts} />
              <Tile label="Failed transfers" amount={d.failedPayouts} danger={d.failedPayouts.count > 0} />
              <Tile label="Owed back by sellers (recovery)" value={d.sellerRecoveryOutstanding} danger={d.sellerRecoveryOutstanding > 0} />
            </Section>

            <Section title="AgroBaba">
              <Tile label="Platform commission (3%)" value={d.platformCommission} />
              <Tile label="Gateway fees" value={d.gatewayFees} />
              <Tile label="Flutterwave balance (ledger)" value={d.flutterwaveBalance} />
            </Section>

            <section style={panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <h3 style={h3}>Reconciliation</h3>
                <span className={`chip ${d.reconciliation.healthy ? 'chip-success' : 'chip-danger'}`}>
                  {d.reconciliation.healthy ? 'Everything adds up' : `${d.reconciliation.ordersWithIssues} order(s) need a look`}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0' }}>
                Checked the {d.reconciliation.ordersChecked} most recent paid orders against the ledger at {shortDateTime(d.reconciliation.checkedAt)}.
                {' '}{d.reconciliation.paymentsAwaitingSettlement} payment{d.reconciliation.paymentsAwaitingSettlement === 1 ? '' : 's'} not yet recorded as settled.
              </p>
              {d.reconciliation.issues.length > 0 && (
                <ul style={{ fontSize: 12, margin: '4px 0 0 16px' }}>{d.reconciliation.issues.map((i) => <li key={i}>{i}</li>)}</ul>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <Link className="btn-outline btn-sm btn-inline" to="/admin/ledger">Ledger</Link>
                <Link className="btn-outline btn-sm btn-inline" to="/admin/payouts">Payouts</Link>
                <Link className="btn-outline btn-sm btn-inline" to="/admin/payments">Payments &amp; settlements</Link>
                <Link className="btn-outline btn-sm btn-inline" to="/admin/disputes">Disputes</Link>
                <Link className="btn-outline btn-sm btn-inline" to="/admin/verifications">Bank &amp; ID checks</Link>
                <Link className="btn-outline btn-sm btn-inline" to="/admin/orders">Orders</Link>
              </div>
            </section>

            <section style={panel}>
              <h3 style={h3}>Reports (CSV)</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>
                Uses the dates above. Opens in Excel or Google Sheets. Each download is recorded in the audit log.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {REPORTS.map((r) => (
                  <button key={r.type} className="btn-outline btn-sm btn-inline" disabled={busy !== null}
                    onClick={async () => { setBusy(r.type); await downloadReport(r.type, from || undefined, to || undefined); setBusy(null); }}>
                    <i className="fa-solid fa-file-csv"></i> {busy === r.type ? 'Preparing…' : r.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 style={{ ...h3, marginBottom: 8 }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>{children}</div>
    </section>
  );
}

function Tile({ label, value, amount, hint, danger }: { label: string; value?: number; amount?: Amount; hint?: string; danger?: boolean }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-value" style={danger ? { color: 'var(--danger)' } : undefined}>{formatPrice(amount ? amount.amount : value ?? 0)}</div>
      <div className="admin-stat-label">{label}</div>
      {(amount || hint) && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
          {amount ? `${amount.count} item${amount.count === 1 ? '' : 's'}` : ''}{amount && hint ? ' · ' : ''}{hint}
        </div>
      )}
    </div>
  );
}

const panel = { border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', background: 'var(--bg)' } as const;
const h3 = { fontSize: 14, fontWeight: 800, margin: 0 } as const;
