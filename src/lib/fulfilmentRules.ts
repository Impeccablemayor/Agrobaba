/** Batch 5: how one seller's part of an order (vendor order) is described to buyers, sellers and
 *  admins. Pure (no API client) so it can be unit tested. */

export type FulfilmentStage =
  | 'UNPAID' | 'AWAITING_DISPATCH' | 'IN_TRANSIT' | 'AWAITING_RECEIPT' | 'INSPECTION' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export type Viewer = 'buyer' | 'seller' | 'admin';

export interface FulfilmentFields {
  fulfilmentStage?: FulfilmentStage | null;
  autoConfirmAt?: string | null;
  inspectionEndsAt?: string | null;
  receiptMethod?: string | null;
  completionMethod?: string | null;
  onHold?: boolean;
}

export interface StageDescription {
  label: string;
  /** One plain sentence: what happens next, with the relevant date. */
  detail: string | null;
  tone: 'neutral' | 'pending' | 'success' | 'danger';
}

/** "20 Nov, 2:30 pm" in the viewer's local time. */
export function shortDateTime(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

const RECEIPT_WORDS: Record<string, string> = {
  BUYER_CONFIRMATION: 'confirmed by the buyer',
  COLLECTED: 'collected by the buyer',
  DELIVERY_OTP: 'delivered with the buyer’s code',
  ADMIN_OVERRIDE: 'confirmed by AgroBaba',
  AUTO_CONFIRMED: 'confirmed automatically',
  MIGRATED: 'confirmed',
};

export function describeStage(v: FulfilmentFields, viewer: Viewer): StageDescription {
  const until = shortDateTime(v.inspectionEndsAt);
  switch (v.fulfilmentStage) {
    case 'UNPAID':
      return { label: 'Awaiting payment', detail: null, tone: 'neutral' };
    case 'CANCELLED':
      return { label: 'Cancelled', detail: null, tone: 'neutral' };
    case 'AWAITING_DISPATCH':
      return { label: 'Being prepared', detail: viewer === 'seller' ? 'Send it and add who is delivering it.' : null, tone: 'pending' };
    case 'IN_TRANSIT':
      return { label: 'On its way', detail: null, tone: 'pending' };
    case 'AWAITING_RECEIPT':
      return {
        label: viewer === 'buyer' ? 'Delivered? Please confirm' : 'Delivered - awaiting buyer',
        detail: v.autoConfirmAt
          ? viewer === 'buyer'
            ? `Confirm you received it, or report a problem. Otherwise it is confirmed automatically on ${shortDateTime(v.autoConfirmAt)}.`
            : `Confirmed automatically on ${shortDateTime(v.autoConfirmAt)} if the buyer doesn't respond.`
          : null,
        tone: 'pending',
      };
    case 'INSPECTION':
      return {
        label: viewer === 'buyer' ? 'Check your goods' : 'Buyer inspecting',
        detail: viewer === 'buyer'
          ? `You have until ${until} to report a problem. After that the seller is paid.`
          : viewer === 'seller'
            ? `Received (${RECEIPT_WORDS[v.receiptMethod ?? ''] ?? 'confirmed'}). Your money is released after ${until} if no problem is reported.`
            : `Received (${RECEIPT_WORDS[v.receiptMethod ?? ''] ?? 'confirmed'}); inspection until ${until}.`,
        tone: 'pending',
      };
    case 'ON_HOLD':
      return {
        label: 'On hold',
        detail: viewer === 'buyer'
          ? 'You reported a problem. The AgroBaba team is looking into it.'
          : viewer === 'seller'
            ? 'The buyer reported a problem. Your payment for this order is paused while AgroBaba looks into it.'
            : 'Payout frozen until an admin releases the hold or completes the order.',
        tone: 'danger',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        detail: viewer === 'seller' ? 'Inspection is over. AgroBaba can now release your money.' : null,
        tone: 'success',
      };
    default:
      return { label: '', detail: null, tone: 'neutral' };
  }
}

/** Buyer may tap "Everything is fine" (ends inspection early). */
export const canAccept = (v: FulfilmentFields) => v.fulfilmentStage === 'INSPECTION' && !v.onHold;

/** Buyer may report a problem: after dispatch and before completion, once. */
export const canReportProblem = (v: FulfilmentFields) =>
  v.fulfilmentStage === 'IN_TRANSIT' || v.fulfilmentStage === 'AWAITING_RECEIPT' || v.fulfilmentStage === 'INSPECTION';
