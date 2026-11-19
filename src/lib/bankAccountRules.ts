/** Payout bank account types and pure rules (no API client, so they can be unit tested). */

export type BankAccountStatus = 'NEEDS_CONFIRMATION' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REPLACED';

export interface BankOption { code: string; name: string }

export interface BankList { available: boolean; banks: BankOption[] }

export interface BankAccountView {
  id: number;
  bankCode: string | null;
  bankName: string;
  maskedNumber: string;
  accountName: string | null;
  nameMatch: 'MATCH' | 'MISMATCH' | 'UNCHECKED';
  status: BankAccountStatus;
  source: 'SELLER' | 'LEGACY';
  verificationMethod: 'FLUTTERWAVE' | 'ADMIN' | null;
  verifiedAt: string | null;
  coolingOffUntil: string | null;
  reviewReason: string | null;
  reviewNote: string | null;
  createdAt: string;
  replacedAt: string | null;
}

export interface PayoutReadiness {
  identityVerified: boolean;
  account: BankAccountView | null;
  ready: boolean;
  blockers: string[];
}

export interface BankAccountEvent {
  id: number;
  accountId: number | null;
  event: string;
  actor: string;
  details: string | null;
  createdAt: string;
}

export interface MyPayoutAccount {
  readiness: PayoutReadiness;
  coolingOffHours: number;
  lookupAvailable: boolean;
  history: BankAccountView[];
  events: BankAccountEvent[];
}

export interface ResolveResult {
  found: boolean;
  lookupAvailable: boolean;
  accountName: string | null;
  matchesYou: boolean;
  message: string;
}

export interface BankReviewItem {
  account: BankAccountView;
  sellerId: number;
  sellerName: string | null;
  businessName: string | null;
  sellerEmail: string | null;
  role: string | null;
  identityVerified: boolean;
  sameNumberSellerIds: number[];
}

export interface SellerBankAccounts {
  sellerId: number;
  sellerName: string;
  readiness: PayoutReadiness;
  history: BankAccountView[];
  events: BankAccountEvent[];
}

export interface RevealResult { accountNumber: string; bankName: string | null; accountName: string | null }

export const BANK_STATUS_LABELS: Record<BankAccountStatus, string> = {
  NEEDS_CONFIRMATION: 'Please confirm',
  PENDING_REVIEW: 'Being checked by AgroBaba',
  VERIFIED: 'Confirmed',
  REJECTED: 'Not accepted',
  REPLACED: 'Replaced',
};

export const BANK_STATUS_CHIP: Record<BankAccountStatus, string> = {
  NEEDS_CONFIRMATION: 'chip-pending',
  PENDING_REVIEW: 'chip-pending',
  VERIFIED: 'chip-success',
  REJECTED: 'chip-danger',
  REPLACED: 'chip-neutral',
};

export const BANK_EVENT_LABELS: Record<string, string> = {
  ADDED: 'Account added',
  CHANGED: 'Account changed',
  VERIFIED: 'Confirmed',
  SENT_FOR_REVIEW: 'Sent to AgroBaba for checking',
  REJECTED: 'Not accepted',
  REPLACED: 'Replaced by a new account',
  IMPORTED: 'Moved from your verification form',
  PAID_TO: 'Payout sent',
  FULL_NUMBER_VIEWED: 'Full number viewed by admin',
  LEGACY_DETAILS_DISCARDED: 'Old bank details ignored',
};

/** True while the account is still inside its cooling-off period. */
export function inCoolingOff(a: BankAccountView | null | undefined, now = Date.now()): boolean {
  return !!a?.coolingOffUntil && new Date(a.coolingOffUntil).getTime() > now;
}

/** What the seller still has to do before they can be paid, in their words (null when ready). */
export function sellerPayoutHint(r: Pick<PayoutReadiness, 'ready' | 'identityVerified' | 'account'>, now = Date.now()): string | null {
  if (r.ready) return null;
  if (!r.identityVerified) return 'Verify your ID first.';
  const a = r.account;
  if (!a) return 'Add the bank account we should pay you into.';
  if (a.status === 'NEEDS_CONFIRMATION') return 'Please confirm your bank account.';
  if (a.status === 'PENDING_REVIEW') return 'Our team is checking your bank account.';
  if (inCoolingOff(a, now)) return 'Your bank account was added or changed recently, so payouts are paused for a short safety period.';
  return 'Your payout account needs attention.';
}

/** Only digits, at most 10 (Nigerian NUBAN). */
export function cleanAccountNumber(v: string): string {
  return v.replace(/\D/g, '').slice(0, 10);
}
