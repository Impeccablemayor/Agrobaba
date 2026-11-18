import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPayoutHistory, getPayoutQueue, releasePayout, voidPayout } from '../../lib/payouts';
import { getPendingSettlements, recordSettlement } from '../../lib/settlements';

export function usePayoutQueue(enabled = true) {
  return useQuery({ queryKey: ['admin', 'payouts', 'queue'], queryFn: getPayoutQueue, enabled, staleTime: 15 * 1000 });
}

export function usePayoutHistory(page: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'payouts', 'history', page],
    queryFn: () => getPayoutHistory(page),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
}

function useInvalidatePayouts() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    void qc.invalidateQueries({ queryKey: ['orders', 'sales', 'earnings'] });
  };
}

export function useReleasePayout() {
  const invalidate = useInvalidatePayouts();
  return useMutation({ mutationFn: releasePayout, onSuccess: (r) => { if (r) invalidate(); } });
}

export function useVoidPayout() {
  const invalidate = useInvalidatePayouts();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => voidPayout(id, reason),
    onSuccess: (r) => { if (r) invalidate(); },
  });
}

export function usePendingSettlements(enabled = true) {
  return useQuery({ queryKey: ['admin', 'payouts', 'settlements'], queryFn: getPendingSettlements, enabled, staleTime: 15 * 1000 });
}

export function useRecordSettlement() {
  const invalidate = useInvalidatePayouts();
  return useMutation({ mutationFn: recordSettlement, onSuccess: (r) => { if (r) invalidate(); } });
}
