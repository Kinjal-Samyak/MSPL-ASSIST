# Facade Pattern

Screens never depend on a repository, manager, or executor directly — they depend on exactly one
of two facades, via a hook.

## `JobWorkspaceFacade` (`src/facades/jobWorkspace/`)

Job-specific orchestration. Coordinates `JobDetailsRepository`, `WorkflowRepository`, and
`AttachmentExecutor` (never `AttachmentsRepository` directly — see
[EVIDENCE_FRAMEWORK.md](./EVIDENCE_FRAMEWORK.md)).

```ts
interface JobWorkspaceFacade {
  loadWorkspace(jobId: string): Promise<JobWorkspaceData>;
  executeAction(jobId: string, actionId: string): Promise<WorkflowExecutionResult>;
  getAttachments(jobId: string): Promise<Attachment[]>;
  captureAttachmentFromCamera(jobId: string, purpose: AttachmentPurpose, photo: RawCapturedPhoto): Promise<Attachment>;
  captureAttachmentsFromGallery(jobId: string, purpose: AttachmentPurpose): Promise<Attachment[]>;
}
```

On a successful `executeAction`, the implementation invalidates three React Query cache keys —
`['jobWorkspace', jobId]`, `['dashboard']`, `['jobs']` — rather than mutating any screen's state
directly. This is the only "refresh" mechanism in the app.

## `PlatformFacade` (`src/facades/platform/`)

App-wide orchestration: connectivity, offline queue, sync, notifications, profile. Coordinates
`ConnectivityService`, `OfflineManager`, `SyncManager`, `NotificationManager`,
`ProfileRepository`.

```ts
interface PlatformFacade {
  getConnectivityState(): Promise<ConnectivityState>;
  subscribeToConnectivity(listener: (state: ConnectivityState) => void): () => void;
  getOfflineQueue(): Promise<QueuedOperation[]>;
  queueOfflineOperation(type: string, payload: Record<string, unknown>): Promise<QueuedOperation>;
  getSyncState(): Promise<SyncState>;
  triggerSync(): Promise<SyncState>;
  subscribeToSync(listener: (state: SyncState) => void): () => void;
  getNotifications(): Promise<AppNotification[]>;
  getUnreadNotificationCount(): Promise<number>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(): Promise<void>;
  getProfile(): Promise<TechnicianProfile>;
}
```

## Relationship between the two

They are **siblings**, not a hierarchy. Neither imports the other. `JobWorkspaceFacade` never
touches connectivity/sync/notifications; `PlatformFacade` never touches job/workflow/attachment
repositories. A screen that needs both (there are none today) would depend on both facades
directly via two hooks, not through one facade calling the other.

## What a facade must never do

- Decide which workflow actions are valid, or run any state machine.
- Compute a job's status, priority, or any derived business value.
- Make a permission/authorization decision.
- Hold state itself beyond simple in-memory coordination (all real state lives in React Query's
  cache or the repositories/managers beneath the facade).

## Testing a facade

Every facade implementation uses constructor injection with real defaults, so it's testable with
hand-rolled fakes and no mocking framework:

```ts
const facade = new JobWorkspaceFacadeImpl(fakeJobDetails, fakeWorkflow, fakeAttachments);
```

See `src/facades/jobWorkspace/__tests__/JobWorkspaceFacade.test.ts` (unit, fakes) and
`JobWorkspaceFacade.integration.test.ts` (the real Mock repositories wired together, the same way
`jobWorkspaceFacade`'s singleton is wired in the app).

## Should a third facade ever be introduced?

Only for a genuinely new orchestration domain that doesn't fit either existing facade's
responsibility (e.g. a future Parts/Inventory domain would likely warrant its own
`InventoryFacade`, not an addition to `JobWorkspaceFacade`). Extending an existing facade
additively (new method, same responsibility boundary) is always preferred over introducing a new
one; introducing a new one is always preferred over blurring an existing facade's boundary.
