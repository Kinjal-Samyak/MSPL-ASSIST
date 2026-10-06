import { useMutation, useQuery } from '@tanstack/react-query';
import { normalizeError } from '@/api';
import { jobWorkspaceFacade } from '@/facades/jobWorkspace';
import type { JobWorkspaceData } from '@/facades/jobWorkspace';

interface UseJobWorkspaceResult {
  data: JobWorkspaceData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  executeAction: (actionId: string) => void;
  isExecutingAction: boolean;
  executingActionId: string | null;
  actionError: string | null;
}

/**
 * The Job Workspace screen's only data dependency. Depends solely on `jobWorkspaceFacade` - never
 * on `JobDetailsRepository` or `WorkflowRepository` directly, so this hook (and the screen using
 * it) never coordinates multiple repositories itself. Automatic refresh after a successful action
 * comes from the facade invalidating this hook's query key; this hook doesn't need to know that
 * happened, it just re-renders when React Query re-fetches.
 */
export function useJobWorkspace(jobId: string): UseJobWorkspaceResult {
  const query = useQuery({
    queryKey: ['jobWorkspace', jobId],
    queryFn: () => jobWorkspaceFacade.loadWorkspace(jobId),
  });

  const mutation = useMutation({
    mutationFn: (actionId: string) => jobWorkspaceFacade.executeAction(jobId, actionId),
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.isError ? normalizeError(query.error).message : null,
    refresh: async () => {
      await query.refetch();
    },
    executeAction: (actionId: string) => mutation.mutate(actionId),
    isExecutingAction: mutation.isPending,
    executingActionId: mutation.isPending ? (mutation.variables ?? null) : null,
    actionError: mutation.isError ? normalizeError(mutation.error).message : null,
  };
}
