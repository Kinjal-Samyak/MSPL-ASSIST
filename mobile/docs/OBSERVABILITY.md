# Observability

`src/services/observability/` provides four abstraction interfaces, each with a console-backed
mock implementation. No third-party SDK (Firebase, Sentry, App Center, Crashlytics, Mixpanel,
Azure Monitor) is integrated — that is a deliberate standing constraint for this phase, not an
oversight.

## The four services

```ts
logger.debug(message, context?)
logger.info(message, context?)
logger.warn(message, context?)
logger.error(message, error?, context?)

analyticsService.trackEvent(name, properties?)
analyticsService.identify(userId, traits?)
analyticsService.reset()

crashReportingService.recordError(error, context?)
crashReportingService.addBreadcrumb(message, category?)
crashReportingService.setUser(userId | null)

performanceMonitoringService.startTrace(name).stop()
performanceMonitoringService.recordMetric(name, value)
```

Import from `@/services`:

```ts
import { logger, analyticsService, crashReportingService, performanceMonitoringService } from '@/services';
```

## Redaction

Every context object passed to `Logger`/`CrashReportingService` is redacted before it reaches
`console.*`: any key matching `/token|password|secret|mobile|email|otp|pin\b/i` is replaced with
`'[REDACTED]'`. This is a shallow pass — nested objects are not walked — so callers should still
avoid nesting a token or credential under an unexpected key name. See
`src/services/observability/redact.ts` and its tests.

## Current status: interfaces + mocks only, not wired into the app

Per this phase's brief ("Create abstraction interfaces only"), nothing in the existing screens,
facades, managers, or repositories has been changed to call these services. They exist as a ready
seam. Wiring them in — e.g. a top-level error boundary calling `crashReportingService.recordError`,
or `JobWorkspaceFacade.executeAction` calling `performanceMonitoringService.startTrace` — is
follow-up work, not done here, since it would touch files this phase was told to leave alone
(`JobWorkspaceFacade`, `PlatformFacade`) without a specific request to do so.

## Adding a real provider later

Only `src/services/observability/index.ts` changes — swap the constructed class per `env.appEnv`,
exactly like every repository factory in `src/repositories/*/index.ts` already does:

```ts
export const logger: Logger = env.appEnv === 'production' ? new SentryLogger() : new ConsoleLogger();
```

No call site anywhere else in the app changes.
