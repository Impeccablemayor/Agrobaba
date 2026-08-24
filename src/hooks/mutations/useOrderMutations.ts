import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmPayment, placeOrder, updateOrderStatus, verifyOrderPayment, type PaymentInput } from '../../lib/orders';
import type { OrderStatus } from '../../types';

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: (order) => {
      if (order) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, paymentData }: { orderId: string; paymentData: PaymentInput }) =>
      confirmPayment(orderId, paymentData),
    onSuccess: (ok, { orderId }) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        void queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      }
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => verifyOrderPayment(orderId),
    onSuccess: (ok, orderId) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        void queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
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
        void queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      }
    },
  });
}
