import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { config } from "../config";
import { ValidationError } from "../errors";
import { OperationalDataRepository, type GraphAuthStateRecord } from "../repositories/operational-data.repository";
import { logger } from "../utils/logger";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

interface TokenErrorResponse {
  error?: string;
  error_description?: string;
  error_codes?: number[];
  trace_id?: string;
  correlation_id?: string;
}

interface AuthEncryptionPayload {
  iv: string;
  tag: string;
  value: string;
}

export interface GraphAuthUrlResult {
  authorizationUrl: string;
  state: string;
}

export interface GraphAuthStatusResult {
  authenticated: boolean;
  expiresAt: string | null;
  updatedAt: string | null;
  lastError: string | null;
}

function encodeShareUrl(url: string): string {
  return Buffer.from(url, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function formTokenEndpointUrl(): string {
  if (!config.m365.tenantId) {
    throw new ValidationError("Microsoft 365 tenant configuration is missing.");
  }
  return `https://login.microsoftonline.com/${config.m365.tenantId}/oauth2/v2.0/token`;
}

function getEncryptionKey(): Buffer {
  const raw = config.m365.tokenEncryptionKey.trim();
  if (!raw) {
    throw new ValidationError("Microsoft 365 token encryption key is not configured.");
  }

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) {
    return base64;
  }

  return createHash("sha256").update(raw).digest();
}

function encrypt(value: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const payload: AuthEncryptionPayload = {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    value: encrypted.toString("base64"),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decrypt(value: string): string {
  const key = getEncryptionKey();
  const decoded = Buffer.from(value, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as AuthEncryptionPayload;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.value, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function maskSecret(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return value;
  }
  if (value.length <= 8) {
    return "****";
  }
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function sanitizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  const record = payload as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const lower = key.toLowerCase();
    if (lower.includes("token") || lower.includes("secret") || lower.includes("password")) {
      sanitized[key] = typeof value === "string" ? maskSecret(value) : "****";
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export class GraphAuthService {
  constructor(private readonly repository: OperationalDataRepository = new OperationalDataRepository()) {}

  getAuthorizationUrl(): GraphAuthUrlResult {
    this.ensureConfigured();
    const state = randomUUID();
    const endpoint = `https://login.microsoftonline.com/${config.m365.tenantId}/oauth2/v2.0/authorize`;
    const params = new URLSearchParams({
      client_id: config.m365.clientId,
      response_type: "code",
      redirect_uri: config.m365.redirectUri,
      response_mode: "query",
      scope: config.m365.scopes,
      state,
      prompt: "select_account",
    });
    return {
      authorizationUrl: `${endpoint}?${params.toString()}`,
      state,
    };
  }

  async exchangeAuthorizationCode(code: string): Promise<GraphAuthStatusResult> {
    try {
      this.ensureConfigured();
      const token = await this.requestToken({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.m365.redirectUri,
      });
      await this.persistTokens(token, token.refresh_token);
      return this.getAuthStatus();
    } catch (error) {
      const details =
        error instanceof ValidationError && error.details && typeof error.details === "object"
          ? (error.details as Record<string, unknown>)
          : {};
      logger.error({
        scope: "graph-auth",
        event: "Authorization Code Exchange Failed",
        message: error instanceof Error ? error.message : "Unknown graph auth exchange error.",
        microsoftErrorCode: typeof details.microsoftErrorCode === "string" ? details.microsoftErrorCode : null,
        httpStatus: typeof details.httpStatus === "number" ? details.httpStatus : null,
        responseBody: sanitizePayload(details.responseBody),
        axiosErrorMessage:
          typeof details.axiosErrorMessage === "string"
            ? details.axiosErrorMessage
            : error instanceof Error && error.name.toLowerCase().includes("axios")
              ? error.message
              : null,
        stackTrace: error instanceof Error ? error.stack ?? null : null,
      });
      throw error;
    }
  }

  async getAuthStatus(): Promise<GraphAuthStatusResult> {
    const settings = await this.repository.getSettings();
    return {
      authenticated: Boolean(settings.graphAuthConnected),
      expiresAt: settings.graphAuthTokenExpiresAt ?? null,
      updatedAt: settings.graphAuthUpdatedAt ?? null,
      lastError: settings.graphAuthLastError ?? null,
    };
  }

  async getAccessToken(): Promise<string> {
    this.ensureConfigured();
    const state = await this.repository.getGraphAuthState();
    if (!state) {
      throw new ValidationError("Microsoft Graph authentication required.");
    }

    const expiresAt = new Date(state.accessTokenExpiresAt).getTime();
    if (Number.isNaN(expiresAt)) {
      await this.repository.clearGraphAuthState("Invalid token expiry in stored Graph credentials.");
      throw new ValidationError("Microsoft Graph authentication expired. Please reconnect.");
    }
    if (expiresAt - Date.now() <= 60 * 1000) {
      return this.refreshTokens(state);
    }

    return decrypt(state.encryptedAccessToken);
  }

  async invalidateAuth(message: string): Promise<void> {
    await this.repository.clearGraphAuthState(message);
  }

  toGraphShareId(url: string): string {
    return `u!${encodeShareUrl(url)}`;
  }

  private async refreshTokens(state: GraphAuthStateRecord): Promise<string> {
    const refreshToken = decrypt(state.encryptedRefreshToken);
    const token = await this.requestToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    await this.persistTokens(token, token.refresh_token ?? refreshToken);
    return token.access_token;
  }

  private async persistTokens(token: TokenResponse, refreshTokenFallback?: string): Promise<void> {
    const refreshToken = token.refresh_token ?? refreshTokenFallback;
    if (!refreshToken) {
      throw new ValidationError("Microsoft Graph refresh token was not returned.");
    }

    await this.repository.saveGraphAuthState({
      encryptedAccessToken: encrypt(token.access_token),
      encryptedRefreshToken: encrypt(refreshToken),
      accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      scope: token.scope ?? config.m365.scopes,
      tokenType: token.token_type ?? "Bearer",
      acquiredAt: new Date().toISOString(),
    });
  }

  private async requestToken(payload: Record<string, string>): Promise<TokenResponse> {
    const endpoint = formTokenEndpointUrl();
    const body = new URLSearchParams({
      client_id: config.m365.clientId,
      client_secret: config.m365.clientSecret,
      scope: config.m365.scopes,
      ...payload,
    });
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const raw = await response.text();
    let parsed: TokenResponse | TokenErrorResponse | Record<string, unknown> = {};
    if (raw.length > 0) {
      try {
        parsed = JSON.parse(raw) as TokenResponse | TokenErrorResponse | Record<string, unknown>;
      } catch {
        parsed = { raw };
      }
    }

    if (!response.ok || typeof (parsed as TokenResponse).access_token !== "string") {
      const tokenError = parsed as TokenErrorResponse;
      const details = tokenError.error_description ?? "Unknown token exchange failure.";
      const aadErrorCode =
        typeof tokenError.error === "string" && tokenError.error.length > 0
          ? tokenError.error
          : Array.isArray(tokenError.error_codes) && tokenError.error_codes.length > 0
            ? `AADSTS${tokenError.error_codes[0]}`
            : null;
      throw new ValidationError(`Microsoft Graph authentication failed. ${details}`, {
        microsoftErrorCode: aadErrorCode,
        httpStatus: response.status,
        responseBody: sanitizePayload(parsed),
        axiosErrorMessage: null,
      });
    }
    return parsed as TokenResponse;
  }

  private ensureConfigured(): void {
    if (!config.m365.tenantId || !config.m365.clientId || !config.m365.clientSecret || !config.m365.redirectUri) {
      throw new ValidationError("Microsoft 365 authentication is not configured.");
    }
  }
}

export const graphAuthService = new GraphAuthService();
