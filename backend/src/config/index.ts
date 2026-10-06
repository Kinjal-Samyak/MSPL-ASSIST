import dotenv from "dotenv";
import { runtimeEnvironment } from "./runtime-environment";

dotenv.config();

function normalizeEnv(value: string | undefined): string {
  return (value ?? "").trim();
}

function parseAllowedOrigins(value: string | undefined): string[] {
  return normalizeEnv(value)
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0);
}

export const config = {
  appName: "MSPL Assist",
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  databaseUrl: normalizeEnv(process.env.DATABASE_URL),
  runtimeEnvironment,
  isProduction: normalizeEnv(process.env.NODE_ENV) === "production",
  cors: {
    allowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
  },
  rateLimit: {
    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? 15 * 60 * 1000),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20),
    globalWindowMs: Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS ?? 15 * 60 * 1000),
    globalMax: Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 300),
  },
  auth: {
    jwtAccessSecret: normalizeEnv(process.env.JWT_ACCESS_SECRET),
    jwtRefreshSecret: normalizeEnv(process.env.JWT_REFRESH_SECRET),
    accessTokenTtlSeconds: Number(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? 900),
    refreshTokenTtlSeconds: Number(process.env.JWT_REFRESH_TOKEN_TTL_SECONDS ?? 604800),
    bcryptSaltRounds: Number(process.env.AUTH_BCRYPT_SALT_ROUNDS ?? 12),
    maxFailedLoginAttempts: Number(process.env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS ?? 5),
  },

  conversation: {
    sessionTimeoutHours: Number(process.env.CONVERSATION_SESSION_TIMEOUT_HOURS ?? 24),
  },
  m365: {
    tenantId: normalizeEnv(process.env.M365_TENANT_ID),
    clientId: normalizeEnv(process.env.M365_CLIENT_ID),
    clientSecret: normalizeEnv(process.env.M365_CLIENT_SECRET),
    redirectUri: normalizeEnv(process.env.M365_REDIRECT_URI),
    scopes: normalizeEnv(process.env.M365_SCOPES),
    tokenEncryptionKey: normalizeEnv(process.env.M365_TOKEN_ENCRYPTION_KEY),
  },
};

const PLACEHOLDER_VALUES = new Set([
  "your-tenant-id",
  "your-app-client-id",
  "your-app-client-secret",
  "base64-encoded-32-byte-key",
  "change-me-access-secret",
  "change-me-refresh-secret",
]);

function isPlaceholder(value: string): boolean {
  const normalized = value.trim();
  const looksLikeBracketPlaceholder = normalized.startsWith("<") && normalized.endsWith(">");
  return PLACEHOLDER_VALUES.has(normalized) || looksLikeBracketPlaceholder;
}

/** Deployment Readiness Audit, Step 1 (Critical): JWT secrets must never fall back to a
 * hardcoded default - that default would sit in version control and let anyone forge a valid
 * access/refresh token for any user. Mirrors validateM365StartupConfig()'s fail-fast shape. */
export function validateAuthStartupConfig(): void {
  const required: Array<{ key: string; value: string }> = [
    { key: "JWT_ACCESS_SECRET", value: config.auth.jwtAccessSecret },
    { key: "JWT_REFRESH_SECRET", value: config.auth.jwtRefreshSecret },
  ];

  const missing = required.filter((entry) => entry.value.length === 0).map((entry) => entry.key);
  if (missing.length > 0) {
    throw new Error(
      `Authentication configuration missing required environment variables: ${missing.join(", ")}. ` +
        "Please set them in backend/.env."
    );
  }

  const placeholders = required.filter((entry) => isPlaceholder(entry.value)).map((entry) => entry.key);
  if (placeholders.length > 0) {
    throw new Error(
      `Authentication configuration contains placeholder values for: ${placeholders.join(", ")}. ` +
        "Replace placeholder values in backend/.env with unique, randomly generated secrets."
    );
  }
}

export function validateM365StartupConfig(): void {
  const required: Array<{ key: string; value: string }> = [
    { key: "M365_TENANT_ID", value: config.m365.tenantId },
    { key: "M365_CLIENT_ID", value: config.m365.clientId },
    { key: "M365_CLIENT_SECRET", value: config.m365.clientSecret },
    { key: "M365_REDIRECT_URI", value: config.m365.redirectUri },
    { key: "M365_SCOPES", value: config.m365.scopes },
    { key: "M365_TOKEN_ENCRYPTION_KEY", value: config.m365.tokenEncryptionKey },
  ];

  const missing = required.filter((entry) => entry.value.length === 0).map((entry) => entry.key);
  if (missing.length > 0) {
    throw new Error(
      `Microsoft 365 configuration missing required environment variables: ${missing.join(", ")}. ` +
        "Please set them in backend/.env."
    );
  }

  const placeholders = required.filter((entry) => isPlaceholder(entry.value)).map((entry) => entry.key);
  if (placeholders.length > 0) {
    throw new Error(
      `Microsoft 365 configuration contains placeholder values for: ${placeholders.join(", ")}. ` +
        "Replace placeholder values in backend/.env with real Azure App Registration values."
    );
  }
}
