import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { clearInspectionPolicy, getInspectionPolicies, setInspectionPolicy, type InspectionPolicyRow } from '../../lib/fulfilment';

/** Batch 5: how long buyers have to check goods after receipt, per category. A category without its
 *  own period uses its parent's, else the default (72 h). Changes apply to orders received from now on. */
export default function AdminInspectionPage() {
  const { data = [], isLoading, isError } = useQuery({ queryKey: ['admin', 'inspection-policies'], queryFn: getInspectionPolicies });
  const [filter, setFilter] = useState('');
  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? data.filter((r) => r.name.toLowerCase().includes(f) || r.code.toLowerCase().includes(f)) : data;
  }, [data, filter]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Inspection periods</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 640 }}>
          How long a buyer has to check goods after receiving them before the seller is paid. Set it on a main
          category (e.g. Fish) to cover everything under it, or on a sub-category to override. Applies to orders
          received after the change.
        </p>
      </div>
      <div className="form-group" style={{ maxWidth: 320 }}>
        <label htmlFor="insp-filter">Find a category</label>
        <input id="insp-filter" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. fish, poultry, feed" />
      </div>
      {isLoading ? <PageLoadingSpinner message="Loading categories…" />
        : isError ? <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>Unable to load inspection periods.</p></div>
        : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Category</th><th>Inspection</th><th>Set here</th></tr></thead>
              <tbody>{rows.map((r) => <PolicyRowView key={r.categoryId} r={r} />)}</tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function PolicyRowView({ r }: { r: InspectionPolicyRow }) {
  const qc = useQueryClient();
  const [hours, setHours] = useState(r.ownHours != null ? String(r.ownHours) : '');
  const [busy, setBusy] = useState(false);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin', 'inspection-policies'] });
  const n = Number(hours);
  const valid = Number.isInteger(n) && n >= 1 && n <= 720;

  async function save() {
    setBusy(true);
    if (await setInspectionPolicy(r.categoryId, n)) refresh();
    setBusy(false);
  }

  async function reset() {
    setBusy(true);
    if (await clearInspectionPolicy(r.categoryId)) { setHours(''); refresh(); }
    setBusy(false);
  }

  return (
    <tr>
      <td>
        <div style={{ fontWeight: r.level <= 1 ? 800 : 600, paddingLeft: Math.max(0, r.level - 1) * 14 }}>{r.name}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--muted)', paddingLeft: Math.max(0, r.level - 1) * 14 }}>{r.code}</div>
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <strong>{r.effectiveHours} h</strong>
        {r.ownHours == null && <div style={{ fontSize: 11, color: 'var(--muted)' }}>from {r.inheritedFrom}</div>}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input aria-label={`Hours for ${r.name}`} type="number" min={1} max={720} inputMode="numeric" value={hours}
            onChange={(e) => setHours(e.target.value)} placeholder="hours" style={{ width: 80 }} />
          <button className="btn-primary btn-sm btn-inline" disabled={!valid || busy || n === r.ownHours} onClick={() => void save()}>Save</button>
          {r.ownHours != null && <button className="btn-outline btn-sm btn-inline" disabled={busy} onClick={() => void reset()}>Use inherited</button>}
        </div>
      </td>
    </tr>
  );
}
