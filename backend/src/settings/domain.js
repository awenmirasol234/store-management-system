import { DomainError, ValidationError } from "../shared/errors.js";

export class DatabaseBackupUnavailableError extends DomainError {
  constructor() {
    super(
      "Database backup is only available for disk-based databases",
      "BACKUP_UNAVAILABLE",
      400
    );
    this.name = "DatabaseBackupUnavailableError";
  }
}

export const DEFAULT_STORE_SETTINGS = {
  id: "default",
  store_name: "Duane Store",
  tagline: "Quality goods & daily essentials",
  address: "",
  phone: "",
  tax_number: "",
  receipt_header: "Thank you for shopping with us!",
  receipt_footer: "Items sold are subject to store return policy. Please keep this receipt.",
  default_low_stock_threshold: 5,
  sound_enabled: 1,
  show_cashier_on_receipt: 1,
  updated_at: "1970-01-01T00:00:00.000Z"
};

export function validateStoreSettings(input) {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Settings data is required");
  }

  if (input.store_name !== undefined) {
    if (typeof input.store_name !== "string" || input.store_name.trim().length === 0) {
      throw new ValidationError("Store name cannot be empty");
    }
    if (input.store_name.trim().length > 100) {
      throw new ValidationError("Store name cannot exceed 100 characters");
    }
  }

  if (input.default_low_stock_threshold !== undefined) {
    const threshold = Number(input.default_low_stock_threshold);
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10000) {
      throw new ValidationError("Default low stock threshold must be an integer between 0 and 10,000");
    }
  }

  if (input.sound_enabled !== undefined) {
    let soundVal = input.sound_enabled;
    if (typeof soundVal === "boolean") {
      if (soundVal) {
        soundVal = 1;
      } else {
        soundVal = 0;
      }
    }
    if (soundVal !== 0 && soundVal !== 1) {
      throw new ValidationError("Sound enabled must be 0 or 1");
    }
  }

  if (input.show_cashier_on_receipt !== undefined) {
    let cashierVal = input.show_cashier_on_receipt;
    if (typeof cashierVal === "boolean") {
      if (cashierVal) {
        cashierVal = 1;
      } else {
        cashierVal = 0;
      }
    }
    if (cashierVal !== 0 && cashierVal !== 1) {
      throw new ValidationError("Show cashier on receipt must be 0 or 1");
    }
  }

  const stringFields = [
    "tagline",
    "address",
    "phone",
    "tax_number",
    "receipt_header",
    "receipt_footer"
  ];
  for (let index = 0; index < stringFields.length; index = index + 1) {
    const field = stringFields[index];
    if (input[field] !== undefined && input[field] !== null) {
      if (typeof input[field] !== "string") {
        throw new ValidationError("Field " + field + " must be a string");
      }
      if (input[field].length > 500) {
        throw new ValidationError("Field " + field + " cannot exceed 500 characters");
      }
    }
  }
}
