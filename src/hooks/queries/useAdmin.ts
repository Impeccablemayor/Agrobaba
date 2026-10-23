import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAllTicketsAdmin } from '../../lib/tickets';
import { getPendingVerifications } from '../../lib/verification';
import { getAllCouponsAdmin } from '../../lib/coupons';
import { getAllFlashSalesAdmin } from '../../lib/flashSales';
import { getAdminOverview, getAuditLog } from '../../lib/adminOverview';
import { getAdminPersonalizationOverview } from '../../lib/adminPersonalization';
import {
  getAdminUsers,
  getAdminUserDetail,
  getAdminUserOrders,
  getAdminUserTransactions,
  getAdminUserActivity,
  type AdminUsersFilterParams,
} from '../../lib/adminUsers';
import {
  getAdminDemands,
  getAdminDemandDetail,
  type AdminDemandsFilterParams,
} from '../../lib/adminDemands';
import {
  getAdminProducts,
  getAdminProductDetail,
  type AdminProductsFilterParams,
} from '../../lib/adminProducts';

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

export function useAdminUsers(params: AdminUsersFilterParams = {}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => getAdminUsers(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserDetail(id: number | string | null | undefined) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => (id ? getAdminUserDetail(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useAdminUserOrders(id: number | string | null | undefined, page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'orders', page, size],
    queryFn: () => (id ? getAdminUserOrders(id, page, size) : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, size, number: 0, first: true, last: true })),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserTransactions(id: number | string | null | undefined, page = 0, size = 10) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'transactions', page, size],
    queryFn: () => (id ? getAdminUserTransactions(id, page, size) : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, size, number: 0, first: true, last: true })),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserActivity(id: number | string | null | undefined, page = 0, size = 15) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'activity', page, size],
    queryFn: () => (id ? getAdminUserActivity(id, page, size) : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, size, number: 0, first: true, last: true })),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export function useAdminDemands(params: AdminDemandsFilterParams = {}) {
  return useQuery({
    queryKey: ['admin', 'demands', params],
    queryFn: () => getAdminDemands(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminDemandDetail(id: number | string | null | undefined) {
  return useQuery({
    queryKey: ['admin', 'demand', id],
    queryFn: () => (id ? getAdminDemandDetail(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useAdminProducts(params: AdminProductsFilterParams = {}) {
  return useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () => getAdminProducts(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminProductDetail(id: number | string | null | undefined) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => (id ? getAdminProductDetail(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}
