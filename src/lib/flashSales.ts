import { api } from './api';
import { showToast } from './toastBus';
import type { FlashSale } from '../types';

interface ApiFlashSaleItem {
  id: number;
  productId: number;
  productName: string;
  productImage: string | null;
  category: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
}

interface ApiFlashSale {
  id: number;
  title: string;
  startAt: string;
  endAt: string;
  items: ApiFlashSaleItem[];
  createdAt: string;
}

function mapFlashSale(f: ApiFlashSale): FlashSale {
  return {
    id: String(f.id),
    title: f.title,
    startAt: f.startAt,
    endAt: f.endAt,
    createdAt: f.createdAt,
    items: f.items.map((i) => ({
      id: String(i.id),
      productId: String(i.productId),
      productName: i.productName,
      productImage: i.productImage,
      category: i.category,
      originalPrice: i.originalPrice,
      salePrice: i.salePrice,
      discountPercent: i.discountPercent,
    })),
  };
}

export async function getActiveFlashSale(): Promise<FlashSale | null> {
  try {
    const data = await api.get<ApiFlashSale | null>('/api/flash-sales/active');
    return data ? mapFlashSale(data) : null;
  } catch {
    return null;
  }
}

export async function getAllFlashSalesAdmin(): Promise<FlashSale[]> {
  try {
    const data = await api.get<ApiFlashSale[]>('/api/admin/flash-sales');
    return (data || []).map(mapFlashSale);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load flash sales';
    showToast(message, 'error');
    return [];
  }
}

export interface CreateFlashSaleInput {
  title: string;
  startAt: string;
  endAt: string;
  items: { productId: string; salePrice: number }[];
}

export async function createFlashSale(input: CreateFlashSaleInput): Promise<FlashSale | false> {
  try {
    const data = await api.post<ApiFlashSale>('/api/admin/flash-sales', {
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      items: input.items.map((i) => ({ productId: Number(i.productId), salePrice: i.salePrice })),
    });
    showToast('Flash sale created!', 'success');
    return mapFlashSale(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create flash sale';
    showToast(message, 'error');
    return false;
  }
}

export async function deleteFlashSale(id: string): Promise<boolean> {
  try {
    await api.delete(`/api/admin/flash-sales/${id}`);
    showToast('Flash sale removed.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete flash sale';
    showToast(message, 'error');
    return false;
  }
}
