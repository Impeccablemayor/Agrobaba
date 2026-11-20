import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveBankAccount, confirmLegacyBankAccount, getBankReviewQueue, getBanks, getMyPayoutAccount, getSellerBankAccounts,
  recheckBankAccount, recheckLegacyBankAccounts, rejectBankAccount, saveBankAccount,
} from '../../lib/bankAccounts';

export function useBanks(enabled = true) {
  return useQuery({ queryKey: ['banks'], queryFn: getBanks, enabled, staleTime: 6 * 60 * 60 * 1000 });
}

export function useMyPayoutAccount(enabled = true) {
  return useQuery({ queryKey: ['payout-account'], queryFn: getMyPayoutAccount, enabled, staleTime: 15 * 1000 });
}

export function useSaveBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bankCode, accountNumber }: { bankCode: string; accountNumber: string }) => saveBankAccount(bankCode, accountNumber),
    onSuccess: (r) => { if (r) void qc.invalidateQueries({ queryKey: ['payout-account'] }); },
  });
}

export function useConfirmLegacyBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bankCode }: { id: number; bankCode: string }) => confirmLegacyBankAccount(id, bankCode),
    onSuccess: (r) => { if (r) void qc.invalidateQueries({ queryKey: ['payout-account'] }); },
  });
}

export function useBankReviewQueue(enabled = true) {
  return useQuery({ queryKey: ['admin', 'bank-accounts', 'review'], queryFn: getBankReviewQueue, enabled, staleTime: 15 * 1000 });
}

export function useSellerBankAccounts(sellerId: number | null) {
  return useQuery({ queryKey: ['admin', 'bank-accounts', 'seller', sellerId], queryFn: () => getSellerBankAccounts(sellerId!), enabled: sellerId != null });
}

/** Admin decisions on an account; refreshes the review queue, seller panels and the payout queue. */
export function useBankAccountDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: 'approve' | 'reject' | 'recheck'; note?: string }) =>
      action === 'approve' ? approveBankAccount(id, note) : action === 'reject' ? rejectBankAccount(id, note ?? '') : recheckBankAccount(id),
    onSuccess: (r) => {
      if (!r) return;
      void qc.invalidateQueries({ queryKey: ['admin', 'bank-accounts'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    },
  });
}

export function useRecheckLegacyBankAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recheckLegacyBankAccounts,
    onSuccess: (r) => { if (r) void qc.invalidateQueries({ queryKey: ['admin', 'bank-accounts'] }); },
  });
}
