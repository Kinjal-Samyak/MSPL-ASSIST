import type { CrashContext, CrashReportingService } from './CrashReportingService';
import { redactContext } from './redact';

/** Dev-console-backed `CrashReportingService`. No provider SDK, no network calls. */
export class MockCrashReportingService implements CrashReportingService {
  recordError(error: unknown, context?: CrashContext): void {
    if (!__DEV__) return;
    console.error('[crash] recordError', error, redactContext(context) ?? '');
  }

  addBreadcrumb(message: string, category?: string): void {
    if (!__DEV__) return;
    console.info(`[crash] breadcrumb${category ? ` (${category})` : ''}: ${message}`);
  }

  setUser(userId: string | null): void {
    if (!__DEV__) return;
    console.info(`[crash] setUser: ${userId ?? 'null'}`);
  }
}
