import type { AnalyticsProperties, AnalyticsService } from './AnalyticsService';
import { redactContext } from './redact';

/** Dev-console-backed `AnalyticsService`. No network calls, no provider SDK - purely a seam. */
export class MockAnalyticsService implements AnalyticsService {
  trackEvent(name: string, properties?: AnalyticsProperties): void {
    if (!__DEV__) return;
    console.info(`[analytics] event: ${name}`, redactContext(properties) ?? '');
  }

  identify(userId: string, traits?: AnalyticsProperties): void {
    if (!__DEV__) return;
    console.info(`[analytics] identify: ${userId}`, redactContext(traits) ?? '');
  }

  reset(): void {
    if (!__DEV__) return;
    console.info('[analytics] reset');
  }
}
