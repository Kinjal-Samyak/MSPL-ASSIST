import { memo } from 'react';
import { Badge, type BadgeVariant } from '@/components';
import type { AttachmentStatus } from '@/models';

const STATUS_LABEL: Record<AttachmentStatus, string> = {
  QUEUED: 'Queued',
  UPLOADING: 'Uploading',
  UPLOADED: 'Uploaded',
  FAILED: 'Failed',
};

const STATUS_VARIANT: Record<AttachmentStatus, BadgeVariant> = {
  QUEUED: 'neutral',
  UPLOADING: 'info',
  UPLOADED: 'success',
  FAILED: 'danger',
};

export interface UploadStatusBadgeProps {
  status: AttachmentStatus;
  uploadProgress: number;
}

function UploadStatusBadgeComponent({ status, uploadProgress }: UploadStatusBadgeProps) {
  const label = status === 'UPLOADING' ? `Uploading ${uploadProgress}%` : STATUS_LABEL[status];
  return <Badge label={label} variant={STATUS_VARIANT[status]} />;
}

export const UploadStatusBadge = memo(UploadStatusBadgeComponent);
