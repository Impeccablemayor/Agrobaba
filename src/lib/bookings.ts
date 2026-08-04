import { api } from './api';
import { showToast } from './toastBus';
import type { BookingStatus, ServiceBooking } from '../types';

interface ApiBooking {
  id: number;
  serviceId: number;
  serviceName: string;
  providerId: number;
  providerName: string;
  providerContact: string | null;
  providerEmail: string | null;
  customerId: number;
  customerName: string;
  customerContact: string | null;
  customerEmail: string | null;
  scheduledDate: string;
  serviceLocation: string | null;
  customerNotes: string | null;
  quotedAmount: number;
  status: string;
  declineReason: string | null;
  paymentMode: string | null;
  transactionRef: string | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapBooking(b: ApiBooking): ServiceBooking {
  return {
    id: String(b.id),
    serviceId: String(b.serviceId),
    serviceName: b.serviceName,
    providerId: String(b.providerId),
    providerName: b.providerName,
    providerContact: b.providerContact,
    providerEmail: b.providerEmail,
    customerId: String(b.customerId),
    customerName: b.customerName,
    customerContact: b.customerContact,
    customerEmail: b.customerEmail,
    scheduledDate: b.scheduledDate,
    serviceLocation: b.serviceLocation,
    customerNotes: b.customerNotes,
    quotedAmount: b.quotedAmount,
    status: b.status as BookingStatus,
    declineReason: b.declineReason,
    paymentMode: b.paymentMode,
    transactionRef: b.transactionRef,
    paymentDate: b.paymentDate,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export interface CreateBookingInput {
  serviceId: string;
  scheduledDate: string;
  serviceLocation?: string;
  customerNotes?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<ServiceBooking | false> {
  try {
    const booking = await api.post<ApiBooking>('/api/bookings', {
      serviceId: Number(input.serviceId),
      scheduledDate: input.scheduledDate,
      serviceLocation: input.serviceLocation || null,
      customerNotes: input.customerNotes || null,
    });
    showToast('Booking request sent!', 'success');
    return mapBooking(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to request booking';
    showToast(message, 'error');
    return false;
  }
}

export async function getMyBookings(): Promise<ServiceBooking[]> {
  try {
    const data = await api.get<ApiBooking[]>('/api/bookings/me');
    return (data || []).map(mapBooking);
  } catch {
    return [];
  }
}

export async function getMyProviderBookings(): Promise<ServiceBooking[]> {
  try {
    const data = await api.get<ApiBooking[]>('/api/bookings/provider');
    return (data || []).map(mapBooking);
  } catch {
    return [];
  }
}

export async function getBookingById(id: string): Promise<ServiceBooking | null> {
  try {
    return mapBooking(await api.get<ApiBooking>(`/api/bookings/${id}`));
  } catch {
    return null;
  }
}

export async function acceptBooking(id: string): Promise<ServiceBooking | false> {
  try {
    const booking = mapBooking(await api.put<ApiBooking>(`/api/bookings/${id}/accept`));
    showToast('Booking accepted!', 'success');
    return booking;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to accept booking';
    showToast(message, 'error');
    return false;
  }
}

export async function declineBooking(id: string, reason: string): Promise<ServiceBooking | false> {
  try {
    const booking = mapBooking(await api.put<ApiBooking>(`/api/bookings/${id}/decline`, { reason }));
    showToast('Booking declined.', 'success');
    return booking;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to decline booking';
    showToast(message, 'error');
    return false;
  }
}

export interface BookingPaymentInput {
  paymentMode: string;
  paymentDate: string;
  transactionNumber: string;
  amount: number;
}

export async function confirmBookingPayment(id: string, data: BookingPaymentInput): Promise<ServiceBooking | false> {
  try {
    const booking = mapBooking(await api.put<ApiBooking>(`/api/bookings/${id}/confirm-payment`, {
      paymentMode: data.paymentMode,
      paymentDate: data.paymentDate,
      transactionNumber: data.transactionNumber,
      amount: data.amount,
    }));
    showToast('Payment confirmed!', 'success');
    return booking;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to confirm payment';
    showToast(message, 'error');
    return false;
  }
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<ServiceBooking | false> {
  try {
    const booking = mapBooking(await api.put<ApiBooking>(`/api/bookings/${id}/status`, { status }));
    showToast(`Booking marked as "${status}".`, 'success');
    return booking;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update booking status';
    showToast(message, 'error');
    return false;
  }
}

export async function cancelBooking(id: string): Promise<ServiceBooking | false> {
  try {
    const booking = mapBooking(await api.put<ApiBooking>(`/api/bookings/${id}/cancel`));
    showToast('Booking cancelled.', 'success');
    return booking;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to cancel booking';
    showToast(message, 'error');
    return false;
  }
}
