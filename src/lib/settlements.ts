import { api } from './api';
import { showToast } from './toastBus';

/** Settlement (GET/POST /api/admin/finance). A verified payment is not yet money AgroBaba can pay
 *  out: Flutterwave settles it into AgroBaba's balance later. The admin matches payments against
 *  the Flutterwave settlement report and records the settlement here; only then do sellers' shares
 *  become available for payout. */

export interface SettlementCandidate {
  paymentId: number;
  orderId: number;
  invoiceNumber: string | null;
  reference: string | null;
  providerTransactionId: string | null;
  paymentStatus: string;
  amountNaira: number;
  gatewayFee: number | null;
  expectedSettlementAmount: number | null;
  paidAt: string | null;
  requiresReview: boolean;
}

export interface SettlementResult {
  paymentsSettled: number;
  totalAmount: number;
  settlementReference: string;
  settledAt: string;
}

export const getPendingSettlements = () => api.get<SettlementCandidate[]>('/api/admin/finance/settlements/pending');

export async function recordSettlement(input: {
  paymentIds: number[];
  settlementReference: string;
  settledAt?: string;
  note?: string;
}): Promise<SettlementResult | false> {
  try {
    const result = await api.post<SettlementResult>('/api/admin/finance/settlements', input);
    showToast(`Settlement recorded for ${result.paymentsSettled} payment${result.paymentsSettled === 1 ? '' : 's'}.`, 'success');
    return result;
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Unable to record settlement', 'error');
    return false;
  }
}
