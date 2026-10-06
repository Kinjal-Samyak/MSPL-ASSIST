# Repository Pattern

Every domain (auth, dashboard, jobs, jobDetails, workflow, attachments, offline, notifications,
profile) follows the exact same four-file shape under `src/repositories/<domain>/`:

```
<Domain>Repository.ts      interface only - the contract every consumer depends on
Mock<Domain>Repository.ts  in-memory, obviously-synthetic dev data, simulated latency
Api<Domain>Repository.ts   throws "<Domain> is not implemented yet." - zero axios/backend calls
index.ts                   factory: picks Mock vs Api based on env.appEnv, exports the singleton
```

Example (`src/repositories/notifications/index.ts`):

```ts
function createNotificationRepository(): NotificationRepository {
  if (env.appEnv === 'production') {
    return new ApiNotificationRepository();
  }
  return new MockNotificationRepository();
}

export const notificationRepository: NotificationRepository = createNotificationRepository();
```

## Rules

1. **Nothing outside `repositories/<domain>/index.ts` imports `Mock<Domain>Repository` or
   `Api<Domain>Repository` directly.** Consumers (facades, managers, hooks) depend on the
   interface type and the exported singleton instance only.
2. **Mock implementations contain no business logic** — fixed or lightly-randomised data, never a
   state machine. `MockWorkflowRepository`, for example, deliberately returns one neutral
   "Acknowledge Job" action rather than inventing real MSPL job-card transition names, because
   deciding which actions are valid for which state is the backend's job, not this repository's.
3. **`Api*Repository` implementations are placeholders that throw**, not partial integrations. A
   repository is either fully Mock or fully wired to a real backend call — there is no
   half-implemented middle state.
4. **Constructor injection with a real default**, everywhere a repository is consumed by a
   manager/facade/executor, e.g. `JobWorkspaceFacadeImpl`:
   ```ts
   constructor(
     private readonly jobDetails: JobDetailsRepository = jobDetailsRepository,
     ...
   ) {}
   ```
   This is what makes every facade/manager unit-testable without a mocking framework — tests just
   pass a hand-rolled fake satisfying the interface. See
   `src/facades/jobWorkspace/__tests__/JobWorkspaceFacade.test.ts` for the pattern.

## A known trait, not a bug

Mock repositories return their fixture object directly rather than a deep clone (e.g.
`MockDashboardRepository.getDashboard()` returns the same `MOCK_DASHBOARD` module constant every
call). Consumers must treat returned data as read-only; mutating it will leak across subsequent
calls within the same process. This is documented and tested
(`src/repositories/dashboard/__tests__/MockDashboardRepository.test.ts`) rather than fixed, since
fixing it (deep-cloning on every mock call) is a behavioural change outside this review's scope —
see the Production Readiness Review for the recommendation.

## Building `Api<Domain>Repository` for real

When a backend endpoint exists, only the `Api*Repository` file and its unit tests change. The
factory, the interface, every facade/manager/hook/screen above it, and the Mock implementation are
untouched. This is the entire point of the pattern: backend integration is additive, not a
rewrite.
