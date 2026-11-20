import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DisputeSummary, DisputeThread } from '../../components/DisputeThread';
import { shortDateTime } from '../../lib/fulfilmentRules';
import {
  getDispute, getMyDisputes, isOpenDispute, REASON_LABELS, statusLabel, withdrawDispute, type Dispute, type DisputeRole,
} from '../../lib/disputes';

/** Sellers never receive the buyer's id, so its presence tells the two sides apart. */
const roleOf = (d: Dispute): DisputeRole => (d.buyerId != null ? 'buyer' : 'seller');

/** Batch 6: the disputes a user has raised as a buyer or received as a seller. */
export default function DisputesPage() {
  const { id } = useParams();
  return id ? <DisputeDetail id={Number(id)} /> : <DisputeList />;
}

function DisputeList() {
  const { data = [], isLoading, isError } = useQuery({ queryKey: ['disputes', 'mine'], queryFn: getMyDisputes });
  return (
    <div className="section"><div className="container" style={{ maxWidth: 760 }}>
      <Link to="/account" style={{ fontSize: 13 }}><i className="fa-solid fa-arrow-left"></i> My account</Link>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 4px' }}>Disputes</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
        Problems reported on orders you bought or sold. To report a new problem, open the order in My Orders.
      </p>
      {isLoading ? <PageLoadingSpinner message="Loading disputes…" />
        : isError ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load disputes.</p></div>
        : data.length === 0 ? <div className="empty-cart"><i className="fa-solid fa-scale-balanced"></i><p>No disputes. Good news.</p></div>
        : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {data.map((d) => (
              <li key={d.id}>
                <Link to={`/account/disputes/${d.id}`} style={{ display: 'block', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 12px', background: 'var(--bg)', color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13 }}>#{d.id} · {REASON_LABELS[d.reason]}</strong>
                    <span className={`chip ${isOpenDispute(d.status) ? 'chip-pending' : 'chip-neutral'}`}>{statusLabel(d.status, roleOf(d))}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {roleOf(d) === 'buyer' ? 'You bought' : 'You sold'} · <span style={{ fontFamily: 'monospace' }}>{d.vendorOrderNumber}</span> · {shortDateTime(d.createdAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </div></div>
  );
}

function DisputeDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const { data: d, isLoading, isError } = useQuery({ queryKey: ['disputes', id], queryFn: () => getDispute(id) });
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const update = (next: Dispute) => {
    qc.setQueryData(['disputes', id], next);
    void qc.invalidateQueries({ queryKey: ['disputes', 'mine'] });
    void qc.invalidateQueries({ queryKey: ['orders'] });
  };

  return (
    <div className="section"><div className="container" style={{ maxWidth: 760 }}>
      <Link to="/account/disputes" style={{ fontSize: 13 }}><i className="fa-solid fa-arrow-left"></i> All disputes</Link>
      {isLoading ? <PageLoadingSpinner message="Loading the dispute…" />
        : isError || !d ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>This dispute could not be found.</p></div>
        : (
          <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
            <DisputeSummary d={d} role={roleOf(d)} />
            <DisputeThread d={d} role={roleOf(d)} onUpdated={update} />
            {roleOf(d) === 'buyer' && isOpenDispute(d.status) && (
              <div>
                <button className="btn-outline btn-sm btn-inline" onClick={() => setConfirmWithdraw(true)}>Withdraw dispute</button>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>If the seller sorted it out with you, withdraw so the order can carry on.</small>
              </div>
            )}
            <ConfirmDialog
              open={confirmWithdraw}
              title="Withdraw this dispute?"
              message="The hold on the seller’s payment is lifted and the order carries on as normal. You can’t reopen this dispute."
              confirmLabel="Withdraw"
              onConfirm={async () => { setConfirmWithdraw(false); const r = await withdrawDispute(d.id); if (r) update(r); }}
              onCancel={() => setConfirmWithdraw(false)}
            />
          </div>
        )}
    </div></div>
  );
}
