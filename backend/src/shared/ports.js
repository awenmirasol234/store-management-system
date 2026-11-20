import crypto from "node:crypto";

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function createDefaultIdGenerator() {
  return {
    nextId() {
      return crypto.randomUUID();
    }
  };
}

function padTwoDigits(numberValue) {
  return String(numberValue).padStart(2, "0");
}

export function formatManilaDateParts(date) {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  const year = String(shifted.getUTCFullYear());
  const month = padTwoDigits(shifted.getUTCMonth() + 1);
  const day = padTwoDigits(shifted.getUTCDate());
  return {
    compact: year + month + day,
    isoDate: year + "-" + month + "-" + day
  };
}

export function createSystemClock() {
  return {
    nowIso() {
      return new Date().toISOString();
    },
    todayManilaCompact() {
      return formatManilaDateParts(new Date()).compact;
    },
    todayManilaIsoDate() {
      return formatManilaDateParts(new Date()).isoDate;
    }
  };
}
