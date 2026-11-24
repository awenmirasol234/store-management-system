import { ValidationError } from "./errors.js";

export function requireObjectBody(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return value;
}

export function requireRouteParam(params, fieldName) {
  if (!params) {
    throw new ValidationError(fieldName + " is required");
  }
  return requireNonEmptyText(params[fieldName], fieldName);
}

export function normalizeOptionalQueryText(value, fieldName) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    throw new ValidationError(fieldName + " must be a single value");
  }
  return normalizeOptionalText(value, fieldName);
}

export function normalizeOptionalEnum(value, allowedValues, fieldName) {
  const normalized = normalizeOptionalQueryText(value, fieldName);
  if (normalized === undefined || normalized === null) {
    return normalized;
  }
  if (!allowedValues.has(normalized)) {
    throw new ValidationError(fieldName + " has an unsupported value");
  }
  return normalized;
}

export function parseNonNegativeOffset(rawValue, fallbackValue, fieldName) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim().length === 0) {
    return fallbackValue;
  }
  if (Array.isArray(rawValue)) {
    throw new ValidationError(fieldName + " must be a single integer");
  }
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(fieldName + " must be a non-negative integer");
  }
  return parsed;
}

export function requireNonEmptyText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(fieldName + " is required");
  }
  return value.trim();
}

export function normalizeOptionalText(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ValidationError(fieldName + " must be a string");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

export function normalizeBoolean(value, defaultValue, fieldName) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value !== "boolean") {
    throw new ValidationError(fieldName + " must be a boolean");
  }
  return value;
}

export function parsePositiveLimit(rawValue, fallbackValue, fieldName) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim().length === 0) {
    return fallbackValue;
  }
  if (Array.isArray(rawValue)) {
    throw new ValidationError(fieldName + " must be a single positive integer");
  }
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(fieldName + " must be a positive integer");
  }
  return parsed;
}
