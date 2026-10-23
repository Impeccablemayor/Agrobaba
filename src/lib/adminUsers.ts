import { api } from './api';
import { showToast } from './toastBus';
import type {
  AdminUserSummary,
  AdminUserDetail,
  AdminUserOrderSummary,
  AdminUserTransactionSummary,
  AuditLogEntry,
  PageResponse,
} from '../types';

export interface AdminUsersFilterParams {
  page?: number;
  size?: number;
  role?: string;
  verification?: string;
  status?: string;
  search?: string;
  sort?: string;
}

export async function getAdminUsers(params: AdminUsersFilterParams = {}): Promise<PageResponse<AdminUserSummary>> {
  const q = new URLSearchParams();
  if (params.page !== undefined) q.set('page', String(params.page));
  if (params.size !== undefined) q.set('size', String(params.size));
  if (params.role && params.role !== 'all') q.set('role', params.role);
  if (params.verification && params.verification !== 'all') q.set('verification', params.verification);
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.search && params.search.trim()) q.set('search', params.search.trim());
  if (params.sort) q.set('sort', params.sort);

  try {
    return await api.get<PageResponse<AdminUserSummary>>(`/api/admin/users?${q.toString()}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load users', 'error');
    return { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, first: true, last: true };
  }
}

export async function getAdminUserDetail(id: number | string): Promise<AdminUserDetail | null> {
  try {
    return await api.get<AdminUserDetail>(`/api/admin/users/${id}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load user profile', 'error');
    return null;
  }
}

export async function getAdminUserOrders(
  id: number | string,
  page = 0,
  size = 10,
): Promise<PageResponse<AdminUserOrderSummary>> {
  try {
    return await api.get<PageResponse<AdminUserOrderSummary>>(`/api/admin/users/${id}/orders?page=${page}&size=${size}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load user orders', 'error');
    return { content: [], totalElements: 0, totalPages: 0, size, number: 0, first: true, last: true };
  }
}

export async function getAdminUserTransactions(
  id: number | string,
  page = 0,
  size = 10,
): Promise<PageResponse<AdminUserTransactionSummary>> {
  try {
    return await api.get<PageResponse<AdminUserTransactionSummary>>(
      `/api/admin/users/${id}/transactions?page=${page}&size=${size}`,
    );
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load user transactions', 'error');
    return { content: [], totalElements: 0, totalPages: 0, size, number: 0, first: true, last: true };
  }
}

export async function getAdminUserActivity(
  id: number | string,
  page = 0,
  size = 15,
): Promise<PageResponse<AuditLogEntry>> {
  try {
    return await api.get<PageResponse<AuditLogEntry>>(`/api/admin/users/${id}/activity?page=${page}&size=${size}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load user activity', 'error');
    return { content: [], totalElements: 0, totalPages: 0, size, number: 0, first: true, last: true };
  }
}

export async function suspendUser(id: number | string, reason: string): Promise<AdminUserDetail | null> {
  try {
    const data = await api.put<AdminUserDetail>(`/api/admin/users/${id}/suspend`, { reason });
    showToast('User account suspended successfully', 'success');
    return data;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to suspend user', 'error');
    return null;
  }
}

export async function reinstateUser(id: number | string): Promise<AdminUserDetail | null> {
  try {
    const data = await api.put<AdminUserDetail>(`/api/admin/users/${id}/reinstate`, {});
    showToast('User account reinstated successfully', 'success');
    return data;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to reinstate user', 'error');
    return null;
  }
}
