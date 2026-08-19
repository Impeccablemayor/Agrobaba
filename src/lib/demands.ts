import { showToast } from './toastBus';
import { api } from './api';
import type { Demand, Order } from '../types';

export interface DemandFilters {
  category?: string;
  categoryId?: string;
  search?: string;
  buyerId?: string;
}

export interface AddDemandInput {
  title: string;
  description?: string;
  category?: string;
  categoryId?: string | null;
  requestedListingKind?: string;
  quantity?: string;
  budget: number | string;
  location?: string;
  deadline?: string;
}

export async function addDemand(data: AddDemandInput): Promise<Demand | false> {
  try {
    const demand = await api.post<Demand>('/api/demands', {
      title: data.title,
      description: data.description || '',
      category: data.category || 'Other',
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      requestedListingKind: data.requestedListingKind || null,
      quantity: data.quantity || '',
      budget: Number(data.budget) || 0,
      location: data.location || '',
      deadline: data.deadline || '',
    });
    showToast('Demand posted successfully!', 'success');
    return demand;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to post demand';
    showToast(message, 'error');
    return false;
  }
}

export async function getDemands(filters: DemandFilters = {}, signal?: AbortSignal): Promise<Demand[]> {
  try {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.search) params.set('search', filters.search);
    if (filters.buyerId) params.set('buyerId', filters.buyerId);

    const query = params.toString();
    const demands = await api.get<Demand[]>(`/api/demands${query ? `?${query}` : ''}`, signal);
    const list = demands || [];
    // A search query is already relevance-ordered by the backend - only impose newest-first when browsing unfiltered.
    if (filters.search && filters.search.trim()) return list;
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return [];
    const message = error instanceof Error ? error.message : 'Unable to load demands';
    showToast(message, 'error');
    return [];
  }
}

export async function getDemandById(id: string): Promise<Demand | null> {
  try {
    return await api.get<Demand>(`/api/demands/${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load demand';
    showToast(message, 'error');
    return null;
  }
}

export async function getMyDemands(): Promise<Demand[]> {
  try {
    return await api.get<Demand[]>('/api/demands/me');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load your demands';
    showToast(message, 'error');
    return [];
  }
}

export interface RespondInput {
  message: string;
  price?: number | string;
  productId: string;
}

export interface AcceptResponseInput {
  quantity: number | string;
  address: string;
  phone: string;
}

export async function deleteDemand(id: string): Promise<boolean> {
  try {
    await api.delete(`/api/demands/${id}`);
    showToast('Demand removed.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete demand';
    showToast(message, 'error');
    return false;
  }
}

export async function respondToDemand(demandId: string, responseData: RespondInput): Promise<boolean> {
  try {
    await api.post(`/api/demands/${demandId}/respond`, {
      message: responseData.message,
      price: Number(responseData.price) || 0,
      productId: Number(responseData.productId),
    });
    showToast('Response sent! A message has been started.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send response';
    showToast(message, 'error');
    return false;
  }
}

export async function acceptDemandResponse(demandId: string, responseId: string, input: AcceptResponseInput): Promise<Order | false> {
  try {
    const order = await api.post<Order>(`/api/demands/${demandId}/responses/${responseId}/accept`, {
      quantity: Number(input.quantity),
      address: input.address,
      phone: input.phone,
    });
    showToast('Response accepted — order placed!', 'success');
    return order;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to accept this response';
    showToast(message, 'error');
    return false;
  }
}

