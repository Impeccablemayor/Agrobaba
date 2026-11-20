/** Batch 6: disputes, cancelling a paid part and quantity shortfalls - labels and the checks the forms
 *  make before calling the API. The backend enforces every rule again; these only give fast, plain
 *  feedback. Pure (no API client) so it can be unit tested. */
import type { FulfilmentFields } from './fulfilmentRules';

export type DisputeReason = 'NOT_RECEIVED' | 'DAMAGED' | 'WRONG_ITEM' | 'MISSING_ITEMS' | 'QUALITY' | 'OTHER';
export type DisputeStatus = 'AWAITING_SELLER' | 'UNDER_REVIEW' | 'RESOLVED' | 'WITHDRAWN';
export type DisputeOutcome = 'FULL_REFUND' | 'PARTIAL_REFUND' | 'RELEASE_TO_SELLER' | 'SELLER_REFUNDED_DIRECTLY' | 'OTHER';
export type DisputeRole = 'buyer' | 'seller' | 'admin';

export const REASON_LABELS: Record<DisputeReason, string> = {
  NOT_RECEIVED: 'I didn’t receive it',
  DAMAGED: 'Damaged or spoilt',
  WRONG_ITEM: 'Wrong item',
  MISSING_ITEMS: 'Items missing',
  QUALITY: 'Poor quality / not as described',
  OTHER: 'Something else',
};

export const REQUESTED_OUTCOMES = [
  { value: 'FULL_REFUND', label: 'A full refund' },
  { value: 'PARTIAL_REFUND', label: 'A partial refund' },
  { value: 'REPLACEMENT', label: 'A replacement' },
] as const;

export const OUTCOME_LABELS: Record<DisputeOutcome, string> = {
  FULL_REFUND: 'Full refund to the buyer',
  PARTIAL_REFUND: 'Partial refund to the buyer',
  RELEASE_TO_SELLER: 'Released to the seller',
  SELLER_REFUNDED_DIRECTLY: 'Seller refunded the buyer directly',
  OTHER: 'Other resolution',
};

export const isOpenDispute = (s: DisputeStatus) => s === 'AWAITING_SELLER' || s === 'UNDER_REVIEW';

export function statusLabel(s: DisputeStatus, role: DisputeRole): string {
  switch (s) {
    case 'AWAITING_SELLER':
      return role === 'seller' ? 'Your response needed' : 'Waiting for the seller';
    case 'UNDER_REVIEW':
      return 'AgroBaba is reviewing';
    case 'RESOLVED':
      return 'Decided';
    case 'WITHDRAWN':
      return 'Withdrawn';
  }
}

/** A buyer opens a dispute once the part has been sent, and before it is completed. */
export const canOpenDispute = (v: FulfilmentFields) =>
  !v.onHold && (v.fulfilmentStage === 'IN_TRANSIT' || v.fulfilmentStage === 'AWAITING_RECEIPT' || v.fulfilmentStage === 'INSPECTION');

/** Before it is sent, the buyer cancels a paid part (full refund) and the seller can report a
 *  shortfall. Both need the part paid, not on hold and still being prepared. */
export const canChangeBeforeDispatch = (v: FulfilmentFields) => v.fulfilmentStage === 'AWAITING_DISPATCH' && !v.onHold;

export const MAX_ATTACHMENTS = 4;
/** PDFs are sent as-is; the backend caps each attachment at 8 MB of text (about 6 MB of file). */
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** Error for an evidence file the backend would refuse, or null. Photos are resized before upload. */
export function evidenceFileError(type: string, size: number): string | null {
  if (type === 'application/pdf') return size > MAX_PDF_BYTES ? 'PDFs must be 5 MB or smaller.' : null;
  if (type.startsWith('image/')) return null;
  return 'Add photos (JPEG, PNG, WebP) or a PDF.';
}

const naira = (n: number) => `₦${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export interface ResolveInput {
  outcome: DisputeOutcome;
  amount?: number | null;
  deliveryPortion?: number | null;
  note?: string;
  refundable: number;
  refundableDelivery: number;
  sellerPaidOut: boolean;
}

/** The outcomes an admin can choose. Once the seller has been paid, AgroBaba no longer holds the
 *  money, so it can't refund from the platform (founder decision, 19 Nov 2026). */
export function allowedOutcomes(sellerPaidOut: boolean): DisputeOutcome[] {
  return sellerPaidOut
    ? ['SELLER_REFUNDED_DIRECTLY', 'OTHER']
    : ['FULL_REFUND', 'PARTIAL_REFUND', 'RELEASE_TO_SELLER', 'OTHER'];
}

/** Error for an admin decision the backend would refuse, or null. */
export function resolveError(r: ResolveInput): string | null {
  if (!allowedOutcomes(r.sellerPaidOut).includes(r.outcome)) {
    return r.sellerPaidOut ? 'This seller has already been paid, so AgroBaba can’t refund from the platform.'
      : 'The seller hasn’t been paid yet - refund from the platform instead.';
  }
  const note = (r.note ?? '').trim();
  if (r.outcome === 'FULL_REFUND' && r.refundable <= 0) return 'Nothing is left to refund on this part.';
  if (r.outcome === 'PARTIAL_REFUND') {
    const amount = r.amount ?? 0;
    const delivery = r.deliveryPortion ?? 0;
    if (!(amount > 0)) return 'Enter the amount to refund.';
    if (amount > r.refundable) return `At most ${naira(r.refundable)} can be refunded on this part.`;
    if (delivery < 0) return 'The delivery part can’t be negative.';
    if (delivery > amount) return 'The delivery part can’t be more than the refund.';
    if (delivery > r.refundableDelivery) return `At most ${naira(r.refundableDelivery)} of delivery fee is left to refund.`;
  }
  if ((r.outcome === 'SELLER_REFUNDED_DIRECTLY' || r.outcome === 'OTHER') && note.length < 5) {
    return r.outcome === 'OTHER' ? 'Describe the resolution.' : 'Record how the seller refunded the buyer (amount, date, reference).';
  }
  return null;
}

export type ShortfallReason = 'OUT_OF_STOCK' | 'SPOILT_BEFORE_SENDING' | 'HARVEST_SMALLER' | 'OTHER';

/** The seller picks one; the buyer sees it (founder decision, 20 Nov 2026). */
export const SHORTFALL_REASONS: Record<ShortfallReason, string> = {
  OUT_OF_STOCK: 'Out of stock',
  SPOILT_BEFORE_SENDING: 'Spoilt or damaged before sending',
  HARVEST_SMALLER: 'Harvest smaller than expected',
  OTHER: 'Other reason',
};

/** Error for the reason/note, or null. "Other" needs a short note. */
export function shortfallReasonError(reason: ShortfallReason | '', note: string): string | null {
  if (reason === '') return 'Choose why you can’t supply it.';
  if (reason === 'OTHER' && note.trim().length < 5) return 'Say briefly why you can’t supply it.';
  return null;
}

/** "1 of 5 not supplied: Spoilt or damaged before sending - "two crates got wet"". */
export function describeShortfall(it: { quantity: number; shortfallQuantity?: number; shortfallReason?: string | null; shortfallNote?: string | null }): string | null {
  const short = it.shortfallQuantity ?? 0;
  if (short <= 0) return null;
  const label = it.shortfallReason ? SHORTFALL_REASONS[it.shortfallReason as ShortfallReason] : null;
  return `${short} of ${it.quantity} not supplied (refunded)` + (label ? `: ${label}` : '') + (it.shortfallNote ? ` - “${it.shortfallNote}”` : '');
}

export interface ShortfallItem { id: string; quantity: number; shortfallQuantity?: number }

/** Lines whose available quantity changed, ready for the API, or an error. `available` maps an
 *  order item id to what the seller can still supply. */
export function shortfallLines(items: ShortfallItem[], available: Record<string, string>):
  { lines: { orderItemId: number; availableQuantity: number }[]; error: string | null } {
  const lines: { orderItemId: number; availableQuantity: number }[] = [];
  for (const it of items) {
    const raw = available[it.id];
    if (raw === undefined || raw.trim() === '') continue;
    const n = Number(raw);
    const current = it.quantity - (it.shortfallQuantity ?? 0);
    if (!Number.isInteger(n) || n < 0) return { lines: [], error: 'Enter whole numbers (0 or more).' };
    if (n > current) return { lines: [], error: `You can supply at most ${current} - the quantity ordered.` };
    if (n < current) lines.push({ orderItemId: Number(it.id), availableQuantity: n });
  }
  return { lines, error: lines.length === 0 ? 'Lower the quantity you can supply on at least one item.' : null };
}
