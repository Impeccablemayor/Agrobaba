import { api } from './api';
import type {
  Shipment,
  Transporter,
  SellerDeliveryProfile,
  LogisticsOverview,
  DeliveryQuote,
  ProofOfDeliveryType,
  ShipmentStatus
} from '../types';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// -------------------------------------------------------------
// Buyer & Public Logistics APIs
// -------------------------------------------------------------

export async function getShipmentsForOrder(orderId: number): Promise<Shipment[]> {
  return api.get<Shipment[]>(`/api/logistics/orders/${orderId}/shipments`);
}

export async function trackShipment(trackingNumber: string): Promise<Shipment> {
  return api.get<Shipment>(`/api/logistics/track/${encodeURIComponent(trackingNumber)}`);
}

export async function confirmDelivery(
  shipmentId: number,
  data: {
    proofType: ProofOfDeliveryType;
    deliveryOtp?: string;
    receiptImageUrl?: string;
    note?: string;
  }
): Promise<Shipment> {
  return api.post<Shipment>(`/api/logistics/shipments/${shipmentId}/confirm-delivery`, data);
}

export async function estimateDeliveryFee(
  sellerId: number,
  subtotal: number,
  state?: string
): Promise<{ sellerId: number; fee: number; free: boolean }> {
  const query = new URLSearchParams({
    sellerId: String(sellerId),
    subtotal: String(subtotal),
  });
  if (state) query.set('state', state);
  return api.get<{ sellerId: number; fee: number; free: boolean }>(`/api/logistics/estimate-fee?${query.toString()}`);
}

// -------------------------------------------------------------
// Seller Fulfillment APIs
// -------------------------------------------------------------

export async function getSellerShipments(page = 0, size = 15): Promise<PageResponse<Shipment>> {
  return api.get<PageResponse<Shipment>>(`/api/logistics/seller/shipments?page=${page}&size=${size}`);
}

export async function updateSellerShipmentStatus(
  shipmentId: number,
  data: {
    status: ShipmentStatus;
    note?: string;
    location?: string;
    estimatedDeliveryDate?: string;
  }
): Promise<Shipment> {
  return api.put<Shipment>(`/api/logistics/seller/shipments/${shipmentId}/status`, data);
}

export async function getMyDeliveryProfile(): Promise<SellerDeliveryProfile> {
  return api.get<SellerDeliveryProfile>('/api/logistics/seller/profile');
}

export async function saveMyDeliveryProfile(data: Partial<SellerDeliveryProfile>): Promise<SellerDeliveryProfile> {
  return api.put<SellerDeliveryProfile>('/api/logistics/seller/profile', data);
}

export async function getSellerDeliveryProfile(sellerId: number): Promise<SellerDeliveryProfile> {
  return api.get<SellerDeliveryProfile>(`/api/logistics/seller/profile/${sellerId}`);
}

// -------------------------------------------------------------
// Admin Logistics APIs
// -------------------------------------------------------------

export async function getAdminLogisticsOverview(): Promise<LogisticsOverview> {
  return api.get<LogisticsOverview>('/api/admin/logistics/overview');
}

export async function getAdminShipments(params?: {
  status?: string;
  requiresAction?: boolean;
  sellerId?: number;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Shipment>> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.requiresAction !== undefined) q.set('requiresAction', String(params.requiresAction));
  if (params?.sellerId) q.set('sellerId', String(params.sellerId));
  if (params?.search) q.set('search', params.search);
  if (params?.page !== undefined) q.set('page', String(params.page));
  if (params?.size !== undefined) q.set('size', String(params.size));
  return api.get<PageResponse<Shipment>>(`/api/admin/logistics/shipments?${q.toString()}`);
}

export async function getAdminShipment(id: number): Promise<Shipment> {
  return api.get<Shipment>(`/api/admin/logistics/shipments/${id}`);
}

export async function assignTransporter(
  shipmentId: number,
  data: {
    transporterId: number;
    agreedCost?: number;
    estimatedPickupDate?: string;
    estimatedDeliveryDate?: string;
    reassignmentReason?: string;
  }
): Promise<Shipment> {
  return api.post<Shipment>(`/api/admin/logistics/shipments/${shipmentId}/assign-transporter`, data);
}

export async function confirmPickup(shipmentId: number, note?: string): Promise<Shipment> {
  return api.post<Shipment>(`/api/admin/logistics/shipments/${shipmentId}/confirm-pickup`, { note });
}

export async function recordDeliveryQuote(
  shipmentId: number,
  data: {
    quotedAmount: number;
    currency?: string;
    quoteSource: string;
    notes?: string;
    expiresAt?: string;
  }
): Promise<DeliveryQuote> {
  return api.post<DeliveryQuote>(`/api/admin/logistics/shipments/${shipmentId}/quote`, data);
}

export async function updateAdminShipmentStatus(
  shipmentId: number,
  data: {
    status: ShipmentStatus;
    note?: string;
    location?: string;
    estimatedDeliveryDate?: string;
  }
): Promise<Shipment> {
  return api.put<Shipment>(`/api/admin/logistics/shipments/${shipmentId}/status`, data);
}

export async function overrideDelivery(shipmentId: number, reason: string): Promise<Shipment> {
  return api.post<Shipment>(`/api/admin/logistics/shipments/${shipmentId}/override-delivery`, { reason });
}

export async function getAdminTransporters(params?: {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
}): Promise<PageResponse<Transporter>> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.active !== undefined) q.set('active', String(params.active));
  if (params?.page !== undefined) q.set('page', String(params.page));
  if (params?.size !== undefined) q.set('size', String(params.size));
  return api.get<PageResponse<Transporter>>(`/api/admin/logistics/transporters?${q.toString()}`);
}

export async function getActiveTransporters(): Promise<Transporter[]> {
  return api.get<Transporter[]>('/api/admin/logistics/transporters/active');
}

export async function createTransporter(data: Partial<Transporter>): Promise<Transporter> {
  return api.post<Transporter>('/api/admin/logistics/transporters', data);
}

export async function updateTransporter(id: number, data: Partial<Transporter>): Promise<Transporter> {
  return api.put<Transporter>(`/api/admin/logistics/transporters/${id}`, data);
}

export async function setTransporterActive(id: number, active: boolean): Promise<void> {
  return api.put<void>(`/api/admin/logistics/transporters/${id}/active?active=${active}`, {});
}
