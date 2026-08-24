import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMyProducts, getProductById, getProducts, type ProductFilters } from '../../lib/products';
import type { Product } from '../../types';

export function useProducts(filters: ProductFilters = {}) {
  return useQuery<Product[]>({
    queryKey: ['products', filters],
    queryFn: ({ signal }) => getProducts(filters, signal),
    staleTime: 3 * 60 * 1000, // 3 minutes
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id?: string) {
  return useQuery<Product | null>({
    queryKey: ['products', id],
    queryFn: () => (id ? getProductById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMyProducts() {
  return useQuery<Product[]>({
    queryKey: ['products', 'me'],
    queryFn: () => getMyProducts(),
    staleTime: 2 * 60 * 1000,
  });
}
