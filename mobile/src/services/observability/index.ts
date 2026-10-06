import { ConsoleLogger } from './ConsoleLogger';
import { MockAnalyticsService } from './MockAnalyticsService';
import { MockCrashReportingService } from './MockCrashReportingService';
import { MockPerformanceMonitoringService } from './MockPerformanceMonitoringService';
import type { AnalyticsService } from './AnalyticsService';
import type { CrashReportingService } from './CrashReportingService';
import type { Logger } from './Logger';
import type { PerformanceMonitoringService } from './PerformanceMonitoringService';

export type { Logger, LogContext } from './Logger';
export type { AnalyticsService, AnalyticsProperties } from './AnalyticsService';
export type { CrashReportingService, CrashContext } from './CrashReportingService';
export type { PerformanceMonitoringService, PerformanceTraceHandle } from './PerformanceMonitoringService';
export { ConsoleLogger } from './ConsoleLogger';
export { MockAnalyticsService } from './MockAnalyticsService';
export { MockCrashReportingService } from './MockCrashReportingService';
export { MockPerformanceMonitoringService } from './MockPerformanceMonitoringService';

/**
 * Single wiring point for all four observability services. Every implementation here is a mock
 * (console-backed, no network, no SDK) regardless of environment - no real provider (Firebase,
 * Sentry, App Center, Crashlytics, Mixpanel, Azure Monitor) is integrated this phase. When one is
 * chosen, only this file changes: swap the constructed class per `env.appEnv`, exactly like every
 * repository factory in `src/repositories/*­/index.ts` already does.
 */
export const logger: Logger = new ConsoleLogger();
export const analyticsService: AnalyticsService = new MockAnalyticsService();
export const crashReportingService: CrashReportingService = new MockCrashReportingService();
export const performanceMonitoringService: PerformanceMonitoringService = new MockPerformanceMonitoringService();
