import { QueryClient } from '@tanstack/react-query';

/**
 * A single shared QueryClient instance for the whole app. Default options are conservative
 * mobile-appropriate defaults (retry once, no refetch-on-focus since RN has no window focus
 * concept) - no query/mutation definitions live here, those belong to each feature.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
