import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAllOrdersAdmin, getMyOrders, getMySales, getOrderById } from '../../lib/orders';
import type { Order } from '../../types';

export function useMyOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders', 'me'],
    queryFn: () => getMyOrders(),
    staleTime: 60 * 1000, // 1 minute
    placeholderData: keepPreviousData,
  });
}

export function useSalesOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders', 'sales'],
    queryFn: () => getMySales(),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders', 'admin'],
    queryFn: () => getAllOrdersAdmin(),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id?: string) {
  return useQuery<Order | null>({
    queryKey: ['orders', id],
    queryFn: () => (id ? getOrderById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}
