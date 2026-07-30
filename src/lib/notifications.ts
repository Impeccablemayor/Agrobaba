import { api } from './api';
import { showToast } from './toastBus';
import type { Notification } from '../types';

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function mapNotification(n: ApiNotification): Notification {
  return {
    id: String(n.id),
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt,
  };
}

export async function getMyNotifications(): Promise<Notification[]> {
  try {
    const data = await api.get<ApiNotification[]>('/api/notifications/me');
    return (data || []).map(mapNotification);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load notifications';
    showToast(message, 'error');
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    return await api.get<number>('/api/notifications/unread');
  } catch {
    return 0;
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await api.put(`/api/notifications/${id}/read`);
  } catch {
    /* non-critical */
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await api.put('/api/notifications/read-all');
  } catch {
    /* non-critical */
  }
}
