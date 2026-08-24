import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../../lib/categories';
import type { Category } from '../../types';

export const CATEGORIES_QUERY_KEY = ['categories'];

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => getCategories(),
    // Reference taxonomy rarely changes - cache for 60 minutes
    staleTime: 60 * 60 * 1000,
  });
}
