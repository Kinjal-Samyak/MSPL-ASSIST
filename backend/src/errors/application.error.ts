export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 404, details);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 409, details);
  }
}

export class UnprocessableEntityError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 422, details);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 403, details);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 401, details);
  }
}
