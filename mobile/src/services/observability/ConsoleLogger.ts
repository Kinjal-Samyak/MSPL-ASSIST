import type { LogContext, Logger } from './Logger';
import { redactContext } from './redact';

/**
 * Dev-console-backed `Logger`. `debug`/`info` are silenced outside `__DEV__` (they're developer
 * noise, not operational signal); `warn`/`error` always surface since a future real sink (a
 * backend log-ingestion endpoint, most likely - no third-party crash/log SDK is being integrated
 * this phase) needs them regardless of build type. All context is redacted before it touches the
 * console.
 */
export class ConsoleLogger implements Logger {
  debug(message: string, context?: LogContext): void {
    if (!__DEV__) return;
    console.debug(`[DEBUG] ${message}`, redactContext(context) ?? '');
  }

  info(message: string, context?: LogContext): void {
    if (!__DEV__) return;
    console.info(`[INFO] ${message}`, redactContext(context) ?? '');
  }

  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, redactContext(context) ?? '');
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, error, redactContext(context) ?? '');
  }
}
