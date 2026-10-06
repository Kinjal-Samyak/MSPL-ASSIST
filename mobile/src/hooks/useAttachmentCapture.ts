import { useMutation } from '@tanstack/react-query';
import { normalizeError } from '@/api';
import { jobWorkspaceFacade } from '@/facades/jobWorkspace';
import type { RawCapturedPhoto } from '@/executors/attachmentExecutor';
import type { AttachmentPurpose } from '@/models';

interface UseAttachmentCaptureResult {
  captureFromCamera: (purpose: AttachmentPurpose, photo: RawCapturedPhoto) => Promise<void>;
  captureFromGallery: (purpose: AttachmentPurpose) => Promise<void>;
  isCapturing: boolean;
  error: string | null;
}

/** Depends only on `jobWorkspaceFacade`. Owns none of the capture flow itself (that's
 * `AttachmentExecutor`, via the facade) - just exposes the two entry points as mutations with
 * loading/error state for the UI. */
export function useAttachmentCapture(jobId: string): UseAttachmentCaptureResult {
  const cameraMutation = useMutation({
    mutationFn: ({ purpose, photo }: { purpose: AttachmentPurpose; photo: RawCapturedPhoto }) =>
      jobWorkspaceFacade.captureAttachmentFromCamera(jobId, purpose, photo),
  });

  const galleryMutation = useMutation({
    mutationFn: (purpose: AttachmentPurpose) => jobWorkspaceFacade.captureAttachmentsFromGallery(jobId, purpose),
  });

  const activeError = cameraMutation.error ?? galleryMutation.error;

  return {
    captureFromCamera: async (purpose, photo) => {
      await cameraMutation.mutateAsync({ purpose, photo });
    },
    captureFromGallery: async (purpose) => {
      await galleryMutation.mutateAsync(purpose);
    },
    isCapturing: cameraMutation.isPending || galleryMutation.isPending,
    error: activeError ? normalizeError(activeError).message : null,
  };
}
