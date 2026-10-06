import type { Attachment, AttachmentPurpose, JobDetails, WorkflowAction, WorkflowExecutionResult } from '@/models';
import type { RawCapturedPhoto } from '@/executors/attachmentExecutor';

export interface JobWorkspaceData {
  job: JobDetails;
  availableActions: WorkflowAction[];
}

/**
 * The single orchestration layer the Job Workspace screen depends on - not a repository itself,
 * and not a place for business logic. It coordinates calls across `JobDetailsRepository`,
 * `WorkflowRepository`, and (as of the Evidence Capture framework) `AttachmentExecutor` - never
 * `AttachmentsRepository` directly, per Part 0's architecture (Facade -> Executor -> Repository).
 * This is where any future repository (Parts, Inventory, Notes, Notifications) plugs in without
 * the screen needing to know about it directly.
 *
 * What it must never do: decide which actions are allowed, run a workflow state machine,
 * validate business rules, change a job's status itself, or calculate permissions. It relays
 * exactly what the repositories/executors return. All of that stays in the backend.
 */
export interface JobWorkspaceFacade {
  /** Loads everything the Job Workspace screen renders in one call. */
  loadWorkspace(jobId: string): Promise<JobWorkspaceData>;
  /** Executes one action the backend already offered via `loadWorkspace`'s `availableActions` -
   * never an action the facade invented or validated itself. On success, refreshes this job's own
   * data and every dependent module's cache (Dashboard, My Jobs). */
  executeAction(jobId: string, actionId: string): Promise<WorkflowExecutionResult>;
  /** Evidence Capture: lists attachments for a job, via the executor. */
  getAttachments(jobId: string): Promise<Attachment[]>;
  /** Evidence Capture: hands an already-captured camera photo to the executor's flow (validate,
   * compress, preview, persist), then refreshes this job's attachment list. */
  captureAttachmentFromCamera(jobId: string, purpose: AttachmentPurpose, photo: RawCapturedPhoto): Promise<Attachment>;
  /** Evidence Capture: opens the gallery picker via the executor and persists whatever was
   * selected, then refreshes this job's attachment list. */
  captureAttachmentsFromGallery(jobId: string, purpose: AttachmentPurpose): Promise<Attachment[]>;
}
