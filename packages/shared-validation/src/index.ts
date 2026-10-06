/** A serialisable validation result that can be consumed by any channel. */
export type ValidationResult = string | null;

export function firstValidationError(...results: ValidationResult[]): ValidationResult {
  return results.find((result) => result !== null) ?? null;
}
