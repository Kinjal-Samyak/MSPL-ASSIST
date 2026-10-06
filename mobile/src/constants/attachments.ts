import type { AttachmentPurpose, AttachmentType } from '@/models';

/** Configurable limits the Evidence Capture framework validates against - referenced by name
 * everywhere, never a magic number inline. */
export const ATTACHMENT_LIMITS = {
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxAttachmentsPerJob: 20,
  maxGallerySelection: 5,
  supportedMimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'] as const,
} as const;

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  PHOTO: 'Photo',
  DOCUMENT: 'Document',
  VIDEO: 'Video',
  SIGNATURE: 'Signature',
  QR_CODE: 'QR Code',
};

export const ATTACHMENT_PURPOSE_LABELS: Record<AttachmentPurpose, string> = {
  BEFORE_SERVICE: 'Before Service',
  AFTER_SERVICE: 'After Service',
  DAMAGE: 'Damage',
  PART_REPLACEMENT: 'Part Replacement',
  CUSTOMER_CONFIRMATION: 'Customer Confirmation',
  GENERAL: 'General',
};

/** Only PHOTO is actually capturable this phase (camera + gallery); the rest of `AttachmentType`
 * exists in the model for future extension without a shape change. */
export const CAPTURABLE_ATTACHMENT_TYPES: readonly AttachmentType[] = ['PHOTO'];

export const ATTACHMENT_PURPOSE_OPTIONS: readonly AttachmentPurpose[] = [
  'BEFORE_SERVICE',
  'AFTER_SERVICE',
  'DAMAGE',
  'PART_REPLACEMENT',
  'CUSTOMER_CONFIRMATION',
  'GENERAL',
];
