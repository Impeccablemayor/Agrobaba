import { api } from './api';
import { showToast } from './toastBus';
import type { OrderEarning } from './orders';
import type { PayoutGates, PayoutStatus } from './payoutRules';

export * from './payoutRules';

/** Admin seller payouts (GET/POST /api/admin/payouts). AgroBaba's Flutterwave balance is the
 *  escrow: the admin sends the transfer in the Flutterwave dashboard, then records it here. */

export interface PayoutCandidate {
  sellerId: number;
  sellerName: string | null;
  businessName: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  /** Masked ("******6789"); the full number only through the audited reveal. */
  bankAccountNumber: string | null;
  bankAccountId: number | null;
  /** False while ID verification, bank account confirmation or the cooling-off period block payment. */
  payoutReady: boolean;
  payoutBlockers: string[];
  earning: OrderEarning;
}

export interface Payout {
  id: number;
  sellerId: number;
  sellerName: string | null;
  orderId: number;
  invoiceNumber: string | null;
  grossAmount: number;
  refundedAmount: number;
  feeRate: number;
  feeAmount: number;
  /** Included in netAmount; 0 when AgroBaba delivered. */
  deliveryFee: number;
  netAmount: number;
  /** Flutterwave's transfer fee, who bore it, and what actually reached the seller (Batch 3). */
  transferFee: number;
  transferFeeBearer: 'PLATFORM' | 'SELLER';
  amountSent: number;
  currency: string;
  status: PayoutStatus;
  transferReference: string;
  note: string | null;
  /** Set once the money is confirmed sent. */
  releasedBy: string | null;
  releasedAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  /** Batch 7: MANUAL (sent in the Flutterwave dashboard) or AUTOMATED (sent by AgroBaba through the API). */
  method: 'MANUAL' | 'AUTOMATED';
  vendorOrderId: number | null;
  batchId: number | null;
  approvalReason: 'APPROVAL_MODE' | 'LARGE_AMOUNT' | null;
  approvedBy: string | null;
  approvedAt: string | null;
  attemptCount: number;
  submittedAt: string | null;
  providerStatus: string | null;
  failureReason: string | null;
  createdAt: string;
  cancelReason: string | null;
}

export interface PayoutBatch {
  id: number;
  trigger: 'SCHEDULED' | 'MANUAL';
  createdBy: string | null;
  createdAt: string;
  payoutCount: number;
  totalAmount: number;
  skipped: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface PayoutPipeline {
  gates: PayoutGates;
  awaitingApproval: Payout[];
  queued: Payout[];
  inFlight: Payout[];
  recentProblems: Payout[];
  batches: PayoutBatch[];
}

export interface PrepareResult {
  batchId: number | null;
  created: number;
  awaitingApproval: number;
  total: number;
  skipped: string[];
  blocked: string | null;
}

const AUTO = '/api/admin/payouts/automation';

async function attempt<T>(fn: () => Promise<T>, ok: (r: T) => string | null, fail: string): Promise<T | false> {
  try {
    const r = await fn();
    const m = ok(r);
    if (m) showToast(m, 'success');
    return r;
  } catch (error) {
    showToast(error instanceof Error ? error.message : fail, 'error');
    return false;
  }
}

export const getPayoutPipeline = () => api.get<PayoutPipeline>(AUTO);
export const preparePayouts = () => attempt(() => api.post<PrepareResult>(`${AUTO}/prepare`, {}), (r) => r.blocked
  ? null : `${r.created} payout${r.created === 1 ? '' : 's'} prepared${r.skipped.length ? `, ${r.skipped.length} left out (see the batch)` : ''}.`,
  'Unable to prepare payouts');
export const approvePayoutBatch = (id: number) => attempt(() => api.post<{ approved: number }>(`${AUTO}/batches/${id}/approve`, {}),
  (r) => `${r.approved} payout${r.approved === 1 ? '' : 's'} approved and being sent.`, 'Unable to approve');
export const approvePayout = (id: number) => attempt(() => api.post<Payout>(`${AUTO}/${id}/approve`, {}), () => 'Approved and being sent.', 'Unable to approve');
export const cancelAutoPayout = (id: number, reason: string) => attempt(() => api.post<Payout>(`${AUTO}/${id}/cancel`, { reason }),
  () => 'Payout cancelled. The money stays available for the seller.', 'Unable to cancel');
export const sendApprovedPayouts = () => attempt(() => api.post<{ submitted: number; blocked: string | null }>(`${AUTO}/send`, {}),
  (r) => r.blocked ? null : `${r.submitted} sent to Flutterwave.`, 'Unable to send');
export const checkPayoutStatuses = () => attempt(() => api.post<{ checked: number; released: number; failed: number }>(`${AUTO}/reconcile`, {}),
  (r) => `Checked ${r.checked}: ${r.released} paid, ${r.failed} failed.`, 'Unable to check');
export const pausePayouts = (reason: string) => attempt(() => api.post<PayoutGates>(`${AUTO}/pause`, { reason }), () => 'All payouts paused.', 'Unable to pause');
export const resumePayouts = () => attempt(() => api.post<PayoutGates>(`${AUTO}/resume`, {}), () => 'Payouts resumed.', 'Unable to resume');
export const savePayoutSettings = (s: { mode?: string; approvalThreshold?: number; minimum?: number }) =>
  attempt(() => api.put<PayoutGates>(`${AUTO}/settings`, s), () => 'Payout settings saved.', 'Unable to save settings');

export interface PayoutPage {
  content: Payout[];
  number: number;
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
}

export const getPayoutQueue = () => api.get<PayoutCandidate[]>('/api/admin/payouts/queue');

export const getPayoutHistory = (page = 0, size = 20) =>
  api.get<PayoutPage>(`/api/admin/payouts?page=${page}&size=${size}`);

export async function releasePayout(input: { orderId: number; sellerId: number; transferReference: string; note?: string }): Promise<Payout | false> {
  try {
    const payout = await api.post<Payout>('/api/admin/payouts/release', input);
    showToast('Payout recorded. The seller has been notified.', 'success');
    return payout;
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Unable to record payout', 'error');
    return false;
  }
}

export async function voidPayout(id: number, reason: string): Promise<Payout | false> {
  try {
    const payout = await api.post<Payout>(`/api/admin/payouts/${id}/void`, { reason });
    showToast('Payout record voided. The order is releasable again.', 'success');
    return payout;
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Unable to void payout', 'error');
    return false;
  }
}
