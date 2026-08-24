import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAllTicketsAdmin } from '../../lib/tickets';
import { getPendingVerifications } from '../../lib/verification';
import { getAllCouponsAdmin } from '../../lib/coupons';
import { getAllFlashSalesAdmin } from '../../lib/flashSales';
import { getAdminOverview, getAuditLog } from '../../lib/adminOverview';
import { getAdminPersonalizationOverview } from '../../lib/adminPersonalization';

export function useAdminTickets() {
  return useQuery({
    queryKey: ['admin', 'tickets'],
    queryFn: () => getAllTicketsAdmin(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminVerifications() {
  return useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: () => getPendingVerifications(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: () => getAllCouponsAdmin(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminFlashSales() {
  return useQuery({
    queryKey: ['admin', 'flashSales'],
    queryFn: () => getAllFlashSalesAdmin(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => getAdminOverview(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminPersonalization() {
  return useQuery({
    queryKey: ['admin', 'personalization'],
    queryFn: () => getAdminPersonalizationOverview(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAuditLog(limit = 100) {
  return useQuery({
    queryKey: ['admin', 'auditLog', limit],
    queryFn: () => getAuditLog(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
