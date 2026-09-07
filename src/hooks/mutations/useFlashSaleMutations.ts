import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFlashSale, deleteFlashSale, type CreateFlashSaleInput } from '../../lib/flashSales';

export function useCreateFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFlashSaleInput) => createFlashSale(input),
    onSuccess: (result) => {
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'flashSales'] });
        void queryClient.invalidateQueries({ queryKey: ['flashSales'] });
        void queryClient.invalidateQueries({ queryKey: ['home'] });
      }
    },
  });
}

export function useDeleteFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFlashSale(id),
    onSuccess: (ok) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'flashSales'] });
        void queryClient.invalidateQueries({ queryKey: ['flashSales'] });
        void queryClient.invalidateQueries({ queryKey: ['home'] });
      }
    },
  });
}
