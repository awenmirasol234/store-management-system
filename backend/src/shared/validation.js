import { ValidationError } from "./errors.js";

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
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(fieldName + " must be a positive integer");
  }
  return parsed;
}
