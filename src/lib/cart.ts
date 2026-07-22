import { KEYS, getStore, setStore } from './storage';
import { showToast } from './toastBus';
import { uid } from './format';
import { getCurrentUser } from './auth';
import type { CartItem, Product } from '../types';

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
    setStore(KEYS.cart, cart);
    showToast('Cart updated!', 'success');
    return true;
  }

  const item: CartItem = {
    id: uid(),
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity,
    size,
    image: product.image || null,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    type: product.type || 'product',
    addedAt: new Date().toISOString(),
  };

  cart.push(item);
  setStore(KEYS.cart, cart);
  showToast(`${product.name} added to cart!`, 'success');
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
