/** Handle returned by `startTrace` - call `stop()` once the measured span of work is complete. */
export interface PerformanceTraceHandle {
  stop(): void;
}

/**
 * Performance-monitoring abstraction (named traces + point-in-time metrics). No provider is
 * integrated this phase; a future implementation (Firebase Performance, App Center, or a custom
 * backend endpoint) plugs in behind this interface without touching call sites.
 */
export interface PerformanceMonitoringService {
  startTrace(name: string): PerformanceTraceHandle;
  recordMetric(name: string, value: number): void;
}
