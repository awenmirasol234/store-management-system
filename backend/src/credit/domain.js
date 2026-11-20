import { fromMoneyInt, toMoneyInt } from "../shared/decimal.js";
import { ValidationError } from "../shared/errors.js";
import {
  normalizeBoolean,
  normalizeOptionalText,
  requireNonEmptyText
} from "../shared/validation.js";

export const CREDIT_TRANSACTION_TYPES = {
  CHARGE: "CHARGE",
  PAYMENT: "PAYMENT",
  RETURN_ADJUSTMENT: "RETURN_ADJUSTMENT"
};

const VALID_TRANSACTION_TYPES = new Set(Object.values(CREDIT_TRANSACTION_TYPES));

export function createCustomerEntity(input) {
  const customerId = requireNonEmptyText(input.customer_id, "customer_id");
  const fullName = requireNonEmptyText(input.full_name, "full_name");
  const phone = normalizeOptionalText(input.phone, "phone");
  const address = normalizeOptionalText(input.address, "address");

  let creditLimit = null;
  if (input.credit_limit !== undefined && input.credit_limit !== null) {
    const limitInt = toMoneyInt(input.credit_limit, "credit_limit");
    if (limitInt < 0) {
      throw new ValidationError("credit_limit cannot be negative");
    }
    creditLimit = fromMoneyInt(limitInt);
  }

  let rawBalance = input.current_balance;
  if (rawBalance === undefined || rawBalance === null) {
    rawBalance = 0;
  }
  const currentBalanceInt = toMoneyInt(rawBalance, "current_balance");
  if (currentBalanceInt < 0) {
    throw new ValidationError("current_balance cannot be negative");
  }

  const isActive = normalizeBoolean(input.is_active, true, "is_active");
  const createdAt = requireNonEmptyText(input.created_at, "created_at");
  const updatedAt = requireNonEmptyText(input.updated_at, "updated_at");

  return {
    customer_id: customerId,
    full_name: fullName,
    phone: phone,
    address: address,
    credit_limit: creditLimit,
    current_balance: fromMoneyInt(currentBalanceInt),
    is_active: isActive,
    created_at: createdAt,
    updated_at: updatedAt
  };
}

export function createCreditTransactionEntity(input) {
  const creditTxId = requireNonEmptyText(input.credit_tx_id, "credit_tx_id");
  const customerId = requireNonEmptyText(input.customer_id, "customer_id");
  const saleId = normalizeOptionalText(input.sale_id, "sale_id");
  const shiftId = normalizeOptionalText(input.shift_id, "shift_id");
  const type = requireNonEmptyText(input.type, "type");
  if (!VALID_TRANSACTION_TYPES.has(type)) {
    throw new ValidationError("Invalid credit transaction type: " + type);
  }

  const amountInt = toMoneyInt(input.amount, "amount");
  if (amountInt <= 0) {
    throw new ValidationError("amount must be greater than zero");
  }

  const remarks = normalizeOptionalText(input.remarks, "remarks");
  const createdBy = requireNonEmptyText(input.created_by, "created_by");
  const createdAt = requireNonEmptyText(input.created_at, "created_at");

  return {
    credit_tx_id: creditTxId,
    customer_id: customerId,
    sale_id: saleId,
    shift_id: shiftId,
    type: type,
    amount: fromMoneyInt(amountInt),
    remarks: remarks,
    created_by: createdBy,
    created_at: createdAt
  };
}
