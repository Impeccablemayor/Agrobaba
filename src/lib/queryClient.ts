import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 2 minutes by default to avoid rapid refetches across tab/page switches
      staleTime: 2 * 60 * 1000, // 2 minutes
      // Retain unused garbage collection cache for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Only retry once on failure to avoid hammering a failing backend
      retry: 1,
      // Refetch when the tab regains focus so the user always sees current data (respects staleTime)
      refetchOnWindowFocus: true,
      // Refetch on reconnect for seamless offline recovery
      refetchOnReconnect: true,
    },
  },
});
