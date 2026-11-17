import { api } from './api';

/** Read-only admin oversight of service bookings and product quote requests
 *  (GET /api/admin/bookings, /api/admin/quotes - AdminCommerceDtos on the backend).
 *  Restored from the partner's feature branch; payment-submission fields were dropped because the
 *  Flutterwave payment rework removed them from the backend summary. */

/** Every status the backend can put on a ServiceBooking (ServiceBookingService). */
export type AdminBookingStatus =
  | 'requested' | 'quote_sent' | 'quote_rejected' | 'accepted' | 'declined'
  | 'paid' | 'in_progress' | 'completed' | 'cancelled';

export type AdminQuoteStatus = 'pending' | 'offer_sent' | 'accepted' | 'rejected' | 'cancelled';

export interface AdminBooking {
  id: string;
  serviceId: string | null;
  serviceName: string | null;
  providerId: string | null;
  providerName: string | null;
  customerId: string | null;
  customerName: string | null;
  scheduledDate: string | null;
  serviceLocation: string | null;
  quotedAmount: number | null;
  engagementMethod: string | null;
  status: AdminBookingStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface AdminQuote {
  id: string;
  productId: string | null;
  productName: string | null;
  sellerId: string | null;
  sellerName: string | null;
  buyerId: string | null;
  buyerName: string | null;
  requestedQuantity: number | null;
  deliveryLocation: string | null;
  status: AdminQuoteStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface AdminPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AdminCommerceFilters<TStatus extends string> {
  page?: number;
  size?: number;
  status?: TStatus | 'all';
  search?: string;
}

type WithNumericIds<T, K extends keyof T> = Omit<T, K> & { [P in K]: number | null };

function queryString(filters: AdminCommerceFilters<string>) {
  const params = new URLSearchParams({ page: String(filters.page ?? 0), size: String(filters.size ?? 20) });
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  return params.toString();
}

const toId = (value: number | null | undefined): string | null => (value == null ? null : String(value));

export async function getAdminBookings(filters: AdminCommerceFilters<AdminBookingStatus>): Promise<AdminPage<AdminBooking>> {
  type Api = WithNumericIds<AdminBooking, 'id' | 'serviceId' | 'providerId' | 'customerId'>;
  const page = await api.get<AdminPage<Api>>(`/api/admin/bookings?${queryString(filters)}`);
  return {
    ...page,
    content: page.content.map((b) => ({
      ...b,
      id: String(b.id),
      serviceId: toId(b.serviceId),
      providerId: toId(b.providerId),
      customerId: toId(b.customerId),
    })),
  };
}

export async function getAdminQuotes(filters: AdminCommerceFilters<AdminQuoteStatus>): Promise<AdminPage<AdminQuote>> {
  type Api = WithNumericIds<AdminQuote, 'id' | 'productId' | 'sellerId' | 'buyerId'>;
  const page = await api.get<AdminPage<Api>>(`/api/admin/quotes?${queryString(filters)}`);
  return {
    ...page,
    content: page.content.map((q) => ({
      ...q,
      id: String(q.id),
      productId: toId(q.productId),
      sellerId: toId(q.sellerId),
      buyerId: toId(q.buyerId),
    })),
  };
}
