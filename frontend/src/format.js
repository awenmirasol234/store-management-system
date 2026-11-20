export function formatPeso(amount) {
  const numericValue = Number(amount);
  if (!Number.isFinite(numericValue)) {
    return "₱0.00";
  }
  const formatted = Math.abs(numericValue).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (numericValue < 0) {
    return "-₱" + formatted;
  }
  return "₱" + formatted;
}

export function formatQuantity(quantity) {
  const numericValue = Number(quantity);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }
  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }
  return String(Number(numericValue.toFixed(4)));
}

export function formatManilaDateTime(isoString) {
  if (!isoString) {
    return "";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return String(isoString);
  }
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getManilaIsoDateOffset(daysOffset) {
  const now = new Date();
  const manilaMs = now.getTime() + 8 * 60 * 60 * 1000 + daysOffset * 24 * 60 * 60 * 1000;
  const shifted = new Date(manilaMs);
  const year = String(shifted.getUTCFullYear());
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}
