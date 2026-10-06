import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeError } from '@/api';
import { platformFacade } from '@/facades/platform';
import type { SyncState } from '@/models';

interface UseSyncResult {
  state: SyncState;
  sync: () => void;
  isSyncing: boolean;
  error: string | null;
}

const DEFAULT_STATE: SyncState = { status: 'IDLE', pendingCount: 0, lastSyncedAt: null, lastError: null };
const SYNC_QUERY_KEY = ['syncState'];

/** Depends only on `platformFacade`. Also listens for sync state changes triggered outside this
 * hook's own `sync()` call (e.g. automatic sync on reconnect), keeping the UI in step either way. */
export function useSync(): UseSyncResult {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: SYNC_QUERY_KEY, queryFn: () => platformFacade.getSyncState() });

  useEffect(() => {
    const unsubscribe = platformFacade.subscribeToSync((state) => {
      queryClient.setQueryData(SYNC_QUERY_KEY, state);
    });
    return unsubscribe;
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: () => platformFacade.triggerSync(),
    onSuccess: (state) => queryClient.setQueryData(SYNC_QUERY_KEY, state),
  });

  return {
    state: query.data ?? DEFAULT_STATE,
    sync: () => mutation.mutate(),
    isSyncing: mutation.isPending || query.data?.status === 'SYNCING',
    error: mutation.isError ? normalizeError(mutation.error).message : null,
  };
}
