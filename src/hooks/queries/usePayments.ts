import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getAdminPayments,
  getAdminPaymentDetail,
  getAdminIssues,
  getAdminPaymentAnalytics,
  type PageResult,
  type PaymentAdminSummary,
  type PaymentAdminDetail,
  type IssueView,
  type AdminPaymentAnalytics,
} from '../../lib/payments';

export function useAdminPayments(
  page: number,
  size: number,
  status?: string,
  search?: string,
) {
  return useQuery<PageResult<PaymentAdminSummary> | null>({
    queryKey: ['payments', 'admin', page, size, status, search],
    queryFn: () => getAdminPayments(page, size, status, search),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminPaymentDetail(id: number | null) {
  return useQuery<PaymentAdminDetail | null>({
    queryKey: ['payments', 'admin', 'detail', id],
    queryFn: () => (id ? getAdminPaymentDetail(id) : Promise.resolve(null)),
    enabled: id != null,
    staleTime: 30_000,
  });
}

export function useAdminIssues(
  page: number,
  size: number,
  type?: string,
) {
  return useQuery<PageResult<IssueView> | null>({
    queryKey: ['payments', 'admin', 'issues', page, size, type],
    queryFn: () => getAdminIssues(page, size, type),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminPaymentAnalytics() {
  return useQuery<AdminPaymentAnalytics | null>({
    queryKey: ['payments', 'admin', 'analytics'],
    queryFn: () => getAdminPaymentAnalytics(),
    staleTime: 60_000,
  });
}
