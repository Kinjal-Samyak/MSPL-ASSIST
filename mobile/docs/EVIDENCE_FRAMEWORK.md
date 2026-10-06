# Evidence Capture Framework

## Layering

```
CameraCaptureModal (UI, expo-camera CameraView)  ---\
                                                       -> AttachmentExecutor -> AttachmentsRepository
expo-image-picker (gallery, plain async call)    ---/
```

`AttachmentExecutor` (`src/executors/attachmentExecutor/`) owns the capture *flow* — validate,
compress (placeholder), generate a preview (placeholder), then persist via
`AttachmentsRepository` — never the backend or the live camera view directly.

```ts
interface AttachmentExecutor {
  processCapturedPhoto(context: CaptureContext, photo: RawCapturedPhoto): Promise<Attachment>;
  pickFromGallery(context: CaptureContext): Promise<Attachment[]>;
  listAttachments(jobId: string): Promise<Attachment[]>;
}
```

"Open Camera" is split across the executor and a UI component out of technical necessity: a live
camera preview must be a rendered React view, so the executor only picks up the flow *after* a
photo is captured. "Open Gallery" has no such constraint — `pickFromGallery` opens the system
picker itself.

`JobWorkspaceFacade` calls the executor, never `AttachmentsRepository` directly — that indirection
is Part 0's architecture: **Facade → Executor → Repository**, not Facade → Repository, for this one
domain.

## Taxonomy

- `AttachmentType`: `PHOTO | DOCUMENT | VIDEO | SIGNATURE | QR_CODE` — only `PHOTO` is capturable
  today.
- `AttachmentPurpose`: `BEFORE_SERVICE | AFTER_SERVICE | DAMAGE | PART_REPLACEMENT |
  CUSTOMER_CONFIRMATION | GENERAL` — MSPL-specific; the backend does not validate this field yet.
- `AttachmentStatus`: `QUEUED | UPLOADING | UPLOADED | FAILED`.
- `AttachmentSource`: `CAMERA | GALLERY`.

## A known gap: attachment upload status is simulated independently of the offline queue

`MockAttachmentsRepository` runs its own `setInterval`-driven QUEUED→UPLOADING→UPLOADED/FAILED
simulation, entirely separate from `OfflineManager`/`SyncManager`. An attachment captured while
offline is not actually queued through the generic offline-queue framework — see
[OFFLINE_FRAMEWORK.md](./OFFLINE_FRAMEWORK.md) for why, and the Production Readiness Review for the
recommendation to reconcile the two before backend integration.

## Backend contract (expected shape, not implemented)

```
POST /api/v1/mobile/job-cards/:jobCardId/attachments   (multipart)
Response: { id, fileUrl, thumbnailUrl, fileType, uploadedAt }
```
