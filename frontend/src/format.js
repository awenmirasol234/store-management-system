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

function truncateCompact(num, divisor, suffix) {
  const scaled = num / divisor;
  const floored = Math.floor(scaled * 10 + 1e-9) / 10;
  let formatted = "";
  if (Number.isInteger(floored)) {
    formatted = String(floored);
  } else {
    formatted = floored.toFixed(1);
  }
  return formatted + suffix;
}

export function formatCompactNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }
  const absValue = Math.abs(numericValue);
  let compactStr = "";
  if (absValue >= 1e9) {
    compactStr = truncateCompact(absValue, 1e9, "B");
  } else if (absValue >= 1e6) {
    compactStr = truncateCompact(absValue, 1e6, "M");
  } else if (absValue >= 1e3) {
    compactStr = truncateCompact(absValue, 1e3, "K");
  } else {
    compactStr = truncateCompact(absValue, 1, "");
  }
  if (numericValue < 0) {
    return "-" + compactStr;
  }
  return compactStr;
}

export function formatCompactPeso(amount) {
  const numericValue = Number(amount);
  if (!Number.isFinite(numericValue)) {
    return "₱0.00";
  }
  const absValue = Math.abs(numericValue);
  if (absValue < 1000) {
    return formatPeso(numericValue);
  }
  const compactStr = formatCompactNumber(absValue);
  if (numericValue < 0) {
    return "-₱" + compactStr;
  }
  return "₱" + compactStr;
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

const UNIT_PLURAL_MAP = {
  "Piece (pc)": "Pieces (pcs)",
  "Pack": "Packs",
  "Box": "Boxes",
  "Bottle": "Bottles",
  "Can": "Cans",
  "Sachet": "Sachets",
  "Kilogram (kg)": "Kilograms (kg)",
  "Gram (g)": "Grams (g)",
  "Liter (L)": "Liters (L)",
  "Milliliter (mL)": "Milliliters (mL)",
  "Meter (m)": "Meters (m)",
  "Roll": "Rolls",
  "Dozen (doz)": "Dozens (doz)",
  "Pair": "Pairs",
  "Set": "Sets",
  "Bundle": "Bundles",
  "Sack": "Sacks",
  "Case": "Cases",
  "Carton": "Cartons",
  "Tray": "Trays",
  "Gallon": "Gallons",
  "Pouch": "Pouches",
  "Tube": "Tubes",
  "Jar": "Jars",
  "Bar": "Bars",
  "Stick": "Sticks",
  "Ream": "Reams",
  "Sheet": "Sheets"
};

const COMMON_LOWER_PLURALS = {
  piece: "pieces",
  pc: "pcs",
  box: "boxes",
  pouch: "pouches",
  bottle: "bottles",
  can: "cans",
  pack: "packs",
  sachet: "sachets",
  roll: "rolls",
  pair: "pairs",
  set: "sets",
  bundle: "bundles",
  sack: "sacks",
  case: "cases",
  carton: "cartons",
  tray: "trays",
  gallon: "gallons",
  tube: "tubes",
  jar: "jars",
  bar: "bars",
  stick: "sticks",
  ream: "reams",
  sheet: "sheets",
  meter: "meters",
  gram: "grams",
  liter: "liters",
  milliliter: "milliliters",
  kilogram: "kilograms",
  dozen: "dozens"
};

export function formatUnit(unit, quantity) {
  if (!unit || typeof unit !== "string") {
    return "";
  }
  const numericValue = Number(quantity);
  if (Number.isFinite(numericValue) && Math.abs(numericValue) === 1) {
    return unit;
  }
  const trimmed = unit.trim();
  if (UNIT_PLURAL_MAP[trimmed]) {
    return UNIT_PLURAL_MAP[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (COMMON_LOWER_PLURALS[lower]) {
    if (trimmed === lower) {
      return COMMON_LOWER_PLURALS[lower];
    }
    const plural = COMMON_LOWER_PLURALS[lower];
    return plural.charAt(0).toUpperCase() + plural.slice(1);
  }
  if (["kg", "g", "l", "ml", "m"].includes(lower)) {
    return trimmed;
  }
  if (lower.endsWith("s")) {
    return trimmed;
  }
  if (
    lower.endsWith("ch") ||
    lower.endsWith("sh") ||
    lower.endsWith("x") ||
    lower.endsWith("z")
  ) {
    return trimmed + "es";
  }
  return trimmed + "s";
}

export function formatQuantityWithUnit(quantity, unit) {
  const formattedQty = formatQuantity(quantity);
  if (!unit) {
    return formattedQty;
  }
  return formattedQty + " " + formatUnit(unit, quantity);
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
