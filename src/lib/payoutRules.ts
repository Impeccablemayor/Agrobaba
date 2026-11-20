/** Batch 7: automatic seller payouts - how statuses and the safety gates are explained to admins.
 *  The backend enforces every rule; this only words it. Pure, so it can be unit tested. */

export type PayoutStatus =
  | 'PENDING_APPROVAL' | 'QUEUED' | 'SUBMITTING' | 'PROCESSING' | 'UNKNOWN'
  | 'RELEASED' | 'FAILED' | 'CANCELLED' | 'VOIDED';

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING_APPROVAL: 'Waiting for approval',
  QUEUED: 'Approved - sending next',
  SUBMITTING: 'Sending',
  PROCESSING: 'With Flutterwave',
  UNKNOWN: 'Checking with Flutterwave',
  RELEASED: 'Paid',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  VOIDED: 'Voided',
};

export const PAYOUT_STATUS_TONE: Record<PayoutStatus, 'neutral' | 'pending' | 'success' | 'danger'> = {
  PENDING_APPROVAL: 'pending', QUEUED: 'pending', SUBMITTING: 'pending', PROCESSING: 'pending', UNKNOWN: 'danger',
  RELEASED: 'success', FAILED: 'danger', CANCELLED: 'neutral', VOIDED: 'neutral',
};

/** Only a payout that hasn't been sent can be stopped; once sent, Flutterwave's answer settles it. */
export const canCancelPayout = (s: PayoutStatus) => s === 'PENDING_APPROVAL' || s === 'QUEUED';

/** Large payouts are never approved with the batch: each needs its own tap. */
export const needsOwnApproval = (p: { status: PayoutStatus; approvalReason: string | null }) =>
  p.status === 'PENDING_APPROVAL' && p.approvalReason === 'LARGE_AMOUNT';

export interface PayoutGates {
  transfersEnabled: boolean;
  providerConfigured: boolean;
  liveKey: boolean;
  liveApproved: boolean;
  paused: boolean;
  pauseReason: string | null;
  mode: 'APPROVAL' | 'AUTOMATIC';
  approvalThreshold: number;
  minimum: number;
}

export interface GateLine {
  label: string;
  ok: boolean;
  detail: string;
}

/** Each condition for money to move, in plain words, in the order they apply. */
export function gateLines(g: PayoutGates): GateLine[] {
  return [
    { label: 'Switched on for this server', ok: g.transfersEnabled,
      detail: g.transfersEnabled ? 'PAYOUT_TRANSFERS_ENABLED is on.' : 'Off (PAYOUT_TRANSFERS_ENABLED). Sellers are paid manually from the Flutterwave dashboard.' },
    { label: 'Flutterwave connected', ok: g.providerConfigured, detail: g.providerConfigured ? (g.liveKey ? 'LIVE keys (real money).' : 'TEST keys (sandbox, no real money).') : 'No Flutterwave keys on the server.' },
    { label: 'Live payouts approved', ok: !g.liveKey || g.liveApproved,
      detail: !g.liveKey ? 'Not needed with test keys.'
        : g.liveApproved ? 'PAYOUT_LIVE_APPROVED is on.'
          : 'Needed before real transfers: Flutterwave’s written confirmation, the legal review, the payout arrangement and transfer permissions (PAYOUT_LIVE_APPROVED).' },
    { label: 'Not paused', ok: !g.paused, detail: g.paused ? `Paused${g.pauseReason ? `: ${g.pauseReason}` : ''}.` : 'Running.' },
  ];
}

/** True when transfers can actually be sent right now. */
export const canSendNow = (g: PayoutGates) => gateLines(g).every((l) => l.ok);

/** "AGR-123 / seller #5: reason" lines from a batch's skipped text. */
export function skippedLines(skipped: string | null): string[] {
  return (skipped ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
}
