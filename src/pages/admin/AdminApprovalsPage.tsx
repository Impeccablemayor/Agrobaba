import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { formatPrice } from '../../lib/format';
import { shortDateTime } from '../../lib/fulfilmentRules';
import { approveRequest, getAdminMe, getApprovals, rejectRequest, type FinancialApproval } from '../../lib/adminAccess';

const TONE: Record<FinancialApproval['status'], string> = {
  PENDING: 'chip-pending', EXECUTED: 'chip-success', FAILED: 'chip-danger', REJECTED: 'chip-neutral', CANCELLED: 'chip-neutral',
};
const STATUS: Record<FinancialApproval['status'], string> = {
  PENDING: 'Waiting', EXECUTED: 'Approved and done', FAILED: 'Approved, but refused when run', REJECTED: 'Rejected', CANCELLED: 'Withdrawn',
};

/**
 * Batch 8: two-person approval (founder decisions, 20 Nov 2026). Refunds, manual payouts and influencer
 * payouts above the limit, and changes that loosen payout controls, wait here until another finance or
 * super administrator approves them. On approval the system runs the action with every check repeated.
 */
export default function AdminApprovalsPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['admin', 'me'], queryFn: getAdminMe, staleTime: 60_000 });
  const { data = [], isLoading, isError } = useQuery({ queryKey: ['admin', 'approvals'], queryFn: getApprovals, refetchInterval: 20_000 });
  const [busy, setBusy] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const pending = data.filter((a) => a.status === 'PENDING');
  const done = data.filter((a) => a.status !== 'PENDING');

  async function act(id: number, fn: () => Promise<unknown>) {
    setBusy(id);
    await fn();
    setBusy(null);
    void qc.invalidateQueries({ queryKey: ['admin'] });
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Approvals</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 720 }}>
          Sensitive money actions need a second person. You can’t approve your own request. When approved, AgroBaba runs it
          straight away and checks everything again (amounts, eligibility, the ledger) - if anything changed, it is refused and shown here.
        </p>
      </div>
      {isLoading ? <PageLoadingSpinner message="Loading requests…" />
        : isError ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load requests.</p></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
            <section>
              <h3 style={h3}>Waiting for a second admin ({pending.length})</h3>
              {pending.length === 0 ? <p style={{ fontSize: 12, color: 'var(--muted)' }}>Nothing waiting.</p> : (
                <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                  {pending.map((a) => {
                    const mine = !!me && a.requestedBy.toLowerCase() === me.email.toLowerCase();
                    return (
                      <div key={a.id} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <strong>#{a.id} · {a.actionLabel}{a.amount != null ? ` · ${formatPrice(a.amount)}` : ''}</strong>
                          <span className="chip chip-pending">Waiting</span>
                        </div>
                        <p style={{ fontSize: 13, margin: '6px 0' }}>{a.summary}</p>
                        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Asked by {a.requestedBy} · {shortDateTime(a.requestedAt)}</p>
                        <input type="text" maxLength={1000} placeholder="Note (optional)" aria-label={`Note for request ${a.id}`}
                          value={notes[a.id] ?? ''} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} style={{ marginTop: 8, width: '100%' }} />
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {mine ? (
                            <>
                              <small style={{ color: 'var(--muted)', alignSelf: 'center' }}>Your request - another admin must approve it.</small>
                              <button className="btn-outline btn-sm btn-inline" disabled={busy === a.id} onClick={() => void act(a.id, () => rejectRequest(a.id, notes[a.id]))}>Withdraw</button>
                            </>
                          ) : (
                            <>
                              <button className="btn-primary btn-sm btn-inline" disabled={busy === a.id} onClick={() => void act(a.id, () => approveRequest(a.id, notes[a.id]))}>
                                {busy === a.id ? 'Working…' : 'Approve and run'}</button>
                              <button className="btn-outline btn-sm btn-inline" style={{ color: 'var(--danger)' }} disabled={busy === a.id}
                                onClick={() => void act(a.id, () => rejectRequest(a.id, notes[a.id]))}>Reject</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            <section>
              <h3 style={h3}>Decided</h3>
              {done.length === 0 ? <p style={{ fontSize: 12, color: 'var(--muted)' }}>None yet.</p> : (
                <div className="admin-table-wrap" style={{ marginTop: 8 }}>
                  <table className="admin-table">
                    <thead><tr><th>#</th><th>Request</th><th>Asked by</th><th>Decided by</th><th>Outcome</th></tr></thead>
                    <tbody>
                      {done.map((a) => (
                        <tr key={a.id}>
                          <td>{a.id}</td>
                          <td style={{ fontSize: 12, maxWidth: 320 }}>{a.summary}</td>
                          <td style={{ fontSize: 12 }}>{a.requestedBy}<div style={{ color: 'var(--muted)' }}>{shortDateTime(a.requestedAt)}</div></td>
                          <td style={{ fontSize: 12 }}>{a.decidedBy ?? '—'}<div style={{ color: 'var(--muted)' }}>{a.decidedAt ? shortDateTime(a.decidedAt) : ''}</div></td>
                          <td style={{ fontSize: 12 }}><span className={`chip ${TONE[a.status]}`}>{STATUS[a.status]}</span>
                            {(a.result || a.decisionNote) && <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{a.result ?? a.decisionNote}</div>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
    </div>
  );
}

const h3 = { fontSize: 14, fontWeight: 800, margin: 0 } as const;
const card = { border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', background: 'var(--bg)' } as const;
