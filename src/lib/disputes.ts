import { api } from './api';
import { showToast } from './toastBus';
import type { DisputeOutcome, DisputeReason, DisputeStatus } from './disputeRules';

export * from './disputeRules';

/** Batch 6 API: disputes on one seller's part of an order, paid cancellations and shortfalls. */

export interface DisputeMessage {
  id: number;
  authorRole: 'BUYER' | 'SELLER' | 'ADMIN' | 'SYSTEM';
  message: string;
  attachments: string[];
  createdAt: string;
}

export interface Dispute {
  id: number;
  vendorOrderId: number;
  vendorOrderNumber: string;
  orderId: number;
  invoiceNumber: string;
  /** Hidden from sellers. */
  buyerId: number | null;
  sellerId: number;
  sellerName: string | null;
  reason: DisputeReason;
  description: string;
  requestedOutcome: string | null;
  status: DisputeStatus;
  sellerResponseDueAt: string | null;
  sellerRespondedAt: string | null;
  outcome: DisputeOutcome | null;
  refundAmount: number | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  /** Admins only. */
  refundable: number | null;
  refundableDelivery: number | null;
  sellerPaidOut: boolean;
  messages: DisputeMessage[];
}

export interface AdjustmentResult {
  vendorOrderId: number;
  vendorOrderNumber: string;
  refunded: number;
  refundStatus: string;
  partCancelled: boolean;
  message: string;
}

async function attempt<T>(fn: () => Promise<T>, ok: string | ((r: T) => string), fail: string): Promise<T | false> {
  try {
    const r = await fn();
    showToast(typeof ok === 'function' ? ok(r) : ok, 'success');
    return r;
  } catch (error) {
    showToast(error instanceof Error ? error.message : fail, 'error');
    return false;
  }
}

export const openDispute = (vendorOrderId: number, body: { reason: DisputeReason; description: string; requestedOutcome?: string; attachments: string[] }) =>
  attempt(() => api.post<Dispute>(`/api/orders/vendor-orders/${vendorOrderId}/disputes`, body),
    'Dispute opened. The seller’s payment is on hold and the seller has 48 hours to respond.', 'Unable to open the dispute');
export const getDisputesForPart = (vendorOrderId: number) => api.get<Dispute[]>(`/api/orders/vendor-orders/${vendorOrderId}/disputes`);
export const getMyDisputes = () => api.get<Dispute[]>('/api/disputes/mine');
export const getDispute = (id: number) => api.get<Dispute>(`/api/disputes/${id}`);
export const addDisputeMessage = (id: number, message: string, attachments: string[]) =>
  attempt(() => api.post<Dispute>(`/api/disputes/${id}/messages`, { message, attachments }), 'Sent.', 'Unable to send');
export const withdrawDispute = (id: number, note?: string) =>
  attempt(() => api.post<Dispute>(`/api/disputes/${id}/withdraw`, { note }), 'Dispute withdrawn.', 'Unable to withdraw');

export const cancelPaidPart = (vendorOrderId: number, reason: string) =>
  attempt(() => api.post<AdjustmentResult>(`/api/orders/vendor-orders/${vendorOrderId}/cancel-paid`, { reason }),
    (r) => r.message, 'Unable to cancel');
export const reportShortfall = (vendorOrderId: number, items: { orderItemId: number; availableQuantity: number }[], note?: string) =>
  attempt(() => api.post<AdjustmentResult>(`/api/orders/vendor-orders/${vendorOrderId}/shortfall`, { items, note }),
    (r) => r.message, 'Unable to record the shortfall');

export const adminListDisputes = (status?: string) =>
  api.get<Dispute[]>(`/api/admin/disputes${status ? `?status=${encodeURIComponent(status)}` : ''}`);
export const adminResolveDispute = (id: number, body: { outcome: DisputeOutcome; amount?: number; deliveryPortion?: number; note?: string }) =>
  attempt(() => api.post<Dispute>(`/api/admin/disputes/${id}/resolve`, body), 'Decision recorded. Both sides have been told.', 'Unable to record the decision');
