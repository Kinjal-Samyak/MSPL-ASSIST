import { useQuery } from '@tanstack/react-query';
import { normalizeError } from '@/api';
import { dashboardRepository } from '@/repositories/dashboard';
import type { DashboardData } from '@/models';

interface UseDashboardResult {
  data: DashboardData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * The Dashboard screen's only data dependency - talks to `dashboardRepository` (the resolved
 * `DashboardRepository`) through React Query, the state-management layer already established in
 * `services/queryClient.ts`. No repository implementation is imported here, and no ticket/job
 * logic lives in this hook - it only shapes loading/error/refresh state for the screen.
 */
export function useDashboard(): UseDashboardResult {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardRepository.getDashboard(),
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.isError ? normalizeError(query.error).message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}
