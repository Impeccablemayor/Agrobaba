import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as cartLib from '../lib/cart';
import { useAuth } from './AuthContext';
import { showToast } from '../lib/toastBus';
import { recordEvent } from '../lib/behaviorEvents';
import { ApiError } from '../lib/api';
import type { CartItem, Product } from '../types';

interface CartContextValue {
  cart: CartItem[];
  count: number;
  total: number;
  /** True while the authenticated customer's server cart is being loaded. Pages must NOT treat
   *  this as "cart is empty" (checkout would bounce to /cart mid-load). */
  loading: boolean;
  addToCart: (product: Product, quantity?: number, size?: string) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

/** The cart is server-side and strictly per-account (backend derives ownership from the JWT).
 *  This provider's job is to (1) load the CURRENT user's cart only after auth is confirmed,
 *  (2) wipe in-memory state the instant the authenticated account changes or signs out, and
 *  (3) discard responses from a previous session so a slow request can never overwrite the
 *  new account's cart. There is no localStorage cart anymore - browser storage is never the
 *  source of truth for authenticated cart data. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, phase } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  /** Bumped whenever the authenticated account changes (or signs out). Every in-flight cart
   *  response captures the epoch it started under and is dropped if it no longer matches. */
  const epochRef = useRef(0);

  const userId = user?.id ?? null;
  // 'restoring' means the session hasn't been confirmed yet - fetching now could run under a
  // stale/previous identity, so the load waits for a settled phase.
  const authReady = phase !== 'restoring';

  useEffect(() => {
    // One-time cleanup of the pre-fix browser-wide cart: it was shared by every account on
    // this browser and cannot be attributed to owners, so it is dropped, never merged.
    cartLib.purgeLegacySharedCart();
  }, []);

  useEffect(() => {
    const epoch = ++epochRef.current;
    // Never keep showing the previous account's items while the new state loads.
    setCart([]);
    if (!userId || !authReady) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    cartLib
      .fetchServerCart()
      .then((items) => {
        if (!cancelled && epoch === epochRef.current) setCart(items);
      })
      .catch(() => {
        // A failed fetch leaves the cart EMPTY - it must never fall back to cached or
        // previous-account data. The user can retry by reloading or by adding an item.
      })
      .finally(() => {
        if (!cancelled && epoch === epochRef.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, authReady]);

  /** Applies a mutation result only if no account switch/session change happened while the
   *  request was in flight. */
  function applyResult(epoch: number, items: CartItem[]): void {
    if (epoch === epochRef.current) setCart(items);
  }

  function messageOf(error: unknown, fallback: string): string {
    if (error instanceof ApiError) return error.message;
    return error instanceof Error && error.message ? error.message : fallback;
  }

  async function addToCart(product: Product, quantity = 1, size = 'Standard'): Promise<void> {
    if (!user) {
      showToast('Please login to add items to cart.', 'warning');
      navigate('/login');
      return;
    }
    const epoch = epochRef.current;
    try {
      const items = await cartLib.addItemToServerCart({ productId: product.id, quantity, size });
      applyResult(epoch, items);
      recordEvent('add_to_cart', product.id);
      showToast(`${product.name} added to cart!`, 'success');
    } catch (error) {
      showToast(messageOf(error, 'Unable to add item to cart.'), 'error');
    }
  }

  async function removeFromCart(itemId: string): Promise<void> {
    const epoch = epochRef.current;
    const item = cart.find((i) => i.id === itemId);
    try {
      const items = await cartLib.removeServerCartItem(itemId);
      applyResult(epoch, items);
      if (item) recordEvent('remove_from_cart', item.productId);
      showToast('Item removed from cart.', 'info');
    } catch (error) {
      showToast(messageOf(error, 'Unable to remove item.'), 'error');
    }
  }

  async function updateQuantity(itemId: string, quantity: number): Promise<void> {
    const epoch = epochRef.current;
    try {
      const items = await cartLib.updateServerCartItem(itemId, Math.max(1, quantity));
      applyResult(epoch, items);
    } catch (error) {
      showToast(messageOf(error, 'Unable to update quantity.'), 'error');
    }
  }

  async function clearCart(): Promise<void> {
    const epoch = epochRef.current;
    try {
      await cartLib.clearServerCart();
      applyResult(epoch, []);
    } catch (error) {
      showToast(messageOf(error, 'Unable to clear cart.'), 'error');
    }
  }

  // Cart Model completion (Flexible Commerce Architecture §4) - the nav badge counts distinct
  // cart lines ("2 listings in your cart"), never the sum of physical unit quantities. A single
  // 20,000-piece order must show "1" on the icon, not "20000".
  const count = cart.length;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, count, total, loading, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
