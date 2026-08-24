import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyQuotes, getQuoteById, getReceivedQuotes } from '../../lib/quotes';
import type { QuoteRequest } from '../../types';

export function useMyQuotes() {
  return useQuery<QuoteRequest[]>({
    queryKey: ['quotes', 'me'],
    queryFn: () => getMyQuotes(),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useReceivedQuotes() {
  return useQuery<QuoteRequest[]>({
    queryKey: ['quotes', 'received'],
    queryFn: () => getReceivedQuotes(),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useQuote(id?: string) {
  const queryClient = useQueryClient();

  return useQuery<QuoteRequest | null>({
    queryKey: ['quotes', 'detail', id],
    queryFn: () => (id ? getQuoteById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: () => {
      if (!id) return undefined;
      const cachedQueries = queryClient.getQueriesData<QuoteRequest[]>({ queryKey: ['quotes'] });
      for (const [, list] of cachedQueries) {
        if (Array.isArray(list)) {
          const match = list.find((q) => String(q.id) === String(id));
          if (match) return match;
        }
      }
      return undefined;
    },
  });
}
