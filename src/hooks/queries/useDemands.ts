import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDemandById, getDemands, getMyDemands, type DemandFilters } from '../../lib/demands';
import type { Demand } from '../../types';

export interface DemandQueryParams extends DemandFilters {
  page?: number;
  size?: number;
}

export function useDemands(params: DemandQueryParams = {}) {
  const page = params.page ?? 1;
  const size = params.size ?? 20;

  return useQuery<Demand[]>({
    queryKey: ['demands', { ...params, page, size }],
    queryFn: ({ signal }) => getDemands(params, signal),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useDemand(id?: string) {
  const queryClient = useQueryClient();

  return useQuery<Demand | null>({
    queryKey: ['demands', 'detail', id],
    queryFn: () => (id ? getDemandById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: () => {
      if (!id) return undefined;
      const cachedQueries = queryClient.getQueriesData<Demand[]>({ queryKey: ['demands'] });
      for (const [, list] of cachedQueries) {
        if (Array.isArray(list)) {
          const match = list.find((d) => d.id === id);
          if (match) return match;
        }
      }
      return undefined;
    },
  });
}

export function useMyDemands() {
  return useQuery<Demand[]>({
    queryKey: ['demands', 'me'],
    queryFn: () => getMyDemands(),
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
