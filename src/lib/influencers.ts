import { api } from './api';
import { showToast } from './toastBus';
import { isApprovalPending } from './adminAccessRules';

/** Influencers own AgroBaba-funded coupon codes and earn a commission (paid by AgroBaba, recorded
 *  here after a manual transfer). Admin only. */

export type CommissionStatus = 'AWAITING_PAYMENT' | 'EARNED' | 'PAYABLE' | 'PAID_OUT' | 'UNDER_REVIEW' | 'VOID' | 'CANCELLED';

export interface Influencer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  notes: string | null;
  active: boolean;
  codes: string[];
  orders: number;
  awaitingPayment: number;
  earned: number;
  payable: number;
  paidOut: number;
  createdAt: string;
  /** Overpaid earlier (refunds reduced commission already paid), taken off the next payout. */
  overpaid: number;
  /** What the next payout would send: payable - overpaid. */
  nextPayout: number;
  /** This influencer's own minimum (null = default) and the minimum that applies. */
  ownMinPayout: number | null;
  minPayout: number;
}

export interface CommissionLine {
  redemptionId: number;
  orderId: number;
  invoiceNumber: string | null;
  couponCode: string | null;
  orderSale: number;
  buyerDiscount: number;
  rate: number;
  commission: number;
  status: CommissionStatus;
  payoutId: number | null;
  createdAt: string;
  /** Batch 6: commission before item refunds reduced it; for paid lines, how much was paid above
   *  what the refunds now justify (to settle with the influencer by hand). */
  originalCommission?: number;
  overpaid?: number;
  /** Of the amount paid, how much later payouts already took back. */
  recovered?: number;
}

export interface InfluencerPayout {
  id: number;
  amount: number;
  transferReference: string;
  note: string | null;
  status: 'RELEASED' | 'VOIDED';
  releasedBy: string;
  releasedAt: string;
  voidReason: string | null;
  /** Commission covered; amount = grossAmount - recoveredAmount (overpaid earlier). */
  grossAmount: number;
  recoveredAmount: number;
  belowMinimumReason: string | null;
}

export interface InfluencerDetail {
  influencer: Influencer;
  commissions: CommissionLine[];
  payouts: InfluencerPayout[];
}

export interface InfluencerInput {
  name: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  notes?: string;
  active?: boolean;
  /** null = the default minimum payout. */
  minPayout?: number | null;
}

export const COMMISSION_LABELS: Record<CommissionStatus, string> = {
  AWAITING_PAYMENT: 'Awaiting payment',
  EARNED: 'Earned (order not delivered yet)',
  PAYABLE: 'Ready to pay',
  PAID_OUT: 'Paid',
  UNDER_REVIEW: 'Under review',
  VOID: 'Void (refunded)',
  CANCELLED: 'Cancelled',
};

export const getInfluencers = () => api.get<Influencer[]>('/api/admin/influencers');
export const getInfluencer = (id: number) => api.get<InfluencerDetail>(`/api/admin/influencers/${id}`);

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

export const saveInfluencer = (input: InfluencerInput, id?: number) =>
  attempt(() => (id ? api.put<Influencer>(`/api/admin/influencers/${id}`, input) : api.post<Influencer>('/api/admin/influencers', input)),
    id ? 'Influencer updated.' : 'Influencer added.', 'Unable to save influencer');

export const payInfluencer = (id: number, transferReference: string, note?: string, belowMinimumReason?: string) =>
  attempt(() => api.post<InfluencerPayout>(`/api/admin/influencers/${id}/payouts`, { transferReference, note, belowMinimumReason }),
    'Payout recorded.', 'Unable to record payout');

export const getInfluencerSettings = () => api.get<{ minPayout: number }>('/api/admin/influencers/settings');
export const saveInfluencerSettings = (minPayout: number) =>
  attempt(() => api.put<{ minPayout: number }>('/api/admin/influencers/settings', { minPayout }),
    'Minimum payout saved.', 'Unable to save the minimum payout');

export const voidInfluencerPayout = (payoutId: number, reason: string) =>
  attempt(() => api.post<InfluencerPayout>(`/api/admin/influencers/payouts/${payoutId}/void`, { reason }),
    'Payout record voided.', 'Unable to void payout');
