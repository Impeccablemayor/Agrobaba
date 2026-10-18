import { api } from './api';
import type { AcceptedQuote, CartItem } from '../types';
import {
  mapBackendCart,
  type BackendCart,
} from './cartModel';

// Pure cart-model helpers (mapping, seller grouping, legacy-key purge) live in cartModel.ts so
// they stay testable under `node --test`; this module adds the authenticated HTTP layer.
export {
  LEGACY_SHARED_CART_KEY,
  purgeLegacySharedCart,
  mapBackendCartItem,
  mapBackendCart,
  groupCartBySeller,
  type BackendCartItem,
  type BackendCart,
} from './cartModel';

/** The authenticated customer's server-side cart. The backend derives the owner from the JWT -
 *  no user id is ever sent. */
export async function fetchServerCart(): Promise<CartItem[]> {
  const response = await api.get<BackendCart>('/api/cart');
  return mapBackendCart(response);
}

export interface AddToCartInput {
  productId: string | number;
  quantity: number;
  size?: string;
  acceptedQuoteId?: string | number | null;
}

/** Adds a line (or consolidates quantity server-side) on the authenticated user's cart. */
export async function addItemToServerCart(input: AddToCartInput): Promise<CartItem[]> {
  const response = await api.post<BackendCart>('/api/cart/items', {
    productId: Number(input.productId),
    quantity: input.quantity,
    size: input.size || 'Standard',
    acceptedQuoteId: input.acceptedQuoteId != null ? Number(input.acceptedQuoteId) : null,
  });
  return mapBackendCart(response);
}

export async function updateServerCartItem(itemId: string, quantity: number): Promise<CartItem[]> {
  const response = await api.put<BackendCart>(`/api/cart/items/${encodeURIComponent(itemId)}`, { quantity });
  return mapBackendCart(response);
}

export async function removeServerCartItem(itemId: string): Promise<CartItem[]> {
  const response = await api.delete<BackendCart>(`/api/cart/items/${encodeURIComponent(itemId)}`);
  return mapBackendCart(response);
}

export async function clearServerCart(): Promise<void> {
  await api.delete<BackendCart>('/api/cart');
}

/** Negotiated Commerce roadmap - an accepted quote becomes exactly one checkout-ready cart
 *  line. The backend locks price/quantity from the quote snapshot and rejects quotes that
 *  don't belong to the authenticated buyer. */
export async function addAcceptedQuoteToCart(quote: AcceptedQuote): Promise<CartItem[]> {
  return addItemToServerCart({
    productId: quote.productId,
    quantity: quote.quantity,
    acceptedQuoteId: quote.id,
  });
}
