/** Founder decisions (20 Nov 2026): influencer commission is paid once the amount due reaches a minimum
 *  (default N15,000, overridable per influencer), or below it only with a written reason; commission
 *  overpaid before a later refund is taken off the next payout. The backend enforces all of this; this
 *  only explains it on the page. Pure, so it can be unit tested. */

export interface PayoutFigures {
  /** Commission ready to pay. */
  payable: number;
  /** Paid earlier above what refunds now justify, still to take back. */
  overpaid: number;
  /** The minimum that applies to this influencer. */
  minPayout: number;
}

export interface PayoutState {
  /** What the next transfer would send: payable - overpaid. */
  amount: number;
  /** Something can be paid now (with or without a reason). */
  canPay: boolean;
  /** Below the minimum: the admin must give a reason to pay now. */
  reasonNeeded: boolean;
  /** One plain sentence for the admin. */
  message: string;
}

const naira = (n: number) => `₦${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export function payoutState({ payable, overpaid, minPayout }: PayoutFigures): PayoutState {
  const amount = Math.round((payable - overpaid) * 100) / 100;
  if (payable <= 0) {
    return { amount: 0, canPay: false, reasonNeeded: false, message: 'Nothing is ready to pay yet.' };
  }
  if (amount <= 0) {
    return {
      amount: 0, canPay: false, reasonNeeded: false,
      message: `${naira(overpaid)} was overpaid earlier (refunds reduced commission already paid). It is taken off as more commission becomes payable.`,
    };
  }
  const deduction = overpaid > 0 ? ` (${naira(payable)} commission less ${naira(overpaid)} overpaid earlier)` : '';
  if (amount < minPayout) {
    return {
      amount, canPay: true, reasonNeeded: true,
      message: `${naira(amount)}${deduction} is below the ${naira(minPayout)} minimum. It is paid once the balance reaches the minimum, or now if you give a reason.`,
    };
  }
  return { amount, canPay: true, reasonNeeded: false, message: `${naira(amount)} to send${deduction}.` };
}

/** '' means "use the default minimum". Returns the value to send, or an error. */
export function parseMinPayout(raw: string): { value: number | null; error: string | null } {
  const t = raw.trim().replace(/,/g, '');
  if (t === '') return { value: null, error: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: 'Enter an amount of 0 or more.' };
  if (n > 10_000_000) return { value: null, error: 'That minimum is too high.' };
  return { value: Math.round(n * 100) / 100, error: null };
}
