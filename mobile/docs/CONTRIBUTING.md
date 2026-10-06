# Contribution Guide

## The architecture is frozen

Repositories, facades (`JobWorkspaceFacade`, `PlatformFacade`), the executor
(`AttachmentExecutor`), managers (`OfflineManager`, `SyncManager`, `ConnectivityService`,
`NotificationManager`), navigation, the Design System, and the provider hierarchy do not get
redesigned, reorganised, or have their existing contracts changed without an explicit,
compelling architectural reason discussed and approved first. See
[ARCHITECTURE.md](./ARCHITECTURE.md).

**"Frozen" means preserve existing contracts and behaviour, not "never touch the file again."**
Every phase of this app has extended an existing layer additively — a new method on an interface,
a new file in an existing folder's established shape, a new optional prop. That is expected and
welcome. What's out of bounds is changing what an existing method does, removing a method a
screen already depends on, or moving a file's responsibility to a different layer.

## Before you add a new domain

1. Does it fit `JobWorkspaceFacade` or `PlatformFacade`'s existing responsibility? If yes, extend
   that facade. If it's a genuinely new orchestration concern, a new facade may be warranted — see
   [FACADE_PATTERN.md](./FACADE_PATTERN.md)'s "Should a third facade ever be introduced?"
2. Copy an existing repository's four-file shape (`Interface.ts` + `MockImpl.ts` + `ApiImpl.ts` +
   `index.ts`) — don't invent a new shape. See [REPOSITORY_PATTERN.md](./REPOSITORY_PATTERN.md).
3. No business logic. If your new code is deciding whether something is *allowed* rather than
   just *doing* what it was told, that decision belongs in the backend.
4. Mock data is obviously synthetic, never a real business rule guess. See
   [WORKFLOW_FRAMEWORK.md](./WORKFLOW_FRAMEWORK.md) for why `MockWorkflowRepository` returns a
   deliberately neutral placeholder action instead of real transition names.

## Before every commit touching `.ts`/`.tsx`

```bash
cd mobile
npx tsc --noEmit       # zero errors, non-negotiable
npm test                # all suites green
npx expo-doctor         # zero issues
```

Before a release-facing change, also run an Android bundle export as a smoke check (deleted
afterward, it is not a build artifact to commit):

```bash
npx expo export --platform android
rm -rf dist
```

## Adding a test

Colocate it in a `__tests__/` folder next to the file it covers — see
[TESTING.md](./TESTING.md). Remember `@testing-library/react-native` v14's `render`/`renderHook`/
`act`/`unmount` are all async and must be awaited.

## Adding an observability call

Import from `@/services` (`logger`, `analyticsService`, `crashReportingService`,
`performanceMonitoringService`) — never call `console.*` directly in new code, and never import a
third-party SDK directly (none is integrated; see [OBSERVABILITY.md](./OBSERVABILITY.md)).

## Decoupled from the root workspace, intentionally

`mobile/` is not in the root `package.json`'s `workspaces` list and has its own `package.json`,
`node_modules`, and `tsconfig.json`. Don't add mobile as a workspace member or hoist its
dependencies to the root — this decoupling is deliberate so mobile's Expo SDK/React/React Native
version constraints never collide with the web app's.
