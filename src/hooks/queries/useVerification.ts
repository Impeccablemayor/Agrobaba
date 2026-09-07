import { useQuery } from '@tanstack/react-query';
import { getMyVerificationStatus } from '../../lib/verification';
import type { VerificationStatusInfo } from '../../types';

export function useMyVerificationStatus(enabled = true) {
  return useQuery<VerificationStatusInfo | null>({
    queryKey: ['verification', 'me'],
    queryFn: () => getMyVerificationStatus(),
    enabled,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}