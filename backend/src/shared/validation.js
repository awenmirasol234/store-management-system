import { ValidationError } from "./errors.js";

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
