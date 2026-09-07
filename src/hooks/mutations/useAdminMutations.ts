import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCoupon, deleteCoupon, type CreateCouponInput } from '../../lib/coupons';
import { updateTicketStatus } from '../../lib/tickets';
import type { TicketStatus } from '../../types';

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) => updateTicketStatus(id, status),
    onSuccess: (ok) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
      }
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCouponInput) => createCoupon(input),
    onSuccess: (result) => {
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      }
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: (ok) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      }
    },
  });
}