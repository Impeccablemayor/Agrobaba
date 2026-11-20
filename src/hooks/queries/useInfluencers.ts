import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getInfluencer, getInfluencers, getInfluencerSettings, payInfluencer, saveInfluencer, saveInfluencerSettings, voidInfluencerPayout,
  type InfluencerInput,
} from '../../lib/influencers';

export function useInfluencers(enabled = true) {
  return useQuery({ queryKey: ['admin', 'influencers'], queryFn: getInfluencers, enabled, staleTime: 15 * 1000 });
}

export function useInfluencer(id: number | null) {
  return useQuery({ queryKey: ['admin', 'influencers', id], queryFn: () => getInfluencer(id!), enabled: id != null, staleTime: 15 * 1000 });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'influencers'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
  };
}

export function useSaveInfluencer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ input, id }: { input: InfluencerInput; id?: number }) => saveInfluencer(input, id),
    onSuccess: (r) => { if (r) invalidate(); },
  });
}

export function usePayInfluencer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reference, note, belowMinimumReason }: { id: number; reference: string; note?: string; belowMinimumReason?: string }) =>
      payInfluencer(id, reference, note, belowMinimumReason),
    onSuccess: (r) => { if (r) invalidate(); },
  });
}

export function useVoidInfluencerPayout() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ payoutId, reason }: { payoutId: number; reason: string }) => voidInfluencerPayout(payoutId, reason),
    onSuccess: (r) => { if (r) invalidate(); },
  });
}

export function useInfluencerSettings() {
  return useQuery({ queryKey: ['admin', 'influencers', 'settings'], queryFn: getInfluencerSettings, staleTime: 60 * 1000 });
}

export function useSaveInfluencerSettings() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (minPayout: number) => saveInfluencerSettings(minPayout),
    onSuccess: (r) => { if (r) invalidate(); },
  });
}
