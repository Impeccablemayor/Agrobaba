import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addProduct, deleteProduct, type AddProductInput } from '../../lib/products';

export function useAddProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddProductInput) => addProduct(data),
    onSuccess: (result) => {
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: (ok) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
  });
}
