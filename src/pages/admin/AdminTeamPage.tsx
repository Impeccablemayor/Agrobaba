import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatPrice } from '../../lib/format';
import {
  ADMIN_ROLES, changeAdminRole, createAdmin, getAdminMe, getAdmins, getFinanceControls, saveFinanceControls, setAdminActive,
  type AdminAccount, type AdminRoleName,
} from '../../lib/adminAccess';

/** Batch 8 (super administrators): who can do what in the admin console, and the two-person limit. */
export default function AdminTeamPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['admin', 'me'], queryFn: getAdminMe, staleTime: 60_000 });
  const { data = [], isLoading, isError } = useQuery({ queryKey: ['admin', 'team'], queryFn: getAdmins });
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRoleName>('SUPPORT');
  const [busy, setBusy] = useState(false);
  const [deactivating, setDeactivating] = useState<AdminAccount | null>(null);
  const [reason, setReason] = useState('');
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin', 'team'] });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Admin team</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 720 }}>
          Only finance and super administrators can move money. A new admin gets an email to set their own password - nobody else ever
          knows it. Changes take effect on their next click and are recorded in the audit log.
        </p>
      </div>

      <section style={panel}>
        <h3 style={h3}>Roles</h3>
        <ul style={{ margin: '8px 0 0 16px', fontSize: 13, display: 'grid', gap: 4 }}>
          {ADMIN_ROLES.map((r) => <li key={r.value}><strong>{r.label}:</strong> {r.summary}</li>)}
        </ul>
      </section>

      <section style={panel}>
        <h3 style={h3}>Add an admin</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 8 }}>
          <div className="form-group" style={{ margin: 0 }}><label htmlFor="ad-email">Work email</label>
            <input id="ad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@agrobaba.com" /></div>
          <div className="form-group" style={{ margin: 0 }}><label htmlFor="ad-name">Name</label>
            <input id="ad-name" type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="form-group" style={{ margin: 0 }}><label htmlFor="ad-role">Role</label>
            <select id="ad-role" value={role} onChange={(e) => setRole(e.target.value as AdminRoleName)}>
              {ADMIN_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select></div>
        </div>
        <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11, margin: '6px 0' }}>Use a separate email from any customer or seller account.</small>
        <button className="btn-primary btn-sm btn-inline" disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}
          onClick={async () => { setBusy(true); const ok = await createAdmin(email.trim(), name.trim(), role); setBusy(false); if (ok) { setEmail(''); setName(''); refresh(); } }}>
          Add admin and send the password email</button>
      </section>

      <section>
        <h3 style={h3}>Admins</h3>
        {isLoading ? <PageLoadingSpinner message="Loading admins…" />
          : isError ? <div className="empty-cart"><p>Unable to load admins.</p></div>
          : (
            <div className="admin-table-wrap" style={{ marginTop: 8 }}>
              <table className="admin-table">
                <thead><tr><th>Admin</th><th>Role</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {data.map((a) => {
                    const self = me?.id === a.id;
                    return (
                      <tr key={a.id}>
                        <td><div style={{ fontWeight: 700 }}>{a.name}{self ? ' (you)' : ''}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.email}</div></td>
                        <td>
                          <select aria-label={`Role for ${a.email}`} value={a.adminRole ?? ''} disabled={self || busy}
                            onChange={async (e) => { setBusy(true); await changeAdminRole(a.id, e.target.value as AdminRoleName); setBusy(false); refresh(); }}>
                            {!a.adminRole && <option value="">No role</option>}
                            {ADMIN_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </td>
                        <td>{a.active ? <span className="chip chip-success">Active</span>
                          : <span className="chip chip-neutral" title={a.suspendedReason ?? ''}>Deactivated</span>}</td>
                        <td>{!self && (a.active
                          ? <button className="btn-outline btn-sm btn-inline" style={{ color: 'var(--danger)' }} onClick={() => setDeactivating(a)}>Deactivate</button>
                          : <button className="btn-outline btn-sm btn-inline" disabled={busy}
                            onClick={async () => { setBusy(true); await setAdminActive(a.id, true); setBusy(false); refresh(); }}>Reactivate</button>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <TwoPersonLimit />

      <ConfirmDialog open={!!deactivating} title={`Deactivate ${deactivating?.email ?? ''}?`} confirmLabel="Deactivate" destructive busy={busy}
        message="They are signed out of the admin console at once. You can reactivate them later."
        onConfirm={async () => { if (!deactivating || !reason.trim()) return; setBusy(true); const ok = await setAdminActive(deactivating.id, false, reason.trim()); setBusy(false); if (ok) { setDeactivating(null); setReason(''); refresh(); } }}
        onCancel={() => { setDeactivating(null); setReason(''); }}>
        <textarea aria-label="Why deactivate" placeholder="Why (required)" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
          style={{ width: '100%', margin: '4px 0 12px', fontSize: 13 }} />
      </ConfirmDialog>
    </div>
  );
}

function TwoPersonLimit() {
  const { data } = useQuery({ queryKey: ['admin', 'finance', 'controls'], queryFn: getFinanceControls });
  const [value, setValue] = useState<string | null>(null);
  const shown = value ?? (data ? String(data.dualApprovalThreshold) : '');
  const n = Number(shown);
  const valid = shown.trim() !== '' && Number.isFinite(n) && n >= 0;
  return (
    <section style={panel}>
      <h3 style={h3}>Two-person approval</h3>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
        Refunds, manual seller payouts and influencer payouts above this amount need a second finance or super administrator. Making payouts
        fully automatic or raising the large-payout limit always does. The rule applies once there are at least two finance or super admins.
        {data ? ` Now: ${formatPrice(data.dualApprovalThreshold)}.` : ''}
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700 }}>₦</span>
        <input aria-label="Two-person approval limit" type="number" min="0" value={shown} onChange={(e) => setValue(e.target.value)} style={{ maxWidth: 180 }} />
        <button className="btn-primary btn-sm btn-inline" disabled={!valid || !data || n === data.dualApprovalThreshold}
          onClick={async () => { if (await saveFinanceControls(n)) setValue(null); }}>Save</button>
      </div>
    </section>
  );
}

const panel = { border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', background: 'var(--bg)' } as const;
const h3 = { fontSize: 14, fontWeight: 800, margin: 0 } as const;
