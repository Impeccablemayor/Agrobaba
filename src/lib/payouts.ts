import { api } from './api';
import { showToast } from './toastBus';
import type { OrderEarning } from './orders';

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
  status: 'RELEASED' | 'VOIDED';
  transferReference: string;
  note: string | null;
  releasedBy: string;
  releasedAt: string;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

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
