import { KEYS, getStore, setStore } from './storage';
import { showToast } from './toastBus';
import { getCurrentUser } from './auth';
import { getCart, clearCart } from './cart';
import { api } from './api';
import type { CartItem, Order, OrderStatus } from '../types';

export interface DeliveryInput {
  address?: string;
  phone?: string;
  couponCode?: string;
}

interface BackendOrderItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  size: string;
  sellerId: number;
  sellerName: string;
  type: string;
}

interface BackendOrderResponse {
  id: number;
  invoiceNumber: string;
  items: BackendOrderItem[];
  total: number;
  buyerId: number;
  buyerName: string;
  buyerAddress: string;
  buyerPhone: string | null;
  status: string;
  paid: boolean;
  paymentSubmitted: boolean;
  paymentMode: string | null;
  paymentDate: string | null;
  transactionRef: string | null;
  couponCode: string | null;
  discountAmount: number;
  createdAt: string;
  updatedAt: string;
}

function mapOrder(response: BackendOrderResponse): Order {
  const items: CartItem[] = response.items.map((item) => ({
    id: String(item.id),
    productId: String(item.productId),
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    size: item.size,
    image: null,
    sellerId: String(item.sellerId),
    sellerName: item.sellerName,
    type: (item.type as Order['items'][number]['type']) || 'product',
    addedAt: response.createdAt,
  }));

  return {
    id: String(response.id),
    invoiceNumber: response.invoiceNumber,
    items,
    total: response.total,
    buyerId: String(response.buyerId),
    buyerName: response.buyerName,
    buyerAddress: response.buyerAddress,
    buyerPhone: response.buyerPhone,
    status: (response.status as OrderStatus) || 'pending',
    paid: response.paid,
    paymentSubmitted: response.paymentSubmitted,
    paymentMode: response.paymentMode,
    paymentDate: response.paymentDate,
    transactionRef: response.transactionRef,
    couponCode: response.couponCode,
    discountAmount: response.discountAmount,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

export async function placeOrder(deliveryData: DeliveryInput = {}): Promise<Order | false> {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login to place an order.', 'warning');
    return false;
  }

  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your cart is empty!', 'warning');
    return false;
  }

  try {
    const payload = {
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        acceptedQuoteId: item.acceptedQuoteId ? Number(item.acceptedQuoteId) : null,
      })),
      address: deliveryData.address || user.address || '',
      phone: deliveryData.phone || user.contact || '',
      couponCode: deliveryData.couponCode || null,
    };

    const response = await api.post<BackendOrderResponse>('/api/orders', payload);
    const order = mapOrder(response);
    clearCart();
    const orders = getStore<Order>(KEYS.orders);
    orders.push(order);
    setStore(KEYS.orders, orders);
    showToast('Order placed successfully!', 'success');
    return order;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to place order';
    showToast(message, 'error');
    return false;
  }
}

export async function getMyOrders(): Promise<Order[]> {
  const user = getCurrentUser();
  if (!user) return [];
  try {
    const response = await api.get<BackendOrderResponse[]>('/api/orders/me');
    const orders = (response || []).map(mapOrder);
    const localOrders = getStore<Order>(KEYS.orders);
    localOrders.push(...orders.filter((o) => !localOrders.some((existing) => existing.id === o.id)));
    setStore(KEYS.orders, localOrders);
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load orders';
    showToast(message, 'error');
    return getStore<Order>(KEYS.orders)
      .filter((o) => o.buyerId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function getMySales(): Promise<Order[]> {
  const user = getCurrentUser();
  if (!user) return [];
  try {
    const response = await api.get<BackendOrderResponse[]>('/api/orders/sales');
    const orders = (response || []).map(mapOrder);
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load sales';
    showToast(message, 'error');
    return [];
  }
}

export async function getAllOrdersAdmin(): Promise<Order[]> {
  try {
    const response = await api.get<BackendOrderResponse[]>('/api/admin/orders');
    return (response || []).map(mapOrder).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load orders';
    showToast(message, 'error');
    return [];
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const response = await api.get<BackendOrderResponse>(`/api/orders/${id}`);
    return mapOrder(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load order';
    showToast(message, 'error');
    return null;
  }
}

export interface PaymentInput {
  paymentMode: string;
  paymentDate: string;
  transactionNumber: string;
  amount: number;
}

export async function confirmPayment(orderId: string, paymentData: PaymentInput): Promise<boolean> {
  try {
    await api.put(`/api/orders/${orderId}/confirm-payment`, {
      paymentMode: paymentData.paymentMode,
      paymentDate: paymentData.paymentDate,
      transactionNumber: paymentData.transactionNumber,
      amount: paymentData.amount,
    });
    showToast('Payment details submitted! The seller will verify and release your order.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit payment details';
    showToast(message, 'error');
    return false;
  }
}

export async function verifyOrderPayment(orderId: string): Promise<boolean> {
  try {
    await api.put(`/api/orders/${orderId}/verify-payment`);
    showToast('Payment verified. You can now fulfill this order.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify payment';
    showToast(message, 'error');
    return false;
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  try {
    await api.put(`/api/orders/${orderId}/status`, { status });
    showToast(`Order status updated to "${status}".`, 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update order status';
    showToast(message, 'error');
    return false;
  }
}
