import { ValidationError } from "../errors";

function normalizeRequiredString(value: unknown, fieldName: string, minLength = 1, maxLength = 120): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} cannot be longer than ${maxLength} characters.`);
  }

  return trimmed;
}

export function validateMvTrackNumber(value: unknown): string {
  return normalizeRequiredString(value, "mvTrackNumber", 3, 80);
}

export function validateVehicleNumber(value: unknown): string {
  return normalizeRequiredString(value, "vehicleNumber", 3, 80);
}

export function validateVin(value: unknown): string {
  const vin = normalizeRequiredString(value, "vin", 5, 40);
  if (!/^[A-Z0-9-]+$/i.test(vin)) {
    throw new ValidationError("vin must be alphanumeric.");
  }
  return vin.toUpperCase();
}

export function validateRiderPhone(value: unknown): string {
  const phone = normalizeRequiredString(value, "phone", 10, 15);
  if (!/^\d{10,15}$/.test(phone)) {
    throw new ValidationError("phone must contain 10 to 15 digits.");
  }
  return phone;
}

export function validateRiderName(value: unknown): string {
  return normalizeRequiredString(value, "name", 2, 120);
}

export function validateCustomerId(value: unknown): string {
  return normalizeRequiredString(value, "customerId", 1, 128);
}
