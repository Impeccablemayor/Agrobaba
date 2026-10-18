import { api } from './api';
import type { EmailMessage } from '../types';

export async function getAdminEmails(page?: number, size = 20): Promise<{ content: EmailMessage[]; totalPages: number; totalElements: number; number: number; size: number }> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set('page', String(page));
  params.set('size', String(size));
  const res = await api.get<{ content: EmailMessage[]; totalPages: number; totalElements: number; number: number; size: number }>(`/api/admin/emails?${params}`);
  return res;
}
