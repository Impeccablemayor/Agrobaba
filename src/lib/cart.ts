import { KEYS, getStore, setStore } from './storage';
import { showToast } from './toastBus';
import { uid } from './format';
import { getCurrentUser } from './auth';
import { resolveUnitPrice } from './units';
import type { AcceptedQuote, CartItem, Product } from '../types';

export function getCart(): CartItem[] {
  return getStore<CartItem>(KEYS.cart);
}

/** Returns false (with a toast) if the user isn't logged in — caller should redirect to /login. */
export function addToCart(product: Product, quantity = 1, size = 'Standard'): boolean {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login to add items to cart.', 'warning');
    return false;
  }

  const cart = getCart();

  const existing = cart.find((item) => item.productId === product.id && item.size === size);
  if (existing) {
    existing.quantity += quantity;
    existing.price = resolveUnitPrice(product, existing.quantity);
    existing.basePrice = product.price ?? undefined;
    existing.priceTiers = product.priceTiers;
    existing.unit = product.unit;
    setStore(KEYS.cart, cart);
    showToast('Cart updated!', 'success');
    return true;
  }

  const item: CartItem = {
    id: uid(),
    productId: product.id,
    name: product.name,
    // Phase 2 of the Flexible Commerce Architecture roadmap - snapshot the tier-resolved price
    // for the quantity being added, not the flat base price, so what lands in the cart matches
    // whatever price was shown on the product page a moment ago.
    price: resolveUnitPrice(product, quantity),
    quantity,
    size,
    image: product.image || null,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    type: product.type || 'product',
    addedAt: new Date().toISOString(),
    // Cart Model completion (Flexible Commerce Architecture §4) - pricing snapshot so quantity
    // edits made later, in the cart itself, can re-resolve the correct tier price locally.
    unit: product.unit,
    basePrice: product.price ?? undefined,
    priceTiers: product.priceTiers,
  };

  cart.push(item);
  setStore(KEYS.cart, cart);
  showToast(`${product.name} added to cart!`, 'success');
  return true;
}

/** Negotiated Commerce roadmap - an accepted quote becomes exactly one checkout-ready cart line,
 *  never editable and never re-priced from live product data (the whole point of a locked quote).
 *  Bypasses resolveUnitPrice entirely - there's no "live price" to resolve for a negotiated deal. */
export function addAcceptedQuoteToCart(quote: AcceptedQuote): boolean {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login to add items to cart.', 'warning');
    return false;
  }

  const cart = getCart();
  const item: CartItem = {
    id: uid(),
    productId: quote.productId,
    name: quote.productName,
    price: quote.pricePerUnit,
    quantity: quote.quantity,
    size: 'Standard',
    image: quote.productImage,
    sellerId: quote.sellerId,
    sellerName: quote.sellerName,
    type: 'product',
    addedAt: new Date().toISOString(),
    unit: quote.unit,
    acceptedQuoteId: quote.id,
  };

  cart.push(item);
  setStore(KEYS.cart, cart);
  showToast(`${quote.productName} added to cart!`, 'success');
  return true;
}

export function removeFromCart(itemId: string): CartItem[] {
  const cart = getCart().filter((item) => item.id !== itemId);
  setStore(KEYS.cart, cart);
  showToast('Item removed from cart.', 'info');
  return cart;
}

export function updateCartQuantity(itemId: string, quantity: number): CartItem[] {
  const cart = getCart();
  const item = cart.find((i) => i.id === itemId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    // Cart Model completion (Flexible Commerce Architecture §4) - re-resolve the tier-correct
    // price for the new quantity from the pricing snapshot taken at add-to-cart time, instead of
    // leaving the price frozen at whatever tier applied when the item was first added.
    item.price = resolveUnitPrice({ price: item.basePrice ?? item.price, priceTiers: item.priceTiers }, item.quantity);
    setStore(KEYS.cart, cart);
  }
  return cart;
}

export function clearCart(): void {
  setStore(KEYS.cart, []);
}

export function getCartTotal(): number {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

/** Cart Model completion (Flexible Commerce Architecture §4 / §18) - "support multi-seller carts
 *  with seller grouping." Shared by CartPage and CheckoutPage's order summary so both render a
 *  consistent picture. Preserves first-seen seller order rather than sorting, matching the order
 *  items were added in. */
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
