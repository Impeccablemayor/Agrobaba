import { showToast } from './toastBus';
import { api } from './api';
import type { Ticket, TicketStatus } from '../types';

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
  const status: TicketStatus = response.status === 'in_progress' || response.status === 'resolved'
    ? response.status
    : 'open';
  return {
    id: String(response.id),
    name: response.name,
    email: response.email,
    subject: response.subject,
    message: response.message,
    userId: response.userId ? String(response.userId) : null,
    status,
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

export async function getAllTicketsAdmin(): Promise<Ticket[]> {
  try {
    const data = await api.get<BackendTicketResponse[]>('/api/admin/tickets');
    return (data || []).map(mapTicket);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load tickets';
    showToast(message, 'error');
    return [];
  }
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<boolean> {
  try {
    await api.put(`/api/admin/tickets/${id}/status`, { status });
    showToast('Ticket status updated.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update ticket status';
    showToast(message, 'error');
    return false;
  }
}
