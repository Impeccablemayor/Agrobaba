import { useQuery } from '@tanstack/react-query';
import { getActiveFlashSale } from '../../lib/flashSales';
import type { FlashSale } from '../../types';

export const FLASH_SALE_QUERY_KEY = ['flashSales'];

export function useActiveFlashSale() {
  return useQuery<FlashSale | null>({
    queryKey: ['flashSales', 'active'],
    queryFn: () => getActiveFlashSale(),
    // Flash sales are time-sensitive campaigns - short freshness window
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}