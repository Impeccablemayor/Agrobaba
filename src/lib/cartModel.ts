import type { CartItem } from '../types';

/** Legacy localStorage key. Before the cart moved server-side, every account on a browser
 *  shared ONE cart list under this key (the cross-user cart leak). The old rows cannot be
 *  reliably attributed to their rightful owners, so the key is deleted on sight - NEVER
 *  merged into any authenticated user's server cart. */
export const LEGACY_SHARED_CART_KEY = 'agrobaba_cart';

/** One-time cleanup of the pre-fix shared cart. Safe to call repeatedly. */
export function purgeLegacySharedCart(): void {
  try {
    localStorage.removeItem(LEGACY_SHARED_CART_KEY);
  } catch {
    /* private mode / storage disabled - nothing to purge */
  }
}

/** Wire shape returned by /api/cart. Prices are resolved server-side; clients never send one. */
export interface BackendCartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string | null;
  sellerId: number | null;
  sellerName: string | null;
  type: string | null;
  unit: string | null;
  acceptedQuoteId: number | null;
  addedAt: string;
}

export interface BackendCart {
  id: number | null;
  items: BackendCartItem[];
  total: number;
  itemCount: number;
}

export function mapBackendCartItem(item: BackendCartItem): CartItem {
  return {
    id: String(item.id),
    productId: String(item.productId),
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    size: item.size,
    image: item.image ?? null,
    sellerId: item.sellerId != null ? String(item.sellerId) : '',
    sellerName: item.sellerName ?? '',
    type: (item.type as CartItem['type']) || 'product',
    addedAt: item.addedAt,
    unit: item.unit ?? null,
    acceptedQuoteId: item.acceptedQuoteId != null ? String(item.acceptedQuoteId) : null,
  };
}

export function mapBackendCart(cart: BackendCart): CartItem[] {
  return Array.isArray(cart?.items) ? cart.items.map(mapBackendCartItem) : [];
}

/** Cart Model completion (Flexible Commerce Architecture §4 / §18) - "support multi-seller
 *  carts with seller grouping." Shared by CartPage and CheckoutPage's order summary so both
 *  render a consistent picture. Preserves first-seen seller order rather than sorting,
 *  matching the order items were added in. */
export function groupCartBySeller(cart: CartItem[]): { sellerId: string; sellerName: string; items: CartItem[] }[] {
  const groups: { sellerId: string; sellerName: string; items: CartItem[] }[] = [];
  for (const item of cart) {
    let group = groups.find((g) => g.sellerId === item.sellerId);
    if (!group) {
      group = { sellerId: item.sellerId, sellerName: item.sellerName, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
