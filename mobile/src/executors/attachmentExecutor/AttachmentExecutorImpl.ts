import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '@/api';
import { ATTACHMENT_LIMITS } from '@/constants';
import { attachmentsRepository, type AttachmentsRepository } from '@/repositories/attachments';
import type { AddAttachmentInput, Attachment } from '@/models';
import type { AttachmentExecutor, CaptureContext, RawCapturedPhoto } from './AttachmentExecutor';

function validate(photo: { mimeType: string; fileSize: number }): void {
  if (!ATTACHMENT_LIMITS.supportedMimeTypes.includes(photo.mimeType as (typeof ATTACHMENT_LIMITS.supportedMimeTypes)[number])) {
    throw new ApiError(`Unsupported file format: ${photo.mimeType}.`);
  }
  if (photo.fileSize > ATTACHMENT_LIMITS.maxFileSizeBytes) {
    const maxMb = (ATTACHMENT_LIMITS.maxFileSizeBytes / (1024 * 1024)).toFixed(0);
    throw new ApiError(`This file is larger than the ${maxMb} MB limit.`);
  }
}

/** Placeholder - no real compression yet (would use e.g. expo-image-manipulator once the backend
 * cares about upload size). Returns the input unchanged; the seam exists so real compression can
 * be dropped in here without touching any caller. */
async function compress(uri: string): Promise<string> {
  return uri;
}

/** Placeholder - the locally captured file already IS a usable preview until the backend
 * generates a real thumbnail on upload, so this just returns the same uri. Kept as its own step
 * so a real thumbnail pipeline has an obvious place to attach later. */
async function generatePreview(uri: string): Promise<string> {
  return uri;
}

export class AttachmentExecutorImpl implements AttachmentExecutor {
  constructor(private readonly attachments: AttachmentsRepository = attachmentsRepository) {}

  async processCapturedPhoto(context: CaptureContext, photo: RawCapturedPhoto): Promise<Attachment> {
    validate(photo);
    const compressedUri = await compress(photo.uri);
    const previewUri = await generatePreview(compressedUri);

    const input: AddAttachmentInput = {
      jobId: context.jobId,
      type: 'PHOTO',
      purpose: context.purpose,
      source: 'CAMERA',
      localUri: previewUri,
      mimeType: photo.mimeType,
      fileName: photo.fileName,
      fileSize: photo.fileSize,
    };
    return this.attachments.addAttachment(input);
  }

  async pickFromGallery(context: CaptureContext): Promise<Attachment[]> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new ApiError('Photo library permission is required to select photos.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: ATTACHMENT_LIMITS.maxGallerySelection,
      quality: 1,
    });

    if (result.canceled) {
      return [];
    }

    const attachments: Attachment[] = [];
    for (const asset of result.assets) {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const fileSize = asset.fileSize ?? 0;
      const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg';

      validate({ mimeType, fileSize });
      const compressedUri = await compress(asset.uri);
      const previewUri = await generatePreview(compressedUri);

      const attachment = await this.attachments.addAttachment({
        jobId: context.jobId,
        type: 'PHOTO',
        purpose: context.purpose,
        source: 'GALLERY',
        localUri: previewUri,
        mimeType,
        fileName,
        fileSize,
      });
      attachments.push(attachment);
    }

    return attachments;
  }

  async listAttachments(jobId: string): Promise<Attachment[]> {
    return this.attachments.getAttachments(jobId);
  }
}
