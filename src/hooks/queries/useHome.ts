import { useQuery } from '@tanstack/react-query';
import { getMatchingDemands, getRecommendedProducts } from '../../lib/home';

export function useRecommendedProducts() {
  return useQuery({
    queryKey: ['home', 'recommended'],
    queryFn: () => getRecommendedProducts(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMatchingDemands() {
  return useQuery({
    queryKey: ['home', 'matchingDemands'],
    queryFn: () => getMatchingDemands(),
    staleTime: 5 * 60 * 1000,
  });
}
