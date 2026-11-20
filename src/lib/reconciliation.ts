import { api } from './api';
import { showToast } from './toastBus';

/** Batch 9: daily reconciliation against Flutterwave and the money system's health checks (admin). */

export interface ReconRun {
  id: number;
  trigger: 'SCHEDULED' | 'MANUAL';
  startedBy: string | null;
  startedAt: string;
  finishedAt: string | null;
  windowFrom: string;
  windowTo: string;
  status: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  paymentsChecked: number;
  payoutsChecked: number;
  ordersChecked: number;
  newExceptions: number;
  notes: string | null;
}

export interface ReconException {
  id: number;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  entityType: string | null;
  entityId: number | null;
  reference: string;
  expected: string | null;
  actual: string | null;
  detail: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface ReconOverview {
  runs: ReconRun[];
  open: ReconException[];
  closed: ReconException[];
  openCritical: number;
  openWarning: number;
}

export interface HealthCheck { name: string; status: 'OK' | 'WARNING' | 'FAILING'; detail: string }
export interface SystemHealth { status: 'OK' | 'WARNING' | 'FAILING'; checks: HealthCheck[]; checkedAt: string }

/** Plain names for what each exception type means. */
export const EXCEPTION_LABELS: Record<string, string> = {
  PAYMENT_NOT_AT_PROVIDER: 'Payment recorded, but Flutterwave has no such transaction',
  PAYMENT_STATUS_MISMATCH: 'Payment recorded as received, Flutterwave disagrees',
  PAYMENT_AMOUNT_MISMATCH: 'Amount received differs from the order',
  PAYMENT_CURRENCY_MISMATCH: 'Wrong currency received',
  PAYMENT_REFERENCE_MISMATCH: 'Transaction belongs to another checkout',
  PAYMENT_NO_PROVIDER_ID: 'Payment without a Flutterwave transaction id',
  PAYMENT_MISSING_LOCALLY: 'Flutterwave received money AgroBaba hasn’t recorded',
  PAYMENT_DUPLICATED_AT_PROVIDER: 'Buyer charged twice for one checkout',
  SETTLEMENT_OVERDUE: 'Received over 3 days ago, settlement not recorded',
  SETTLEMENT_TOTAL_MISMATCH: 'Settlements don’t match Flutterwave’s report',
  BALANCE_BELOW_LEDGER: 'Flutterwave holds less than the ledger says it should',
  PAYOUT_NOT_AT_PROVIDER: 'Payout recorded, Flutterwave never made it',
  PAYOUT_STATUS_MISMATCH: 'Payout recorded as paid, Flutterwave disagrees',
  PAYOUT_PAID_BUT_RECORDED_FAILED: 'Flutterwave paid a payout recorded as failed',
  PAYOUT_STUCK: 'Transfer with Flutterwave for over a day',
  WEBHOOK_FAILED: 'A payment notification failed to apply',
  LEDGER_MISMATCH: 'Ledger doesn’t match the order’s records',
};

export const getReconciliation = () => api.get<ReconOverview>('/api/admin/finance/reconciliation');
export const getSystemHealth = () => api.get<SystemHealth>('/api/admin/finance/reconciliation/health');

export async function runReconciliation(): Promise<ReconRun | false> {
  try {
    const r = await api.post<ReconRun>('/api/admin/finance/reconciliation/run', {});
    showToast(r.newExceptions > 0 ? `Done: ${r.newExceptions} new item(s) to review.` : r.status === 'COMPLETED'
      ? 'Done: nothing new found.' : 'Done, but some checks couldn’t run - see the notes.', r.newExceptions > 0 || r.status !== 'COMPLETED' ? 'info' : 'success');
    return r;
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Unable to run reconciliation', 'error');
    return false;
  }
}

export async function closeException(id: number, status: 'RESOLVED' | 'IGNORED', note: string): Promise<boolean> {
  try {
    await api.post(`/api/admin/finance/reconciliation/exceptions/${id}/close`, { status, note });
    showToast(status === 'RESOLVED' ? 'Marked resolved.' : 'Marked as not a problem.', 'success');
    return true;
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Unable to update', 'error');
    return false;
  }
}
