import { ValidationError } from "../shared/errors.js";
import { fromMoneyInt, toMoneyInt } from "../shared/decimal.js";

export const SHIFT_STATUSES = {
  OPEN: "OPEN",
  CLOSED: "CLOSED"
};

export const CASH_MOVEMENT_TYPES = {
  CASH_IN: "CASH_IN",
  CASH_OUT: "CASH_OUT"
};

function requireNonEmptyText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(fieldName + " must be a non-empty string");
  }
  return value.trim();
}

function normalizeOptionalText(value, fieldName) {
  if (value === null || value === undefined || value === "") {
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

export function validateShiftStatus(status) {
  if (status !== SHIFT_STATUSES.OPEN && status !== SHIFT_STATUSES.CLOSED) {
    throw new ValidationError("Invalid shift status: " + status);
  }
  return status;
}

export function validateCashMovementType(type) {
  if (type !== CASH_MOVEMENT_TYPES.CASH_IN && type !== CASH_MOVEMENT_TYPES.CASH_OUT) {
    throw new ValidationError("Invalid cash movement type: " + type);
  }
  return type;
}

export function validateOpeningCash(value) {
  const amountInt = toMoneyInt(value, "opening_cash");
  if (amountInt < 0) {
    throw new ValidationError("opening_cash cannot be negative");
  }
  return fromMoneyInt(amountInt);
}

export function validateActualCash(value) {
  const amountInt = toMoneyInt(value, "actual_cash");
  if (amountInt < 0) {
    throw new ValidationError("actual_cash cannot be negative");
  }
  return fromMoneyInt(amountInt);
}

export function validateMovementAmount(value) {
  const amountInt = toMoneyInt(value, "amount");
  if (amountInt <= 0) {
    throw new ValidationError("amount must be greater than zero");
  }
  return fromMoneyInt(amountInt);
}

export function calculateExpectedCash(totals) {
  const safeTotals = totals || {};
  let openingVal = 0;
  if (safeTotals.opening_cash !== undefined && safeTotals.opening_cash !== null) {
    openingVal = safeTotals.opening_cash;
  }
  let salesVal = 0;
  if (safeTotals.cash_sales !== undefined && safeTotals.cash_sales !== null) {
    salesVal = safeTotals.cash_sales;
  }
  let utangVal = 0;
  if (safeTotals.cash_utang_payments !== undefined && safeTotals.cash_utang_payments !== null) {
    utangVal = safeTotals.cash_utang_payments;
  }
  let inVal = 0;
  if (safeTotals.cash_in !== undefined && safeTotals.cash_in !== null) {
    inVal = safeTotals.cash_in;
  }
  let outVal = 0;
  if (safeTotals.cash_out !== undefined && safeTotals.cash_out !== null) {
    outVal = safeTotals.cash_out;
  }
  let refundsVal = 0;
  if (safeTotals.cash_refunds !== undefined && safeTotals.cash_refunds !== null) {
    refundsVal = safeTotals.cash_refunds;
  }

  const openingInt = toMoneyInt(openingVal, "opening_cash");
  const salesInt = toMoneyInt(salesVal, "cash_sales");
  const utangInt = toMoneyInt(utangVal, "cash_utang_payments");
  const inInt = toMoneyInt(inVal, "cash_in");
  const outInt = toMoneyInt(outVal, "cash_out");
  const refundsInt = toMoneyInt(refundsVal, "cash_refunds");

  const expectedInt = openingInt + salesInt + utangInt + inInt - outInt - refundsInt;
  return fromMoneyInt(expectedInt);
}

export function calculateVariance(actualCash, expectedCash) {
  const actualInt = toMoneyInt(actualCash, "actual_cash");
  const expectedInt = toMoneyInt(expectedCash, "expected_cash");
  const varianceInt = actualInt - expectedInt;
  return fromMoneyInt(varianceInt);
}

export function createCashierShiftEntity(input) {
  const shiftId = requireNonEmptyText(input.shift_id, "shift_id");
  const userId = requireNonEmptyText(input.user_id, "user_id");
  const openedAt = requireNonEmptyText(input.opened_at, "opened_at");
  const closedAt = normalizeOptionalText(input.closed_at, "closed_at");
  const openingCash = validateOpeningCash(input.opening_cash);

  let expectedCash = null;
  if (input.expected_cash !== null && input.expected_cash !== undefined) {
    expectedCash = fromMoneyInt(toMoneyInt(input.expected_cash, "expected_cash"));
  }

  let actualCash = null;
  if (input.actual_cash !== null && input.actual_cash !== undefined) {
    actualCash = validateActualCash(input.actual_cash);
  }

  let variance = null;
  if (input.variance !== null && input.variance !== undefined) {
    variance = fromMoneyInt(toMoneyInt(input.variance, "variance"));
  }

  const notes = normalizeOptionalText(input.notes, "notes");
  let status = SHIFT_STATUSES.OPEN;
  if (input.status) {
    status = validateShiftStatus(input.status);
  }

  return {
    shift_id: shiftId,
    user_id: userId,
    opened_at: openedAt,
    closed_at: closedAt,
    opening_cash: openingCash,
    expected_cash: expectedCash,
    actual_cash: actualCash,
    variance: variance,
    notes: notes,
    status: status
  };
}

export function createCashMovementEntity(input) {
  const movementId = requireNonEmptyText(input.movement_id, "movement_id");
  const shiftId = requireNonEmptyText(input.shift_id, "shift_id");
  const type = validateCashMovementType(input.type);
  const amount = validateMovementAmount(input.amount);
  const remarks = requireNonEmptyText(input.remarks, "remarks");
  const createdBy = requireNonEmptyText(input.created_by, "created_by");
  const createdAt = requireNonEmptyText(input.created_at, "created_at");

  return {
    movement_id: movementId,
    shift_id: shiftId,
    type: type,
    amount: amount,
    remarks: remarks,
    created_by: createdBy,
    created_at: createdAt
  };
}
