import { api } from './api';
import { showToast } from './toastBus';
import type { VendorOrderView } from '../types';

export * from './fulfilmentRules';

/** Batch 5 actions on one seller's part of an order. */

export interface VendorOrderEventView {
  id: number;
  event: string;
  actor: string | null;
  details: string | null;
  createdAt: string;
}

export interface InspectionPolicyRow {
  categoryId: number;
  code: string;
  name: string;
  parentId: number | null;
  level: number;
  ownHours: number | null;
  effectiveHours: number;
  inheritedFrom: string | null;
  note: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export const EVENT_LABELS: Record<string, string> = {
  DISPATCHED: 'Sent',
  DELIVERY_CLAIMED: 'Seller recorded delivery',
  RECEIPT_REMINDER: 'Buyer reminded to confirm receipt',
  RECEIVED: 'Receipt confirmed',
  INSPECTION_REMINDER: 'Buyer reminded inspection is ending',
  PROBLEM_REPORTED: 'Buyer reported a problem',
  HELD_BY_ADMIN: 'Put on hold by AgroBaba',
  HOLD_RELEASED: 'Hold released',
  COMPLETED: 'Completed',
};

async function attempt<T>(fn: () => Promise<T>, ok: string, fail: string): Promise<T | false> {
  try {
    const r = await fn();
    showToast(ok, 'success');
    return r;
  } catch (error) {
    showToast(error instanceof Error ? error.message : fail, 'error');
    return false;
  }
}

export const acceptVendorOrder = (id: number) =>
  attempt(() => api.post<VendorOrderView>(`/api/orders/vendor-orders/${id}/accept`, {}), 'Thank you! The seller will be paid.', 'Unable to confirm');
export const reportVendorOrderProblem = (id: number, reason: string) =>
  attempt(() => api.post<VendorOrderView>(`/api/orders/vendor-orders/${id}/report-problem`, { reason }),
    'Problem reported. The seller’s payment is on hold and our team will contact you.', 'Unable to report the problem');
export const getVendorOrderEvents = (id: number) => api.get<VendorOrderEventView[]>(`/api/orders/vendor-orders/${id}/events`);

export const adminHoldVendorOrder = (id: number, reason: string) =>
  attempt(() => api.post<VendorOrderView>(`/api/admin/vendor-orders/${id}/hold`, { reason }), 'Put on hold.', 'Unable to hold');
export const adminReleaseVendorOrder = (id: number, note: string) =>
  attempt(() => api.post<VendorOrderView>(`/api/admin/vendor-orders/${id}/release-hold`, { note }), 'Hold released.', 'Unable to release');
export const adminCompleteVendorOrder = (id: number, reason: string) =>
  attempt(() => api.post<VendorOrderView>(`/api/admin/vendor-orders/${id}/complete`, { reason }), 'Marked complete.', 'Unable to complete');

export const getInspectionPolicies = () => api.get<InspectionPolicyRow[]>('/api/admin/inspection-policies');
export const setInspectionPolicy = (categoryId: number, hours: number, note?: string) =>
  attempt(() => api.put<void>(`/api/admin/inspection-policies/${categoryId}`, { hours, note }), 'Inspection period saved.', 'Unable to save');
export const clearInspectionPolicy = (categoryId: number) =>
  attempt(() => api.delete<void>(`/api/admin/inspection-policies/${categoryId}`), 'Using the inherited period again.', 'Unable to reset');
