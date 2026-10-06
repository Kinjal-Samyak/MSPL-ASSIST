import { ValidationError } from "../errors";

const MIN_LENGTH = 8;
const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /[0-9]/;
const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/;

export function validatePasswordComplexity(password: string): void {
  const issues: string[] = [];

  if (password.length < MIN_LENGTH) {
    issues.push(`at least ${MIN_LENGTH} characters`);
  }
  if (!UPPERCASE_PATTERN.test(password)) {
    issues.push("one uppercase letter");
  }
  if (!LOWERCASE_PATTERN.test(password)) {
    issues.push("one lowercase letter");
  }
  if (!NUMBER_PATTERN.test(password)) {
    issues.push("one number");
  }
  if (!SPECIAL_CHAR_PATTERN.test(password)) {
    issues.push("one special character");
  }

  if (issues.length > 0) {
    throw new ValidationError(`Password must contain ${issues.join(", ")}.`);
  }
}
