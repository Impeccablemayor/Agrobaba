import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { shortDateTime } from '../../lib/fulfilmentRules';
import { closeException, EXCEPTION_LABELS, getReconciliation, getSystemHealth, runReconciliation, type ReconException } from '../../lib/reconciliation';

const SEV: Record<ReconException['severity'], string> = { CRITICAL: 'chip-danger', WARNING: 'chip-pending', INFO: 'chip-neutral' };
const HEALTH: Record<string, string> = { OK: 'chip-success', WARNING: 'chip-pending', FAILING: 'chip-danger' };

/**
 * Batch 9: every morning at 06:00 (Lagos) AgroBaba checks its records against Flutterwave's - payments,
 * settlements, balance and transfers - and its own ledger. Anything that doesn't agree is listed here
 * until an admin resolves it. Nothing is changed automatically.
 */
export default function AdminReconciliationPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin', 'reconciliation'], queryFn: getReconciliation });
  const { data: health } = useQuery({ queryKey: ['admin', 'system-health'], queryFn: getSystemHealth, refetchInterval: 60_000 });
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['admin', 'reconciliation'] }); void qc.invalidateQueries({ queryKey: ['admin', 'system-health'] }); };
  const last = data?.runs[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Reconciliation &amp; health</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 720 }}>
          Every morning at 06:00 AgroBaba compares its payments, settlements, balance and seller transfers with Flutterwave’s records, and
          checks its own ledger. Differences are listed below until someone looks into them. Nothing is changed automatically.
        </p>
      </div>

      {health && (
        <section style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={h3}>Money system health</h3>
            <span className={`chip ${HEALTH[health.status]}`}>{health.status === 'OK' ? 'All good' : health.status === 'WARNING' ? 'Needs attention' : 'Problem'}</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 4 }}>
            {health.checks.map((c) => (
              <li key={c.name} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                <i className={`fa-solid ${c.status === 'OK' ? 'fa-circle-check' : c.status === 'WARNING' ? 'fa-circle-exclamation' : 'fa-circle-xmark'}`}
                  style={{ color: c.status === 'OK' ? 'var(--primary)' : c.status === 'WARNING' ? 'var(--accent)' : 'var(--danger)', marginTop: 3 }}></i>
                <span><strong>{c.name}.</strong> <span style={{ color: 'var(--text-secondary)' }}>{c.detail}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isLoading ? <PageLoadingSpinner message="Loading…" />
        : isError || !data ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load reconciliation.</p></div>
        : (
          <>
            <section style={panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <h3 style={h3}>Last run</h3>
                <button className="btn-primary btn-sm btn-inline" disabled={busy}
                  onClick={async () => { setBusy(true); await runReconciliation(); setBusy(false); refresh(); }}>
                  <i className="fa-solid fa-rotate"></i> {busy ? 'Checking…' : 'Run now'}</button>
              </div>
              {last ? (
                <p style={{ fontSize: 13, margin: '6px 0 0' }}>
                  {shortDateTime(last.finishedAt ?? last.startedAt)} · <strong>{last.status === 'COMPLETED' ? 'Completed' : last.status === 'PARTIAL'
                    ? 'Partly done' : last.status === 'FAILED' ? 'Failed' : 'Running'}</strong> · {last.paymentsChecked} payments, {last.payoutsChecked} transfers,
                  {' '}{last.ordersChecked} orders checked ({last.windowFrom} to {last.windowTo}) · {last.newExceptions} new
                </p>
              ) : <p style={{ fontSize: 13, color: 'var(--muted)' }}>Never run yet.</p>}
              {last?.notes && <ul style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0 16px' }}>{last.notes.split('\n').map((n) => <li key={n}>{n}</li>)}</ul>}
            </section>

            <section>
              <h3 style={h3}>To review ({data.open.length}) · {data.openCritical} critical, {data.openWarning} warning</h3>
              {data.open.length === 0 ? <p style={{ fontSize: 12, color: 'var(--muted)' }}>Nothing to review.</p> : (
                <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                  {data.open.map((e) => (
                    <div key={e.id} style={panel}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{EXCEPTION_LABELS[e.type] ?? e.type}</strong>
                        <span className={`chip ${SEV[e.severity]}`}>{e.severity.toLowerCase()}</span>
                      </div>
                      <p style={{ fontSize: 13, margin: '6px 0' }}>{e.detail}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                        {e.expected && <>Expected: <strong>{e.expected}</strong> · </>}{e.actual && <>Found: <strong>{e.actual}</strong> · </>}
                        <span style={{ fontFamily: 'monospace' }}>{e.reference}</span> · first seen {shortDateTime(e.firstSeenAt)}
                      </p>
                      <input type="text" maxLength={1000} placeholder="What was done (required to close)" aria-label={`Note for item ${e.id}`}
                        value={notes[e.id] ?? ''} onChange={(ev) => setNotes({ ...notes, [e.id]: ev.target.value })} style={{ width: '100%', marginTop: 8 }} />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <button className="btn-primary btn-sm btn-inline" disabled={(notes[e.id] ?? '').trim().length < 5}
                          onClick={async () => { if (await closeException(e.id, 'RESOLVED', notes[e.id])) refresh(); }}>Resolved</button>
                        <button className="btn-outline btn-sm btn-inline" disabled={(notes[e.id] ?? '').trim().length < 5}
                          onClick={async () => { if (await closeException(e.id, 'IGNORED', notes[e.id])) refresh(); }}>Not a problem</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {data.closed.length > 0 && (
              <section>
                <h3 style={h3}>Recently closed</h3>
                <div className="admin-table-wrap" style={{ marginTop: 8 }}>
                  <table className="admin-table">
                    <thead><tr><th>Item</th><th>Closed by</th><th>Note</th></tr></thead>
                    <tbody>
                      {data.closed.map((e) => (
                        <tr key={e.id}>
                          <td style={{ fontSize: 12 }}>{EXCEPTION_LABELS[e.type] ?? e.type}<div style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{e.reference}</div></td>
                          <td style={{ fontSize: 12 }}>{e.resolvedBy}<div style={{ color: 'var(--muted)' }}>{e.resolvedAt ? shortDateTime(e.resolvedAt) : ''}</div></td>
                          <td style={{ fontSize: 12 }}>{e.status === 'IGNORED' ? 'Not a problem: ' : ''}{e.resolutionNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
    </div>
  );
}

const panel = { border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', background: 'var(--bg)' } as const;
const h3 = { fontSize: 14, fontWeight: 800, margin: 0 } as const;
