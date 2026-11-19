import { api } from './api';
import { showToast } from './toastBus';

/** Batch 3 double-entry ledger (admin only). Balances are in each account's normal direction:
 *  money AgroBaba holds or is owed (assets), owes (liabilities), earned (revenue) or spent (expenses). */

export interface LedgerAccountBalance {
  id: number;
  code: string;
  name: string;
  accountType: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE';
  ownerType: 'PLATFORM' | 'SELLER' | 'INFLUENCER';
  ownerId: number | null;
  ownerName: string | null;
  allowNegative: boolean;
  balance: number;
}

export interface LedgerEntryView {
  id: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  ownerType: string;
  ownerId: number | null;
  direction: 'D' | 'C';
  amount: number;
  orderId: number | null;
  vendorOrderId: number | null;
  sellerId: number | null;
}

export interface LedgerTransactionView {
  id: number;
  reference: string;
  type: string;
  description: string | null;
  orderId: number | null;
  invoiceNumber: string | null;
  paymentId: number | null;
  refundId: number | null;
  payoutId: number | null;
  influencerPayoutId: number | null;
  reversesTransactionId: number | null;
  createdBy: string;
  occurredAt: string;
  createdAt: string;
  amount: number;
  balanced: boolean;
  entries: LedgerEntryView[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface LedgerSummary {
  from: string;
  to: string;
  byType: { type: string; transactions: number; amount: number }[];
  byAccount: { code: string; name: string; ownerType: string; debits: number; credits: number }[];
  unbalancedTransactions: number;
}

export interface SellerReconciliation {
  sellerId: number;
  sellerName: string | null;
  vendorOrderId: number | null;
  vendorOrderNumber: string | null;
  commissionRate: number | null;
  expectedNet: number;
  expectedHeld: number;
  expectedUnderDispute: number;
  expectedAvailable: number;
  expectedRecovery: number;
  expectedCommission: number;
  held: number;
  underDispute: number;
  available: number;
  recovery: number;
  commission: number;
  agroBabaDelivery: number;
  promotion: number;
  paidOut: number;
  buyerPaidNetOfRefunds: number;
  matches: boolean;
}

export interface OrderReconciliation {
  orderId: number;
  invoiceNumber: string;
  paymentId: number | null;
  paymentStatus: string | null;
  requiresReview: boolean;
  settlementStatus: string | null;
  paymentAmount: number | null;
  refunded: number;
  collectionFee: number;
  gatewayFee: number;
  inClearing: number;
  unallocated: number;
  influencerCommission: number;
  sellers: SellerReconciliation[];
  checks: { name: string; ok: boolean; detail: string }[];
  reconciled: boolean;
  transactions: LedgerTransactionView[];
}

export interface BackfillResult {
  orders: number;
  transactionsPosted: number;
  errors: string[];
}

export interface TransactionFilters {
  orderId?: string;
  sellerId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
}

/** Plain-language names for the ledger's transaction types. */
export const TXN_TYPE_LABELS: Record<string, string> = {
  PAYMENT_VERIFIED: 'Payment verified',
  PAYMENT_ALLOCATION: 'Payment allocated',
  REALLOCATION: 'Reallocation',
  SETTLEMENT: 'Settled by Flutterwave',
  SETTLEMENT_REVERSAL: 'Settlement reverted',
  REFUND: 'Refund approved',
  REFUND_PAID: 'Refund paid',
  SELLER_PAYOUT: 'Seller payout',
  SELLER_PAYOUT_REVERSAL: 'Seller payout reversed',
  INFLUENCER_PAYOUT: 'Influencer payout',
  INFLUENCER_PAYOUT_REVERSAL: 'Influencer payout reversed',
};

export const ACCOUNT_TYPE_LABELS: Record<LedgerAccountBalance['accountType'], string> = {
  ASSET: 'Held / owed to AgroBaba',
  LIABILITY: 'Owed by AgroBaba',
  REVENUE: 'Revenue',
  EXPENSE: 'Expense',
};

const query = (f: TransactionFilters) => {
  const p = new URLSearchParams();
  if (f.orderId?.trim()) p.set('orderId', f.orderId.trim());
  if (f.sellerId?.trim()) p.set('sellerId', f.sellerId.trim());
  if (f.type) p.set('type', f.type);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  p.set('page', String(f.page ?? 0));
  p.set('size', '25');
  return p.toString();
};

export const getLedgerAccounts = () => api.get<LedgerAccountBalance[]>('/api/admin/finance/ledger/accounts');
export const getLedgerTransactions = (f: TransactionFilters) =>
  api.get<Page<LedgerTransactionView>>(`/api/admin/finance/ledger/transactions?${query(f)}`);
export const getLedgerSummary = (from?: string, to?: string) => {
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  return api.get<LedgerSummary>(`/api/admin/finance/ledger/summary?${p.toString()}`);
};
export const getOrderReconciliation = (orderId: number) =>
  api.get<OrderReconciliation>(`/api/admin/finance/ledger/orders/${orderId}`);

export async function syncOrderLedger(orderId: number): Promise<OrderReconciliation | false> {
  try {
    const r = await api.post<OrderReconciliation>(`/api/admin/finance/ledger/orders/${orderId}/sync`, {});
    showToast('Ledger brought up to date for this order.', 'success');
    return r;
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Unable to sync this order', 'error');
    return false;
  }
}

export async function backfillLedger(): Promise<BackfillResult | false> {
  try {
    const r = await api.post<BackfillResult>('/api/admin/finance/ledger/backfill', {});
    showToast(r.errors.length ? `Posted ${r.transactionsPosted}; ${r.errors.length} order(s) need attention.`
      : `Ledger up to date: ${r.transactionsPosted} transaction(s) posted.`, r.errors.length ? 'error' : 'success');
    return r;
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Unable to run the backfill', 'error');
    return false;
  }
}

/** The fees AgroBaba currently charges (any signed-in user). */
export interface FeeConfig {
  commissionPercent: number;
  buyerCollectionPercent: number;
  buyerCollectionFixed: number;
  buyerCollectionCap: number;
  sellerTransferFee: number;
  sellerTransferFeeBearer: 'PLATFORM' | 'SELLER';
}

export const getFees = () => api.get<FeeConfig>('/api/fees');
