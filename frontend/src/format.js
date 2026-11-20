const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

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

export function formatManilaTime(isoString) {
  if (!isoString) {
    return "";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatSmartDate(isoString, referenceDate) {
  if (!isoString) {
    return "";
  }
  const targetDate = new Date(isoString);
  if (Number.isNaN(targetDate.getTime())) {
    return String(isoString);
  }

  let baseDate = new Date();
  if (referenceDate) {
    baseDate = new Date(referenceDate);
  }

  // Shift UTC by +8 hours for Asia/Manila calendar date calculations
  const targetShifted = new Date(targetDate.getTime() + 8 * 60 * 60 * 1000);
  const baseShifted = new Date(baseDate.getTime() + 8 * 60 * 60 * 1000);

  const targetYear = targetShifted.getUTCFullYear();
  const targetMonth = targetShifted.getUTCMonth();
  const targetDay = targetShifted.getUTCDate();
  const targetWeekday = targetShifted.getUTCDay();

  const baseYear = baseShifted.getUTCFullYear();
  const baseMonth = baseShifted.getUTCMonth();
  const baseDay = baseShifted.getUTCDate();
  const baseWeekday = baseShifted.getUTCDay();

  const targetMidnight = Date.UTC(targetYear, targetMonth, targetDay);
  const baseMidnight = Date.UTC(baseYear, baseMonth, baseDay);
  const diffDays = Math.round((baseMidnight - targetMidnight) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }

  // Monday-based week start: Monday = 0, Tuesday = 1, ..., Sunday = 6
  let daysSinceMonday = baseWeekday - 1;
  if (daysSinceMonday < 0) {
    daysSinceMonday = 6;
  }

  if (diffDays > 1 && diffDays <= daysSinceMonday) {
    return WEEKDAY_NAMES[targetWeekday];
  }

  const monthName = MONTH_NAMES[targetMonth];
  if (targetYear === baseYear) {
    return monthName + " " + String(targetDay);
  }

  return monthName + " " + String(targetDay) + ", " + String(targetYear);
}

export function formatSmartDateTime(isoString, referenceDate) {
  if (!isoString) {
    return "";
  }
  const dateLabel = formatSmartDate(isoString, referenceDate);
  const timeLabel = formatManilaTime(isoString);
  if (timeLabel.length > 0) {
    return dateLabel + ", " + timeLabel;
  }
  return dateLabel;
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
