import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addProduct, deleteProduct, saveServiceListing, updateProduct,
  type AddProductInput, type ServiceListingInput, type UpdateProductInput,
} from '../../lib/products';

/** Product + service saves both change what /api/products returns (cards, detail, my listings). */
function useInvalidateListings() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['services'] });
  };
}

export function useUpdateProduct() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) => updateProduct(id, data),
    onSuccess: (result) => { if (result) invalidate(); },
  });
}

/** Create (no id) or update (with id) a service listing; publish=false saves a draft. */
export function useSaveServiceListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ input, productId }: { input: ServiceListingInput; productId?: string }) => saveServiceListing(input, productId),
    onSuccess: (result) => { if (result) invalidate(); },
  });
}

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
