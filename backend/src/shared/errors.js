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

export class UnauthorizedError extends DomainError {
  constructor(message) {
    let text = message;
    if (!text) {
      text = "Authentication required";
    }
    super(text, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message) {
    let text = message;
    if (!text) {
      text = "Access forbidden";
    }
    super(text, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class TooManyRequestsError extends DomainError {
  constructor(message) {
    let text = message;
    if (!text) {
      text = "Too many requests, please try again later";
    }
    super(text, "TOO_MANY_REQUESTS", 429);
    this.name = "TooManyRequestsError";
  }
}
