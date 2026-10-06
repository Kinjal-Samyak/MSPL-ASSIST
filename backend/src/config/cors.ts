import type { CorsOptions } from "cors";

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/** Deployment Readiness Audit, Step 3 (High): CORS previously accepted every origin
 * (`cors()` with no options). Requests with no Origin header (server-to-server calls, curl,
 * health checks) are always allowed - CORS is a browser enforcement mechanism, it has nothing
 * to police there. Outside production, any localhost/127.0.0.1 origin is allowed automatically
 * so local development is never blocked by forgetting to configure CORS_ALLOWED_ORIGINS. In
 * production, only origins explicitly listed in CORS_ALLOWED_ORIGINS are allowed. */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[], isProduction: boolean): boolean {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowed = allowedOrigins.map(normalizeOrigin);

  if (normalizedAllowed.includes(normalizedOrigin)) {
    return true;
  }

  if (!isProduction && LOCALHOST_ORIGIN_PATTERN.test(normalizedOrigin)) {
    return true;
  }

  return false;
}

export function buildCorsOptions(allowedOrigins: string[], isProduction: boolean): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins, isProduction)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin ?? ""} is not allowed by CORS policy.`));
    },
  };
}
