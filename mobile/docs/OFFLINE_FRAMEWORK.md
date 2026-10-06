# Offline Framework

`OfflineManager` (`src/platform/`) fronts `OfflineRepository`, which holds a queue of
`QueuedOperation` objects:

```ts
interface QueuedOperation {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  lastError?: string;
}
```

`SyncManager` subscribes to `ConnectivityService` and calls `autoSync()` whenever the device comes
back online, plus supports a manual `triggerSync()`. `sync()` guards against re-entrancy, iterates
non-`SYNCING` items (so both `PENDING` and previously-`FAILED` items are retried), and for each
item: `markSyncing` → simulated delay → `SIMULATED_FAILURE_RATE = 0.1` chance of `markFailed`, else
`removeOperation`.

## What this framework is, honestly, today

It is a **complete, working, but currently unconnected** subsystem. `operation.type` and
`operation.payload` are never read or dispatched anywhere — there is no mapping from a queued
operation's type to an actual repository call. Nothing in the app currently calls
`queueOfflineOperation()`; neither workflow-action execution nor attachment upload routes through
it. This is by design for this phase (Phase 9 scoped the framework, not its wiring) — see
`docs/../ARCHITECTURE.md` and the Production Readiness Review for what wiring it up would involve.

## Known gaps (see Production Readiness Review for recommendations)

- **In-memory only.** `MockOfflineRepository`'s queue is a `private queue: QueuedOperation[]` on
  the class instance — an app kill loses every queued item. `secureStorage` (SecureStore) is not a
  suitable backing store for this (small-value, encrypted-secret use case, not a growing queue);
  `expo-sqlite` is the natural fit for a real implementation.
- **IDs are not real UUIDs.** `` `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` ``
  is not collision-safe enough to serve as a backend idempotency key.
- **No retry cap or backoff.** A permanently-failing operation retries on every sync forever.
- **No conflict detection.** Expected in the absence of a backend, but worth stating explicitly as
  a pre-integration design gap, not an oversight.

## Backend contract (expected shape, not implemented)

```
POST /api/v1/mobile/sync/operations
Body: { operations: [{ id, type, payload, createdAt }] }
Response: { results: [{ id, status: 'APPLIED' | 'REJECTED' | 'CONFLICT', error?, serverEntityId? }] }
```
