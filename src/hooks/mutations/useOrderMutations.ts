import { useMutation, useQueryClient } from '@tanstack/react-query';
import { placeOrder, updateOrderStatus } from '../../lib/orders';
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
