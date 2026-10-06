import type { PerformanceMonitoringService, PerformanceTraceHandle } from './PerformanceMonitoringService';

/** Dev-console-backed `PerformanceMonitoringService`, timed via `Date.now()`. No provider SDK. */
export class MockPerformanceMonitoringService implements PerformanceMonitoringService {
  startTrace(name: string): PerformanceTraceHandle {
    const startedAt = Date.now();
    return {
      stop: () => {
        if (!__DEV__) return;
        console.info(`[perf] trace "${name}" took ${Date.now() - startedAt}ms`);
      },
    };
  }

  recordMetric(name: string, value: number): void {
    if (!__DEV__) return;
    console.info(`[perf] metric "${name}" = ${value}`);
  }
}
