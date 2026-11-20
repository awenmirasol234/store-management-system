import { ValidationError } from "./errors.js";

export const MONEY_DECIMALS = 2;
export const MONEY_SCALE = 100;
export const MAX_MONEY_INT = 999999999999;

export const QUANTITY_DECIMALS = 4;
export const QUANTITY_SCALE = 10000;
export const MAX_QUANTITY_INT = 999999999999;

function normalizeNumericString(value, fieldName) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ValidationError(fieldName + " must be a finite number");
    }
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError(fieldName + " must not be empty");
    }
    return trimmed;
  }
  throw new ValidationError(fieldName + " must be a number or numeric string");
}

function parseScaledInt(value, decimals, maxAbsInt, fieldName) {
  const text = normalizeNumericString(value, fieldName);
  const pattern = /^-?\d+(?:\.\d+)?$/;
  if (!pattern.test(text)) {
    throw new ValidationError(fieldName + " must be a valid decimal number");
  }

  let isNegative = false;
  let unsignedText = text;
  if (text.startsWith("-")) {
    isNegative = true;
    unsignedText = text.slice(1);
  }

  const parts = unsignedText.split(".");
  const wholePart = parts[0];
  let fractionPart = "";
  if (parts.length === 2) {
    fractionPart = parts[1];
  }

  if (fractionPart.length > decimals) {
    throw new ValidationError(
      fieldName + " supports at most " + decimals + " decimal places"
    );
  }

  const paddedFraction = fractionPart.padEnd(decimals, "0");
  const combinedText = wholePart + paddedFraction;
  const scaledValue = Number(combinedText);

  if (!Number.isSafeInteger(scaledValue) || scaledValue > maxAbsInt) {
    throw new ValidationError(fieldName + " exceeds precision limit");
  }

  if (isNegative && scaledValue !== 0) {
    return -scaledValue;
  }
  return scaledValue;
}

export function toMoneyInt(value, fieldName) {
  let label = fieldName;
  if (!label) {
    label = "amount";
  }
  return parseScaledInt(value, MONEY_DECIMALS, MAX_MONEY_INT, label);
}

export function fromMoneyInt(moneyInt) {
  if (!Number.isSafeInteger(moneyInt)) {
    throw new ValidationError("moneyInt must be a safe integer");
  }
  return moneyInt / MONEY_SCALE;
}

export function toQuantityInt(value, fieldName) {
  let label = fieldName;
  if (!label) {
    label = "quantity";
  }
  return parseScaledInt(value, QUANTITY_DECIMALS, MAX_QUANTITY_INT, label);
}

export function fromQuantityInt(quantityInt) {
  if (!Number.isSafeInteger(quantityInt)) {
    throw new ValidationError("quantityInt must be a safe integer");
  }
  return quantityInt / QUANTITY_SCALE;
}

export function roundHalfUpBigIntDiv(numerator, denominator) {
  if (denominator <= 0n) {
    throw new ValidationError("Division denominator must be greater than zero");
  }
  let isNegative = false;
  let absNumerator = numerator;
  if (numerator < 0n) {
    isNegative = true;
    absNumerator = -numerator;
  }
  const quotient = absNumerator / denominator;
  const remainder = absNumerator % denominator;
  let rounded = quotient;
  if (remainder * 2n >= denominator) {
    rounded = quotient + 1n;
  }
  if (isNegative && rounded !== 0n) {
    return -rounded;
  }
  return rounded;
}

export function multiplyQuantitiesInt(firstQuantityInt, secondQuantityInt) {
  const product = BigInt(firstQuantityInt) * BigInt(secondQuantityInt);
  const scaled = roundHalfUpBigIntDiv(product, BigInt(QUANTITY_SCALE));
  const result = Number(scaled);
  if (!Number.isSafeInteger(result) || Math.abs(result) > MAX_QUANTITY_INT) {
    throw new ValidationError("Calculated quantity exceeds precision limit");
  }
  return result;
}

export function multiplyMoneyByQuantityInt(unitMoneyInt, quantityInt) {
  const product = BigInt(unitMoneyInt) * BigInt(quantityInt);
  const scaled = roundHalfUpBigIntDiv(product, BigInt(QUANTITY_SCALE));
  const result = Number(scaled);
  if (!Number.isSafeInteger(result) || Math.abs(result) > MAX_MONEY_INT) {
    throw new ValidationError("Calculated monetary amount exceeds precision limit");
  }
  return result;
}

export function divideMoneyToQuantityInt(customAmountInt, unitPriceInt) {
  if (unitPriceInt <= 0) {
    throw new ValidationError("Product selling price must be greater than zero");
  }
  if (customAmountInt <= 0) {
    throw new ValidationError("Custom peso amount must be greater than zero");
  }
  const numerator = BigInt(customAmountInt) * BigInt(QUANTITY_SCALE);
  const scaled = roundHalfUpBigIntDiv(numerator, BigInt(unitPriceInt));
  const result = Number(scaled);
  if (!Number.isSafeInteger(result) || result > MAX_QUANTITY_INT) {
    throw new ValidationError("Calculated custom quantity exceeds precision limit");
  }
  return result;
}
