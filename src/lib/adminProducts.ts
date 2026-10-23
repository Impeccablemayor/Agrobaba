import { api } from './api';
import { showToast } from './toastBus';
import type {
  AdminProductSummary,
  AdminProductDetail,
  UpdateAdminProductPayload,
  PageResponse,
} from '../types';

export interface AdminProductsFilterParams {
  page?: number;
  size?: number;
  status?: string;
  category?: string;
  sellerId?: number | string;
  search?: string;
  sort?: string;
  startDate?: string;
  endDate?: string;
}

export async function getAdminProducts(
  params: AdminProductsFilterParams = {}
): Promise<PageResponse<AdminProductSummary>> {
  const q = new URLSearchParams();
  if (params.page !== undefined) q.set('page', String(params.page));
  if (params.size !== undefined) q.set('size', String(params.size));
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.category && params.category !== 'all') q.set('category', params.category);
  if (params.sellerId) q.set('sellerId', String(params.sellerId));
  if (params.search && params.search.trim()) q.set('search', params.search.trim());
  if (params.sort) q.set('sort', params.sort);
  if (params.startDate) q.set('startDate', params.startDate);
  if (params.endDate) q.set('endDate', params.endDate);

  try {
    return await api.get<PageResponse<AdminProductSummary>>(`/api/admin/products?${q.toString()}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load products', 'error');
    return { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, first: true, last: true };
  }
}

export async function getAdminProductDetail(id: number | string): Promise<AdminProductDetail | null> {
  try {
    return await api.get<AdminProductDetail>(`/api/admin/products/${id}`);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to load product details', 'error');
    return null;
  }
}

export async function updateAdminProduct(
  id: number | string,
  payload: UpdateAdminProductPayload
): Promise<AdminProductDetail | null> {
  try {
    const updated = await api.put<AdminProductDetail>(`/api/admin/products/${id}`, payload);
    showToast('Product updated successfully', 'success');
    return updated;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to update product', 'error');
    throw err;
  }
}

export async function suspendAdminProduct(
  id: number | string,
  reason: string
): Promise<AdminProductDetail | null> {
  try {
    const suspended = await api.put<AdminProductDetail>(`/api/admin/products/${id}/suspend`, { reason });
    showToast('Product suspended and hidden from marketplace', 'success');
    return suspended;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to suspend product', 'error');
    throw err;
  }
}

export async function restoreAdminProduct(
  id: number | string
): Promise<AdminProductDetail | null> {
  try {
    const restored = await api.put<AdminProductDetail>(`/api/admin/products/${id}/restore`, {});
    showToast('Product restored to active marketplace status', 'success');
    return restored;
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to restore product', 'error');
    throw err;
  }
}

export async function deleteAdminProduct(
  id: number | string,
  reason: string
): Promise<void> {
  try {
    await api.post(`/api/admin/products/${id}/delete`, { reason });
    showToast('Product deleted and removed from discovery', 'success');
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to delete product', 'error');
    throw err;
  }
}
