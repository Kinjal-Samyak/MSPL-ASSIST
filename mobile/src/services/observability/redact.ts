const SENSITIVE_KEY_PATTERN = /token|password|secret|mobile|email|otp|pin\b/i;

/**
 * Shallow-redacts values whose key looks sensitive before anything reaches a log line, event
 * payload, or crash breadcrumb. Only a shallow pass - nested objects are stringified rather than
 * walked, which is deliberately conservative (better to over-redact than leak a token inside a
 * nested field this pattern didn't anticipate).
 */
export function redactContext(context: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!context) return context;

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : value])
  );
}
