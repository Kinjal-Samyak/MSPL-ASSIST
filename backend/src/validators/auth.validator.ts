import { ValidationError } from "../errors";
import type { LoginRequestDto, RefreshTokenRequestDto } from "../dto/auth.dto";

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  return normalized;
}

export function validateLoginPayload(input: unknown): LoginRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Login payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  return {
    email: normalizeRequiredString(payload.email, "email").toLowerCase(),
    password: normalizeRequiredString(payload.password, "password"),
  };
}

export function validateRefreshTokenPayload(input: unknown): RefreshTokenRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Refresh token payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  return {
    refreshToken: normalizeRequiredString(payload.refreshToken, "refreshToken"),
  };
}

