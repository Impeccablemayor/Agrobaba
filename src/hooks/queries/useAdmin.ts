import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAllTicketsAdmin } from '../../lib/tickets';
import { getPendingVerifications } from '../../lib/verification';
import { getAllCouponsAdmin } from '../../lib/coupons';
import { getAllFlashSalesAdmin } from '../../lib/flashSales';

export function useAdminTickets() {
  return useQuery({
    queryKey: ['admin', 'tickets'],
    queryFn: () => getAllTicketsAdmin(),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminVerifications() {
  return useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: () => getPendingVerifications(),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: () => getAllCouponsAdmin(),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminFlashSales() {
  return useQuery({
    queryKey: ['admin', 'flashSales'],
    queryFn: () => getAllFlashSalesAdmin(),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
