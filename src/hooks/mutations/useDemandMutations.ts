import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptDemandResponse, addDemand, deleteDemand, respondToDemand, type AcceptResponseInput, type AddDemandInput, type RespondInput } from '../../lib/demands';

export function useAddDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddDemandInput) => addDemand(data),
    onSuccess: (result) => {
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['demands'] });
      }
    },
  });
}

export function useDeleteDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDemand(id),
    onSuccess: (ok) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['demands'] });
      }
    },
  });
}

export function useRespondDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ demandId, responseData }: { demandId: string; responseData: RespondInput }) =>
      respondToDemand(demandId, responseData),
    onSuccess: (ok, { demandId }) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['demands', demandId] });
      }
    },
  });
}

export function useAcceptDemandResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ demandId, responseId, input }: { demandId: string; responseId: string; input: AcceptResponseInput }) =>
      acceptDemandResponse(demandId, responseId, input),
    onSuccess: (order, { demandId }) => {
      if (order) {
        void queryClient.invalidateQueries({ queryKey: ['demands'] });
        void queryClient.invalidateQueries({ queryKey: ['demands', demandId] });
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    },
  });
}
