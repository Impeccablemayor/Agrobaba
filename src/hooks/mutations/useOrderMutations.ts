import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelOrder, placeOrder, updateOrderStatus } from '../../lib/orders';
import type { CartItem, OrderStatus } from '../../types';
import type { DeliveryInput } from '../../lib/orders';

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cart, delivery }: { cart: CartItem[]; delivery?: DeliveryInput }) => placeOrder(cart, delivery ?? {}),
    onSuccess: (order) => {
      if (order) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => updateOrderStatus(orderId, status),
    onSuccess: (ok, { orderId }) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        void queryClient.invalidateQueries({ queryKey: ['orders', 'detail', orderId] });
      }
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) => cancelOrder(orderId, reason),
    onSuccess: (ok, { orderId }) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        void queryClient.invalidateQueries({ queryKey: ['orders', 'detail', orderId] });
        void queryClient.invalidateQueries({ queryKey: ['admin'] });
        void queryClient.invalidateQueries({ queryKey: ['products'] }); // stock was released
      }
    },
  });
}
