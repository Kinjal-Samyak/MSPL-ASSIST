import { useState } from 'react';
import { Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button, Card, EmptyState, Loader, Typography } from '@/components';
import { useAttachmentCapture, useEvidenceGallery, usePermission, useTheme } from '@/hooks';
import { ATTACHMENT_LIMITS } from '@/constants';
import type { Attachment, AttachmentPurpose } from '@/models';
import type { RawCapturedPhoto } from '@/executors/attachmentExecutor';
import { CameraCaptureModal } from './CameraCaptureModal';
import { CapturePurposeSheet } from './CapturePurposeSheet';
import { EvidencePreviewModal } from './EvidencePreviewModal';
import { EvidenceThumbnail } from './EvidenceThumbnail';
import { PermissionDeniedNotice } from './PermissionDeniedNotice';

export interface EvidenceGallerySectionProps {
  jobId: string;
}

/**
 * Replaces the read-only `AttachmentsCard` from the Job Workspace phase. Depends only on
 * `useEvidenceGallery`/`useAttachmentCapture` (both wrapping `jobWorkspaceFacade`) - never
 * `AttachmentsRepository` or `AttachmentExecutor` directly.
 */
export function EvidenceGallerySection({ jobId }: EvidenceGallerySectionProps) {
  const { theme } = useTheme();
  const { data: attachments, isLoading, error } = useEvidenceGallery(jobId);
  const { captureFromCamera, captureFromGallery, isCapturing, error: captureError } = useAttachmentCapture(jobId);
  const cameraPermission = usePermission('camera');
  const mediaPermission = usePermission('mediaLibrary');

  const [isPurposeSheetOpen, setPurposeSheetOpen] = useState(false);
  const [isCameraOpen, setCameraOpen] = useState(false);
  const [activePurpose, setActivePurpose] = useState<AttachmentPurpose>('GENERAL');
  const [permissionNotice, setPermissionNotice] = useState<{ label: string; state: 'denied' | 'permanently-denied' } | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const atLimit = attachments.length >= ATTACHMENT_LIMITS.maxAttachmentsPerJob;

  const handleChooseCamera = async (purpose: AttachmentPurpose) => {
    setPurposeSheetOpen(false);
    setPermissionNotice(null);
    let state = cameraPermission.state;
    if (state === 'undetermined') {
      state = await cameraPermission.request();
    }
    if (state !== 'granted') {
      setPermissionNotice({ label: 'Camera', state: state === 'permanently-denied' ? 'permanently-denied' : 'denied' });
      return;
    }
    setActivePurpose(purpose);
    setCameraOpen(true);
  };

  const handleChooseGallery = async (purpose: AttachmentPurpose) => {
    setPurposeSheetOpen(false);
    setPermissionNotice(null);
    let state = mediaPermission.state;
    if (state === 'undetermined') {
      state = await mediaPermission.request();
    }
    if (state !== 'granted') {
      setPermissionNotice({ label: 'Photo library', state: state === 'permanently-denied' ? 'permanently-denied' : 'denied' });
      return;
    }
    await captureFromGallery(purpose);
  };

  const handleAcceptPhoto = async (photo: RawCapturedPhoto) => {
    setCameraOpen(false);
    await captureFromCamera(activePurpose, photo);
  };

  const handleThumbnailPress = (attachment: Attachment) => {
    const index = attachments.findIndex((item) => item.id === attachment.id);
    setPreviewIndex(index === -1 ? 0 : index);
  };

  return (
    <Card>
      <View style={styles.headerRow}>
        <Typography variant="title">Evidence</Typography>
        <Button
          label="Add Evidence"
          size="sm"
          leftIcon={<Plus size={14} color={theme.colors.onPrimary} />}
          onPress={() => setPurposeSheetOpen(true)}
          disabled={atLimit || isCapturing}
          loading={isCapturing}
          accessibilityLabel="Add evidence"
        />
      </View>

      {permissionNotice ? (
        <PermissionDeniedNotice
          state={permissionNotice.state}
          label={permissionNotice.label}
          onRequest={() => setPermissionNotice(null)}
          onOpenSettings={() => void (permissionNotice.label === 'Camera' ? cameraPermission : mediaPermission).openSettings()}
        />
      ) : null}

      {captureError ? (
        <Typography variant="body" color="danger" style={{ marginTop: theme.spacing.sm }} accessibilityRole="alert">
          {captureError}
        </Typography>
      ) : null}

      {isLoading ? (
        <Loader label="Loading evidence..." />
      ) : error ? (
        <Typography variant="body" color="danger" style={{ marginTop: theme.spacing.sm }}>
          {error}
        </Typography>
      ) : attachments.length === 0 ? (
        <EmptyState title="No evidence yet" description="Photos captured for this job will appear here." />
      ) : (
        <View style={[styles.grid, { gap: theme.spacing.md, marginTop: theme.spacing.md }]}>
          {attachments.map((attachment) => (
            <EvidenceThumbnail key={attachment.id} attachment={attachment} onPress={handleThumbnailPress} />
          ))}
        </View>
      )}

      <CapturePurposeSheet
        isOpen={isPurposeSheetOpen}
        onClose={() => setPurposeSheetOpen(false)}
        onChooseCamera={(purpose) => void handleChooseCamera(purpose)}
        onChooseGallery={(purpose) => void handleChooseGallery(purpose)}
      />

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onCancel={() => setCameraOpen(false)}
        onAccept={(photo) => void handleAcceptPhoto(photo)}
      />

      <EvidencePreviewModal attachments={attachments} initialIndex={previewIndex} onClose={() => setPreviewIndex(null)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
