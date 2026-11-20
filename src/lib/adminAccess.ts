import { api } from './api';
import { showToast } from './toastBus';
import { isApprovalPending, type AdminMe, type AdminRoleName } from './adminAccessRules';

export * from './adminAccessRules';

/** Batch 8 admin APIs: who am I, the admin team, two-person approvals, finance dashboard and reports. */

export interface AdminAccount {
  id: number;
  email: string;
  name: string;
  adminRole: AdminRoleName | null;
  roleLabel: string;
  active: boolean;
  suspendedReason: string | null;
  createdAt: string;
}

export interface FinancialApproval {
  id: number;
  actionType: string;
  actionLabel: string;
  amount: number | null;
  summary: string;
  requestedBy: string;
  requestedAt: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'REJECTED' | 'CANCELLED';
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  result: string | null;
}

export interface Amount { count: number; amount: number }

export interface FinanceDashboard {
  from: string | null;
  to: string | null;
  verifiedPayments: Amount;
  settledFunds: Amount;
  sellerPayables: number;
  heldSellerBalances: number;
  availableSellerBalances: number;
  disputedSellerBalances: number;
  openDisputes: number;
  platformCommission: number;
  gatewayFees: number;
  pendingPayouts: Amount;
  successfulPayouts: Amount;
  failedPayouts: Amount;
  refunds: Amount;
  refundsPending: Amount;
  sellerRecoveryOutstanding: number;
  flutterwaveBalance: number;
  reconciliation: { ordersChecked: number; ordersWithIssues: number; issues: string[]; paymentsAwaitingSettlement: number; healthy: boolean; checkedAt: string };
}

export const REPORTS = [
  { type: 'payments', label: 'Payments (verified, fees, settlement)' },
  { type: 'refunds', label: 'Refunds' },
  { type: 'payouts', label: 'Seller payouts (manual and automatic)' },
  { type: 'seller-balances', label: 'What each seller is owed now' },
  { type: 'disputes', label: 'Disputes and outcomes' },
] as const;

async function attempt<T>(fn: () => Promise<T>, ok: string, fail: string): Promise<T | false> {
  try {
    const r = await fn();
    showToast(isApprovalPending(r) ? r.message : ok, 'success');
    return r;
  } catch (error) {
    showToast(error instanceof Error ? error.message : fail, 'error');
    return false;
  }
}

export const getAdminMe = () => api.get<AdminMe>('/api/admin/me');
export const getAdmins = () => api.get<AdminAccount[]>('/api/admin/admins');
export const createAdmin = (email: string, name: string, role: AdminRoleName) =>
  attempt(() => api.post<AdminAccount>('/api/admin/admins', { email, name, role }), 'Admin added. They’ll get an email to set their password.', 'Unable to add the admin');
export const changeAdminRole = (id: number, role: AdminRoleName) =>
  attempt(() => api.put<AdminAccount>(`/api/admin/admins/${id}/role`, { role }), 'Role changed.', 'Unable to change the role');
export const setAdminActive = (id: number, active: boolean, reason?: string) =>
  attempt(() => api.put<AdminAccount>(`/api/admin/admins/${id}/active`, { active, reason }), active ? 'Admin reactivated.' : 'Admin deactivated.', 'Unable to update');

export const getApprovals = () => api.get<FinancialApproval[]>('/api/admin/approvals');
export const approveRequest = (id: number, note?: string) =>
  attempt(() => api.post<FinancialApproval>(`/api/admin/approvals/${id}/approve`, { note }), 'Approved.', 'Unable to approve');
export const rejectRequest = (id: number, note?: string) =>
  attempt(() => api.post<FinancialApproval>(`/api/admin/approvals/${id}/reject`, { note }), 'Done.', 'Unable to reject');
export const getFinanceControls = () => api.get<{ dualApprovalThreshold: number }>('/api/admin/finance/controls');
export const saveFinanceControls = (dualApprovalThreshold: number) =>
  attempt(() => api.put<{ dualApprovalThreshold: number }>('/api/admin/finance/controls', { dualApprovalThreshold }), 'Two-person limit saved.', 'Unable to save');

export const getFinanceDashboard = (from?: string, to?: string) => {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  return api.get<FinanceDashboard>(`/api/admin/finance/dashboard${q.toString() ? `?${q}` : ''}`);
};

/** Downloads a CSV report with the admin's session (the file is built and audited on the server). */
export async function downloadReport(type: string, from?: string, to?: string): Promise<boolean> {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  try {
    const blob = await api.get<Blob>(`/api/admin/finance/reports/${type}${q.toString() ? `?${q}` : ''}`);
    const data = blob instanceof Blob ? blob : new Blob([typeof blob === 'string' ? blob : JSON.stringify(blob)], { type: 'text/csv' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrobaba-${type}${from ? `-${from}` : ''}${to ? `-to-${to}` : ''}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Unable to download the report', 'error');
    return false;
  }
}
