import { useQuery } from '@tanstack/react-query';
import { normalizeError } from '@/api';
import { jobsRepository } from '@/repositories/jobs';
import type { JobListItem } from '@/models';

interface UseJobsResult {
  data: JobListItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** The My Jobs screen's only data dependency - depends solely on `JobsRepository` via React Query. */
export function useJobs(): UseJobsResult {
  const query = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsRepository.getMyJobs(),
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.isError ? normalizeError(query.error).message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}
