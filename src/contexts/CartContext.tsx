import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as cartLib from '../lib/cart';
import { isLoggedIn } from '../lib/auth';
import { showToast } from '../lib/toastBus';
import { recordEvent } from '../lib/behaviorEvents';
import type { CartItem, Product } from '../types';

interface CartContextValue {
  cart: CartItem[];
  count: number;
  total: number;
  addToCart: (product: Product, quantity?: number, size?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => cartLib.getCart());
  const navigate = useNavigate();

  // Cross-tab cart sync (P1): the cart lives in localStorage, so each tab holds its own in-memory
  // copy. When another tab adds/removes/clears items, the browser fires a `storage` event on every
  // *other* tab - grab the fresh value and re-render so two tabs never show divergent carts
  // (the source of "I removed it but it's still here" confusion).
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== 'agrobaba_cart' || event.storageArea !== localStorage) return;
      try {
        const parsed = event.newValue ? JSON.parse(event.newValue) : [];
        setCart(Array.isArray(parsed) ? parsed : []);
      } catch {
        // Ignore garbage in the key; keep showing the current tab's cart.
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function refresh(): void {
    setCart(cartLib.getCart());
  }

  function addToCart(product: Product, quantity = 1, size = 'Standard'): void {
    if (!isLoggedIn()) {
      showToast('Please login to add items to cart.', 'warning');
      navigate('/login');
      return;
    }
    cartLib.addToCart(product, quantity, size);
    recordEvent('add_to_cart', product.id);
    refresh();
  }

  function removeFromCart(itemId: string): void {
    const item = cart.find((i) => i.id === itemId);
    cartLib.removeFromCart(itemId);
    if (item) recordEvent('remove_from_cart', item.productId);
    refresh();
  }

  function updateQuantity(itemId: string, quantity: number): void {
    cartLib.updateCartQuantity(itemId, quantity);
    refresh();
  }

  function clearCart(): void {
    cartLib.clearCart();
    refresh();
  }

  // Cart Model completion (Flexible Commerce Architecture §4) - the nav badge counts distinct
  // cart lines ("2 listings in your cart"), never the sum of physical unit quantities. A single
  // 20,000-piece order must show "1" on the icon, not "20000".
  const count = cart.length;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, count, total, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
