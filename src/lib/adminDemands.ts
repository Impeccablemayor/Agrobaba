import { api } from './api';
import { showToast } from './toastBus';
import type { AdminDemandSummary, AdminDemandDetail, PageResponse } from '../types';

export interface AdminDemandsFilterParams {
  page?: number;
  size?: number;
  status?: string;
  categoryId?: number;
  search?: string;
  sort?: string;
}

export async function getAdminDemands(params: AdminDemandsFilterParams = {}): Promise<PageResponse<AdminDemandSummary>> {
  const q = new URLSearchParams();
  if (params.page !== undefined) q.set('page', String(params.page));
  if (params.size !== undefined) q.set('size', String(params.size));
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.categoryId) q.set('categoryId', String(params.categoryId));
  if (params.search && params.search.trim()) q.set('search', params.search.trim());
  if (params.sort) q.set('sort', params.sort);

  try {
    return await api.get<PageResponse<AdminDemandSummary>>(`/api/admin/demands?${q.toString()}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load demands', 'error');
    return { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, first: true, last: true };
  }
}

export async function getAdminDemandDetail(id: number | string): Promise<AdminDemandDetail | null> {
  try {
    return await api.get<AdminDemandDetail>(`/api/admin/demands/${id}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load demand detail', 'error');
    return null;
  }
}

export async function updateAdminDemand(
  id: number | string,
  body: {
    title?: string;
    description?: string;
    categoryId?: number;
    quantity?: string;
    budget?: number;
    location?: string;
    deadline?: string;
    status?: string;
  },
): Promise<AdminDemandDetail | null> {
  try {
    const data = await api.put<AdminDemandDetail>(`/api/admin/demands/${id}`, body);
    showToast('Demand updated successfully', 'success');
    return data;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to update demand', 'error');
    return null;
  }
}

export async function closeAdminDemand(id: number | string): Promise<AdminDemandDetail | null> {
  try {
    const data = await api.put<AdminDemandDetail>(`/api/admin/demands/${id}/close`, {});
    showToast('Demand closed successfully', 'success');
    return data;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to close demand', 'error');
    return null;
  }
}

export async function deleteAdminDemand(id: number | string, reason: string): Promise<AdminDemandDetail | null> {
  try {
    const data = await api.post<AdminDemandDetail>(`/api/admin/demands/${id}/delete`, { reason });
    showToast('Demand archived/deleted successfully', 'success');
    return data;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to delete demand', 'error');
    return null;
  }
}
