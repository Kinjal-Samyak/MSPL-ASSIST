import type { Attachment, AttachmentPurpose } from '@/models';

export interface CaptureContext {
  jobId: string;
  purpose: AttachmentPurpose;
}

/** A photo the caller already acquired (e.g. from the in-app camera modal's shutter). */
export interface RawCapturedPhoto {
  uri: string;
  mimeType: string;
  fileSize: number;
  fileName: string;
}

/**
 * Manages the evidence capture *flow* - validate, compress (placeholder), generate a preview,
 * then pass the result to `AttachmentsRepository`. No business rules live here: it doesn't decide
 * which purposes are valid, doesn't enforce a workflow, and doesn't talk to the backend directly.
 *
 * "Open Camera" is split across this executor and a UI component out of technical necessity: a
 * live camera preview has to be a rendered React view (`CameraCaptureModal`, using
 * `expo-camera`'s `CameraView`), so this executor picks up the flow *after* a photo is already
 * captured (`processCapturedPhoto`). "Open Gallery" has no such constraint - `expo-image-picker`'s
 * picker is a plain async call, so this executor owns opening it directly (`pickFromGallery`).
 */
export interface AttachmentExecutor {
  processCapturedPhoto(context: CaptureContext, photo: RawCapturedPhoto): Promise<Attachment>;
  /** Opens the system gallery picker itself; resolves to `[]` if the user cancels. */
  pickFromGallery(context: CaptureContext): Promise<Attachment[]>;
  listAttachments(jobId: string): Promise<Attachment[]>;
}
