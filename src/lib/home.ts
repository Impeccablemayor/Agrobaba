import { showToast } from './toastBus';
import { api } from './api';
import type { Demand, Product } from '../types';

export async function getRecommendedProducts(): Promise<Product[]> {
  try {
    return await api.get<Product[]>('/api/home/recommended');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load recommendations';
    showToast(message, 'error');
    return [];
  }
}

export async function getMatchingDemands(): Promise<Demand[]> {
  try {
    return await api.get<Demand[]>('/api/home/matching-demands');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load matching demands';
    showToast(message, 'error');
    return [];
  }
}
