import { api } from './api';
import { showToast } from './toastBus';

/** Seller payout bank accounts (Batch 4). Account numbers arrive masked ("******6789"); only the
 *  audited admin reveal returns a full number. */

export * from './bankAccountRules';
import type { BankAccountView, BankList, BankReviewItem, MyPayoutAccount, ResolveResult, RevealResult, SellerBankAccounts } from './bankAccountRules';

async function attempt<T>(fn: () => Promise<T>, ok: string | null, fail: string): Promise<T | false> {
  try {
    const r = await fn();
    if (ok) showToast(ok, 'success');
    return r;
  } catch (error) {
    showToast(error instanceof Error ? error.message : fail, 'error');
    return false;
  }
}

export const getBanks = () => api.get<BankList>('/api/banks');
export const getMyPayoutAccount = () => api.get<MyPayoutAccount>('/api/payout-account');
export const resolveBankAccount = (bankCode: string, accountNumber: string) =>
  attempt(() => api.post<ResolveResult>('/api/payout-account/resolve', { bankCode, accountNumber }), null, 'Unable to check this account');
export const saveBankAccount = (bankCode: string, accountNumber: string) =>
  attempt(() => api.post<BankAccountView>('/api/payout-account', { bankCode, accountNumber }), 'Payout account saved.', 'Unable to save the account');
export const confirmLegacyBankAccount = (id: number, bankCode: string) =>
  attempt(() => api.post<BankAccountView>(`/api/payout-account/${id}/confirm`, { bankCode }), 'Account checked.', 'Unable to check the account');

export const getBankReviewQueue = () => api.get<BankReviewItem[]>('/api/admin/bank-accounts/review');
export const getSellerBankAccounts = (sellerId: number) => api.get<SellerBankAccounts>(`/api/admin/bank-accounts/sellers/${sellerId}`);
export const approveBankAccount = (id: number, note?: string) =>
  attempt(() => api.post<BankAccountView>(`/api/admin/bank-accounts/${id}/approve`, { note }), 'Account approved.', 'Unable to approve');
export const rejectBankAccount = (id: number, note: string) =>
  attempt(() => api.post<BankAccountView>(`/api/admin/bank-accounts/${id}/reject`, { note }), 'Account rejected.', 'Unable to reject');
export const recheckBankAccount = (id: number) =>
  attempt(() => api.post<BankAccountView>(`/api/admin/bank-accounts/${id}/recheck`, {}), 'Checked with the bank.', 'Unable to check');
export const recheckLegacyBankAccounts = () =>
  attempt(() => api.post<{ checked: number; verified: number; sentForReview: number; unavailable: number }>('/api/admin/bank-accounts/recheck-legacy', {}),
    null, 'Unable to re-check');
export const revealBankAccount = (id: number, reason: string) =>
  attempt(() => api.post<RevealResult>(`/api/admin/bank-accounts/${id}/reveal`, { reason }), null, 'Unable to show the number');
export const revealInfluencerBank = (id: number, reason: string) =>
  attempt(() => api.post<RevealResult>(`/api/admin/influencers/${id}/bank-account/reveal`, { reason }), null, 'Unable to show the number');
