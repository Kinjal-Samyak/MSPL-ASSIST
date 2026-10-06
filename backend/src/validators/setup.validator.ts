import type { BootstrapSetupRequestDto } from "../dto/setup.dto";
import { ValidationError } from "../errors";
import { validatePasswordComplexity } from "../utils/password-policy";

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

export function validateBootstrapSetupPayload(input: unknown): BootstrapSetupRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Bootstrap payload must be an object.");
  }

  const payload = input as Record<string, unknown>;
  const companyName = normalizeRequiredString(payload.companyName, "companyName");
  const adminName = normalizeRequiredString(payload.adminName, "adminName");
  const email = normalizeRequiredString(payload.email, "email").toLowerCase();
  const password = normalizeRequiredString(payload.password, "password");
  const confirmPassword = normalizeRequiredString(payload.confirmPassword, "confirmPassword");

  if (password !== confirmPassword) {
    throw new ValidationError("Password and confirmPassword must match.");
  }
  validatePasswordComplexity(password);

  return {
    companyName,
    adminName,
    email,
    password,
    confirmPassword,
  };
}

