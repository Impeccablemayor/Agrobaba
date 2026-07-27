import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as cartLib from '../lib/cart';
import { isLoggedIn } from '../lib/auth';
import { showToast } from '../lib/toastBus';
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
    refresh();
  }

  function removeFromCart(itemId: string): void {
    cartLib.removeFromCart(itemId);
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

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
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
