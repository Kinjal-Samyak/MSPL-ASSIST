# Platform Services

`src/platform/` holds four managers, each following the same three-file shape as a repository
(`Interface.ts` + `Impl.ts` + `Instance.ts`, barrelled through `platform/index.ts`):

| Manager | Wraps | Real or simulated today |
|---|---|---|
| `ConnectivityService` | `expo-network` (`getNetworkStateAsync`/`addNetworkStateListener`) | **Real** — the only platform service backed by an actual native API this phase |
| `OfflineManager` | `OfflineRepository` (Mock: in-memory array) | Simulated — see [OFFLINE_FRAMEWORK.md](./OFFLINE_FRAMEWORK.md) |
| `SyncManager` | `OfflineManager` + a simulated replay loop | Simulated — see [OFFLINE_FRAMEWORK.md](./OFFLINE_FRAMEWORK.md) |
| `NotificationManager` | `NotificationRepository` (Mock: 5 fixed notifications) | Simulated — see [NOTIFICATION_FRAMEWORK.md](./NOTIFICATION_FRAMEWORK.md) |

A fifth file, `BackgroundSyncManager`, exists as an interface-only placeholder (`SyncScheduler`,
`RetryScheduler`) with no native background-task integration — intentionally, per the standing
constraint against native background tasks.

## Consumption rule

Screens/hooks never import a manager directly — only `PlatformFacade` does. `useConnectivity`,
`useOfflineQueue`, `useSync`, `useNotifications`, and `useProfile` all depend on `platformFacade`,
not on `connectivityService`/`offlineManager`/etc.

## Observability services (new this phase)

`src/services/observability/` adds four more singletons following the identical
interface-and-mock shape, but they are **not managers** in the platform sense — they're
cross-cutting concerns any layer may call directly (a repository logging a caught error is not an
architectural violation the way a screen bypassing a facade would be):

- `Logger` — `logger.debug/info/warn/error`, redacts sensitive context keys before logging.
- `AnalyticsService` — `analyticsService.trackEvent/identify/reset`.
- `CrashReportingService` — `crashReportingService.recordError/addBreadcrumb/setUser`.
- `PerformanceMonitoringService` — `performanceMonitoringService.startTrace/recordMetric`.

All four are console-backed mocks today — no Firebase/Sentry/App Center/Crashlytics/Mixpanel/Azure
Monitor SDK is integrated. See [OBSERVABILITY.md](./OBSERVABILITY.md).
