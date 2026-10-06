import type { ValidationResult } from "../shared/validation-result";

/**
 * RegisteredMobileValidator owns ALL aspects of mobile number normalization and validation.
 *
 * Responsibilities:
 * - Remove all spaces
 * - Remove leading +91 (international code)
 * - Remove leading 0 (domestic trunk prefix)
 * - Validate exactly 10 digits
 * - Validate first digit is 6, 7, 8, or 9 (valid Indian mobile prefixes)
 * - Return standardized ValidationResult
 *
 * Handler must never know:
 * - How spaces are removed
 * - How +91 is removed
 * - How leading 0 is removed
 * - How validation is performed
 *
 * This is the single source of truth for mobile normalization.
 *
 * Normalization examples:
 * - "9876543210" → "9876543210" ✓
 * - "+91 9876543210" → "9876543210" ✓
 * - "09876543210" → "9876543210" ✓
 * - "+91 98765 43210" → "9876543210" ✓
 * - "1234567890" → invalid result (first digit invalid)
 * - "987654321" → invalid result (only 9 digits)
 * - "" → invalid result (empty)
 */
export class RegisteredMobileValidator {
  /**
   * Single public method: validates and normalizes a mobile number.
   *
   * Performs all normalization and validation in a single call.
   * Returns standardized ValidationResult for handler consumption.
   *
   * @param input Raw mobile number input from customer
   * @returns ValidationResult with isValid flag and either value or errorMessage
   */
  static validateAndNormalize(input: string | undefined): ValidationResult<string> {
    // Check for empty input
    if (!input || typeof input !== "string") {
      return {
        isValid: false,
        errorMessage:
          "Please enter a valid 10-digit registered mobile number.\n\nExamples:\n9876543210\n+91 9876543210",
      };
    }

    // Trim and normalize
    let normalized = input.trim().replace(/\s+/g, "");

    if (!normalized) {
      return {
        isValid: false,
        errorMessage:
          "Please enter a valid 10-digit registered mobile number.\n\nExamples:\n9876543210\n+91 9876543210",
      };
    }

    // Remove leading +91 (international code)
    if (normalized.startsWith("+91")) {
      normalized = normalized.slice(3);
    }

    // Remove leading 0 (domestic trunk prefix)
    if (normalized.startsWith("0")) {
      normalized = normalized.slice(1);
    }

    // Validate format: exactly 10 digits
    if (!/^\d{10}$/.test(normalized)) {
      return {
        isValid: false,
        errorMessage:
          "Please enter a valid 10-digit registered mobile number.\n\nExamples:\n9876543210\n+91 9876543210",
      };
    }

    // Validate Indian mobile prefix: first digit must be 6, 7, 8, or 9
    const firstDigit = parseInt(normalized.charAt(0), 10);
    if (firstDigit < 6 || firstDigit > 9) {
      return {
        isValid: false,
        errorMessage:
          "Please enter a valid 10-digit registered mobile number.\n\nExamples:\n9876543210\n+91 9876543210",
      };
    }

    // Success
    return {
      isValid: true,
      value: normalized,
    };
  }
}
