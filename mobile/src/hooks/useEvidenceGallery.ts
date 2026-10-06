import { useQuery } from '@tanstack/react-query';
import { normalizeError } from '@/api';
import { jobWorkspaceFacade } from '@/facades/jobWorkspace';
import type { Attachment } from '@/models';

interface UseEvidenceGalleryResult {
  data: Attachment[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 500;

/** Depends only on `jobWorkspaceFacade` (never `AttachmentsRepository` directly). Polls while any
 * attachment is still QUEUED/UPLOADING so the Upload Queue's progress is visible without the user
 * pulling to refresh, and stops polling once every attachment has settled. */
export function useEvidenceGallery(jobId: string): UseEvidenceGalleryResult {
  const query = useQuery({
    queryKey: ['jobWorkspaceAttachments', jobId],
    queryFn: () => jobWorkspaceFacade.getAttachments(jobId),
    refetchInterval: (currentQuery) => {
      const hasPending = currentQuery.state.data?.some((item) => item.status === 'QUEUED' || item.status === 'UPLOADING');
      return hasPending ? POLL_INTERVAL_MS : false;
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.isError ? normalizeError(query.error).message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}
