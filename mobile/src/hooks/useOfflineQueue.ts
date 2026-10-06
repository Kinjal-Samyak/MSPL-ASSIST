import { useQuery } from '@tanstack/react-query';
import { platformFacade } from '@/facades/platform';
import type { QueuedOperation } from '@/models';

interface UseOfflineQueueResult {
  queue: QueuedOperation[];
  pendingCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 2000;

/** Depends only on `platformFacade`. Polls lightly so the Pending Queue Badge stays current while a sync is in progress. */
export function useOfflineQueue(): UseOfflineQueueResult {
  const query = useQuery({
    queryKey: ['offlineQueue'],
    queryFn: () => platformFacade.getOfflineQueue(),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const queue = query.data ?? [];

  return {
    queue,
    pendingCount: queue.filter((item) => item.status !== 'SYNCING').length,
    isLoading: query.isLoading,
    refresh: async () => {
      await query.refetch();
    },
  };
}
