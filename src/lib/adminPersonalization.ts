import { showToast } from './toastBus';
import { api } from './api';
import type { AdminPersonalizationOverview } from '../types';

export async function getAdminPersonalizationOverview(): Promise<AdminPersonalizationOverview | null> {
  try {
    return await api.get<AdminPersonalizationOverview>('/api/admin/personalization');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load personalization overview';
    showToast(message, 'error');
    return null;
  }
}
