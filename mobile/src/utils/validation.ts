/**
 * Client-side-only validation. Mirrors the Indian mobile number rule already enforced by the
 * backend (backend/src/validators/registered-mobile.validator.ts): normalize away spaces/+91/a
 * leading 0, then require exactly 10 digits starting with 6-9. Kept as a local copy rather than a
 * shared import for the same reason as `types/auth.types.ts` - mobile sits outside the npm
 * workspace this phase isn't the place to change that.
 */
export function normalizeMobileNumber(input: string): string {
  let normalized = input.trim().replace(/\s+/g, '');
  if (normalized.startsWith('+91')) {
    normalized = normalized.slice(3);
  }
  if (normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

export function validateMobileNumber(input: string): string | null {
  if (!input.trim()) {
    return 'Mobile number is required.';
  }
  const normalized = normalizeMobileNumber(input);
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return 'Enter a valid 10-digit mobile number.';
  }
  return null;
}

export function validatePassword(input: string): string | null {
  if (!input) {
    return 'Password is required.';
  }
  return null;
}
