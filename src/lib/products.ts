import { showToast } from './toastBus';
import { api } from './api';
import type { Product, ProductType } from '../types';

export interface ProductFilters {
  type?: ProductType | 'all';
  category?: string;
  categoryId?: string;
  search?: string;
  sellerId?: string;
}

export interface AddProductInput {
  name: string;
  description?: string;
  price: number | string;
  category?: string;
  categoryId?: string | null;
  listingKind?: string;
  type?: ProductType;
  size?: string;
  quantity?: number | string;
  unit?: string;
  location?: string;
  image?: string | null;
  discount?: number | string;
  tags?: string[];
}

export async function addProduct(data: AddProductInput): Promise<Product | false> {
  try {
    const product = await api.post<Product>('/api/products', {
      name: data.name,
      description: data.description || '',
      price: Number(data.price) || 0,
      category: data.category || 'Other',
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      listingKind: data.listingKind || null,
      type: data.type || 'product',
      size: data.size || 'Standard',
      quantity: Number(data.quantity) || 1,
      unit: data.unit || 'unit',
      location: data.location || '',
      image: data.image || null,
      discount: Number(data.discount) || 0,
      tags: data.tags || [],
    });
    showToast('Listing posted successfully!', 'success');
    return product;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create listing';
    showToast(message, 'error');
    return false;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await api.delete(`/api/products/${id}`);
    showToast('Listing removed.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete listing';
    showToast(message, 'error');
    return false;
  }
}

export async function getProducts(filters: ProductFilters = {}, signal?: AbortSignal): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.search) params.set('search', filters.search);
    if (filters.sellerId) params.set('sellerId', filters.sellerId);

    const query = params.toString();
    const products = await api.get<Product[]>(`/api/products${query ? `?${query}` : ''}`, signal);
    const list = products || [];
    // A search query is already relevance-ordered by the backend - only impose newest-first when browsing unfiltered.
    if (filters.search && filters.search.trim()) return list;
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return [];
    const message = error instanceof Error ? error.message : 'Unable to load products';
    showToast(message, 'error');
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    return await api.get<Product>(`/api/products/${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load product';
    showToast(message, 'error');
    return null;
  }
}

export async function getMyProducts(): Promise<Product[]> {
  try {
    return await api.get<Product[]>('/api/products/me');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load your listings';
    showToast(message, 'error');
    return [];
  }
}

