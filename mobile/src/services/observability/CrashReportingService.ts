export type CrashContext = Record<string, unknown>;

/**
 * Crash/error-reporting abstraction. No provider (Crashlytics, Sentry, App Center) is integrated
 * this phase; this interface exists so the eventual provider is a single swap in
 * `observability/index.ts`, not a search-and-replace across every catch block.
 */
export interface CrashReportingService {
  recordError(error: unknown, context?: CrashContext): void;
  /** Non-fatal breadcrumb - narrates what led up to a later error, without reporting one itself. */
  addBreadcrumb(message: string, category?: string): void;
  /** Associates subsequent reports with a user. Pass `null` on logout. */
  setUser(userId: string | null): void;
}
