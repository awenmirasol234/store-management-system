import crypto from "node:crypto";
import { ValidationError } from "../shared/errors.js";

export function createAuthCrypto() {
  return {
    generateSalt() {
      return crypto.randomBytes(16).toString("hex");
    },

    hashPin(pin, salt) {
      if (!pin || typeof pin !== "string") {
        throw new ValidationError("PIN must be a non-empty string");
      }
      if (!salt || typeof salt !== "string") {
        throw new ValidationError("Salt must be a non-empty string");
      }
      return crypto.scryptSync(pin, salt, 64).toString("hex");
    },

    verifyPin(pin, salt, storedHash) {
      if (!pin || !salt || !storedHash) {
        return false;
      }
      const inputHash = crypto.scryptSync(pin, salt, 64);
      const storedBuffer = Buffer.from(storedHash, "hex");
      if (inputHash.length !== storedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(inputHash, storedBuffer);
    },

    generateSessionToken() {
      return crypto.randomBytes(32).toString("hex");
    },

    hashSessionToken(token) {
      return crypto.createHash("sha256").update(String(token)).digest("hex");
    }
  };
}
