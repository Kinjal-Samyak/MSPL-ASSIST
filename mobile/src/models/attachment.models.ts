/**
 * Presentation models for the Evidence Capture framework. Mirrors the real backend's
 * `TicketAttachment` (id, fileUrl -> fullImageUrl, fileType -> mimeType, uploadedAt -> capturedAt)
 * where that model already exists, and extends it with fields the backend doesn't have yet -
 * `purpose`, `status`, `uploadProgress`, `thumbnailUrl`, `capturedBy`, `source` - each commented
 * below as forward-looking rather than invented business rules the mobile app enforces. Only
 * PHOTO is actually capturable this phase; the rest of `AttachmentType` exists so the model
 * doesn't need to change shape when they're added.
 */
export type AttachmentType = 'PHOTO' | 'DOCUMENT' | 'VIDEO' | 'SIGNATURE' | 'QR_CODE';

/**
 * MSPL-specific addition alongside `AttachmentType`: the type describes the file format, the
 * purpose describes why it was captured. Not a backend concept yet - the mobile app only presents
 * these options and records the choice; which purposes are required/allowed for which workflow
 * action is a future backend decision, never computed here.
 */
export type AttachmentPurpose =
  | 'BEFORE_SERVICE'
  | 'AFTER_SERVICE'
  | 'DAMAGE'
  | 'PART_REPLACEMENT'
  | 'CUSTOMER_CONFIRMATION'
  | 'GENERAL';

/** Mobile-only concept (no backend equivalent yet) describing where an item sits in the Upload Queue. */
export type AttachmentStatus = 'QUEUED' | 'UPLOADING' | 'UPLOADED' | 'FAILED';

export type AttachmentSource = 'CAMERA' | 'GALLERY';

export interface Attachment {
  id: string;
  type: AttachmentType;
  purpose: AttachmentPurpose;
  mimeType: string;
  /** Null until the backend generates one - the local preview URI is used as a stand-in until then. */
  thumbnailUrl: string | null;
  fullImageUrl: string | null;
  fileName: string;
  /** Bytes. */
  fileSize: number;
  capturedAt: string;
  /** Placeholder - no distinct "captured by" concept beyond the session's own identity yet. */
  capturedBy: string | null;
  status: AttachmentStatus;
  /** 0-100. Meaningful only while status is UPLOADING. */
  uploadProgress: number;
  source: AttachmentSource;
}

/** What the executor hands to the repository after capture/validation - a local file plus the
 * job/type/purpose it belongs to. The repository (not the executor) is what turns this into a
 * persisted `Attachment`. */
export interface AddAttachmentInput {
  jobId: string;
  type: AttachmentType;
  purpose: AttachmentPurpose;
  source: AttachmentSource;
  localUri: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
}
