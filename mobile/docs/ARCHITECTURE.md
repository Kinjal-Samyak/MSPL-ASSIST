# Architecture

MSPL Assist Mobile is an Expo/React Native (SDK 57, RN 0.86, React 19) technician console. The
architecture is frozen as of this document — see [CONTRIBUTING.md](./CONTRIBUTING.md) before
changing any layer described here.

## Layering

```
Screen (React component)
  -> Hook (React Query wrapper)
    -> Facade (JobWorkspaceFacade | PlatformFacade)
      -> Executor (AttachmentExecutor)  [job-domain only, capture-flow orchestration]
      -> Manager (ConnectivityService | OfflineManager | SyncManager | NotificationManager)
        -> Repository (XRepository: Mock | Api)
          -> ApiClient (axios) -> backend   [ApiXRepository only; not implemented yet]
```

Dependency direction is strictly downward. A screen never imports a repository directly; a
repository never imports a facade; a manager never imports a screen. Every file's own header
comment states which layer it belongs to and what it must never do — read that comment before
extending a file.

**The backend is the only owner of business rules.** No layer in this app decides which workflow
actions are valid, computes a job's status, or runs a state machine — it relays exactly what a
repository (eventually backed by a real API) returns. See
[WORKFLOW_FRAMEWORK.md](./WORKFLOW_FRAMEWORK.md) for how this is enforced concretely.

## Folder structure

```
src/
  api/            axios client, error normalisation (ApiError), shared request types
  components/     shared Design System components (buttons, cards, inputs, loaders, modals, typography, common)
  config/         env.ts (the only file allowed to read process.env), api.ts, index.ts
  constants/      STORAGE_KEYS, attachment constants
  executors/      AttachmentExecutor - job-domain capture-flow orchestration
  facades/        JobWorkspaceFacade (job-specific), PlatformFacade (app-wide)
  hooks/          React Query hooks - the only thing screens call into
  models/         presentation-layer types, deliberately mirroring backend DTOs
  navigation/     RootNavigator / AuthNavigator / MainNavigator / RouteGuard
  platform/       ConnectivityService, OfflineManager, SyncManager, NotificationManager, BackgroundSyncManager
  providers/      AppProviders (composition root), AuthProvider
  repositories/   one folder per domain: Interface + MockImpl + ApiImpl + factory index.ts
  screens/        one folder per screen, each with its own components/ subfolder
  services/       cross-cutting singletons: secureStorage, sessionManager, tokenProvider, queryClient, observability/
  store/          Zustand - session shape only (authStore)
  test/           shared test utilities (renderWithProviders)
  theme/          Design System tokens (colors, spacing, radius, typography, elevation, animation)
  types/          shared TS types not specific to one model domain (e.g. auth.types.ts)
  utils/          pure formatting/validation helpers
```

Screens are never reorganised across domains, and no domain repository is imported from outside
its own facade/hook. Both are architectural invariants, not conventions — see
[CODING_STANDARDS.md](./CODING_STANDARDS.md).

## State management

- **React Query** (`@tanstack/react-query`) is the sole data-fetching/caching layer for anything
  repository-backed. One shared `queryClient` (`src/services/queryClient.ts`). Cache invalidation
  by key (`['jobWorkspace', jobId]`, `['dashboard']`, `['jobs']`, `['syncState']`, etc.) is the
  only cross-screen "refresh" mechanism — no direct cross-screen state mutation exists anywhere.
- **Zustand** is used for exactly one store, `authStore` — session shape only
  (user/tokens/isAuthenticated/isInitializing). It is not a general app-state store; do not add a
  second slice to it or a second store for feature state.

## Two facades, not one

- **`JobWorkspaceFacade`** — job-specific: `loadWorkspace`, `executeAction`, `getAttachments`,
  `captureAttachmentFromCamera`, `captureAttachmentsFromGallery`.
- **`PlatformFacade`** — app-wide: connectivity, offline queue, sync, notifications, profile.

They are siblings, not a hierarchy — neither imports the other, and neither imports across the
other's repository domain. See [FACADE_PATTERN.md](./FACADE_PATTERN.md) for the full contract.

## Environment resolution

`src/config/env.ts` is the only file allowed to read `process.env` directly. `env.appEnv`
(`'development' | 'training' | 'production'`) drives every repository factory's Mock-vs-Api
choice (`if (env.appEnv === 'production') return new ApiXRepository(); return new MockXRepository();`).
EAS build profiles (`eas.json`) set `EXPO_PUBLIC_APP_ENV` explicitly per profile so a `preview`
(internal QA/training) build doesn't silently fall through to the `production` branch just because
`__DEV__` is `false` in any non-dev build.
