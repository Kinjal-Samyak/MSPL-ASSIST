export type LogContext = Record<string, unknown>;

/**
 * App-wide structured logging abstraction. Screens/hooks/repositories should depend on this, not
 * on `console.*` directly, so a future release can point it at a real log sink (e.g. a backend
 * ingestion endpoint) without touching a single call site.
 */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}
