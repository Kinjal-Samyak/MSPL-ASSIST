export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  errorMessage?: string;
}
