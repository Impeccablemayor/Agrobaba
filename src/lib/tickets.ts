import { showToast } from './toastBus';
import { api } from './api';
import type { Ticket } from '../types';

export interface TicketInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface BackendTicketResponse {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  userId: number | null;
  status: string;
  createdAt: string;
}

function mapTicket(response: BackendTicketResponse): Ticket {
  return {
    id: String(response.id),
    name: response.name,
    email: response.email,
    subject: response.subject,
    message: response.message,
    userId: response.userId ? String(response.userId) : null,
    status: response.status === 'closed' ? 'closed' : 'open',
    createdAt: response.createdAt,
  };
}

export async function saveTicket(data: TicketInput): Promise<Ticket | null> {
  try {
    const response = await api.post<BackendTicketResponse>('/api/tickets', {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });
    showToast("Message sent! We'll get back to you within 24 hours.", 'success');
    return mapTicket(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send message';
    showToast(message, 'error');
    return null;
  }
}
