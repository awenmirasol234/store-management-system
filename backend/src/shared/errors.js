export class DomainError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = "DomainError";
    if (code) {
      this.code = code;
    } else {
      this.code = "DOMAIN_ERROR";
    }
    if (statusCode) {
      this.statusCode = statusCode;
    } else {
      this.statusCode = 400;
    }
  }
}

export class ValidationError extends DomainError {
  constructor(message) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message) {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DomainError {
  constructor(message) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}
