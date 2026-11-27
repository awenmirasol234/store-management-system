import { ValidationError } from "../shared/errors.js";

export const ROLES = {
  OWNER: "OWNER",
  CASHIER: "CASHIER"
};

export const ALLOWED_ROLES = new Set(["OWNER", "CASHIER"]);

export const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function validateUsername(username) {
  if (!username || typeof username !== "string") {
    throw new ValidationError("Username is required");
  }
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    throw new ValidationError("Username must be between 3 and 30 characters");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new ValidationError("Username can only contain letters, numbers, hyphens, and underscores");
  }
  return trimmed;
}

export function validateFullName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    throw new ValidationError("Full name is required");
  }
  const trimmed = fullName.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new ValidationError("Full name must be between 1 and 100 characters");
  }
  return trimmed;
}

export function validateRole(role) {
  if (!role || typeof role !== "string") {
    throw new ValidationError("Role is required");
  }
  const upper = role.toUpperCase();
  if (!ALLOWED_ROLES.has(upper)) {
    throw new ValidationError("Role must be OWNER or CASHIER");
  }
  return upper;
}

export function validatePin(pin) {
  if (!pin || typeof pin !== "string") {
    throw new ValidationError("PIN is required");
  }
  const trimmed = pin.trim();
  if (trimmed.length < 4 || trimmed.length > 8) {
    throw new ValidationError("PIN must be between 4 and 8 characters");
  }
  return trimmed;
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }
  return {
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    is_active: Boolean(user.is_active),
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}
