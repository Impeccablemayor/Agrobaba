import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDemandById, getDemands, getMyDemands, type DemandFilters } from '../../lib/demands';
import type { Demand } from '../../types';

export function useDemands(filters: DemandFilters = {}) {
  return useQuery<Demand[]>({
    queryKey: ['demands', filters],
    queryFn: ({ signal }) => getDemands(filters, signal),
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useDemand(id?: string) {
  return useQuery<Demand | null>({
    queryKey: ['demands', id],
    queryFn: () => (id ? getDemandById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyDemands() {
  return useQuery<Demand[]>({
    queryKey: ['demands', 'me'],
    queryFn: () => getMyDemands(),
    staleTime: 2 * 60 * 1000,
  });
}
