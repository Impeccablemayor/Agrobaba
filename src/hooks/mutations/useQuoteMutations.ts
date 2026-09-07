import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  acceptOffer,
  cancelQuote,
  rejectOffer,
  requestQuote,
  sendOffer,
  type RequestQuoteInput,
  type SendOfferInput,
} from '../../lib/quotes';

export function useRequestQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestQuoteInput) => requestQuote(input),
    onSuccess: (result) => {
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
    },
  });
}

export function useSendOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, input }: { quoteId: string; input: SendOfferInput }) => sendOffer(quoteId, input),
    onSuccess: (result) => {
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
    },
  });
}

export function useAcceptOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => acceptOffer(quoteId),
    onSuccess: (result) => {
      if (result) {
        void queryClient.invalidateQueries({ queryKey: ['quotes'] });
        void queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
  });
}

export function useRejectOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => rejectOffer(quoteId),
    onSuccess: (ok) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
    },
  });
}

export function useCancelQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => cancelQuote(quoteId),
    onSuccess: (ok) => {
      if (ok) {
        void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }
    },
  });
}
