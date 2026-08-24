import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyProducts, getProductById, getProducts, type ProductFilters } from '../../lib/products';
import type { Product } from '../../types';

export interface ProductQueryParams extends ProductFilters {
  page?: number;
  size?: number;
  sort?: string;
}

export function useProducts(params: ProductQueryParams = {}) {
  const page = params.page ?? 1;
  const size = params.size ?? 20;

  return useQuery<Product[]>({
    queryKey: ['products', { ...params, page, size }],
    queryFn: ({ signal }) => getProducts(params, signal),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id?: string) {
  const queryClient = useQueryClient();

  return useQuery<Product | null>({
    queryKey: ['products', 'detail', id],
    queryFn: () => (id ? getProductById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    // Perceived Performance (Phase 9): If summary exists in list cache, display instantly while fetching details
    placeholderData: () => {
      if (!id) return undefined;
      const cachedQueries = queryClient.getQueriesData<Product[]>({ queryKey: ['products'] });
      for (const [, list] of cachedQueries) {
        if (Array.isArray(list)) {
          const match = list.find((p) => p.id === id);
          if (match) return match;
        }
      }
      return undefined;
    },
  });
}

export function useMyProducts() {
  return useQuery<Product[]>({
    queryKey: ['products', 'me'],
    queryFn: () => getMyProducts(),
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
