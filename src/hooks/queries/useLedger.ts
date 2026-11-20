import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  backfillLedger, getFees, getLedgerAccounts, getLedgerSummary, getLedgerTransactions, getOrderReconciliation,
  syncOrderLedger, type TransactionFilters,
} from '../../lib/ledger';

export function useLedgerAccounts(enabled = true) {
  return useQuery({ queryKey: ['admin', 'ledger', 'accounts'], queryFn: getLedgerAccounts, enabled, staleTime: 15 * 1000 });
}

export function useLedgerTransactions(filters: TransactionFilters, enabled = true) {
  return useQuery({ queryKey: ['admin', 'ledger', 'transactions', filters], queryFn: () => getLedgerTransactions(filters), enabled, staleTime: 15 * 1000 });
}

export function useLedgerSummary(from: string, to: string, enabled = true) {
  return useQuery({ queryKey: ['admin', 'ledger', 'summary', from, to], queryFn: () => getLedgerSummary(from, to), enabled, staleTime: 15 * 1000 });
}

export function useOrderReconciliation(orderId: number | null) {
  return useQuery({ queryKey: ['admin', 'ledger', 'order', orderId], queryFn: () => getOrderReconciliation(orderId!), enabled: orderId != null, retry: false });
}

export function useSyncOrderLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => syncOrderLedger(orderId),
    onSuccess: (r) => { if (r) void qc.invalidateQueries({ queryKey: ['admin', 'ledger'] }); },
  });
}

export function useBackfillLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: backfillLedger,
    onSuccess: (r) => { if (r) void qc.invalidateQueries({ queryKey: ['admin', 'ledger'] }); },
  });
}

/** Configured fees - rarely change, so cached for a while. */
export function useFees(enabled = true) {
  return useQuery({ queryKey: ['fees'], queryFn: getFees, enabled, staleTime: 10 * 60 * 1000 });
}
