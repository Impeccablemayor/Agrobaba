import { showToast } from './toastBus';
import { api } from './api';
import type { Demand } from '../types';

export interface DemandFilters {
  category?: string;
  search?: string;
  buyerId?: string;
}

export interface AddDemandInput {
  title: string;
  description?: string;
  category?: string;
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

export async function getDemands(filters: DemandFilters = {}): Promise<Demand[]> {
  try {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (filters.buyerId) params.set('buyerId', filters.buyerId);

    const query = params.toString();
    const demands = await api.get<Demand[]>(`/api/demands${query ? `?${query}` : ''}`);
    return (demands || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
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
    });
    showToast('Response sent! A message has been started.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send response';
    showToast(message, 'error');
    return false;
  }
}

