import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminVerifyPayment,
  adminRefundPayment,
  adminResolveIssue,
  adminReprocessWebhook,
} from '../../lib/payments';

export function useAdminVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminVerifyPayment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payments', 'admin'] });
    },
  });
}

export function useAdminRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: number; amount: number; reason: string }) =>
      adminRefundPayment(id, amount, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payments', 'admin'] });
    },
  });
}

export function useAdminResolveIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => adminResolveIssue(id, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payments', 'admin'] });
    },
  });
}

export function useAdminReprocessWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminReprocessWebhook(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payments', 'admin'] });
    },
  });
}
