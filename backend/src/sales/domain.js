import {
  divideMoneyToQuantityInt,
  fromMoneyInt,
  fromQuantityInt,
  multiplyMoneyByQuantityInt,
  multiplyQuantitiesInt,
  toMoneyInt,
  toQuantityInt
} from "../shared/decimal.js";
import { ValidationError } from "../shared/errors.js";
import { normalizeOptionalText, requireNonEmptyText } from "../shared/validation.js";

export const PAYMENT_METHODS = {
  CASH: "CASH",
  CREDIT: "CREDIT",
  SPLIT: "SPLIT"
};

export const SALE_STATUSES = {
  COMPLETED: "COMPLETED",
  VOIDED: "VOIDED"
};

const VALID_PAYMENT_METHODS = new Set(Object.values(PAYMENT_METHODS));

function validateSellableProduct(product) {
  if (!product || product.deleted_at !== null) {
    throw new ValidationError("Product is not available");
  }
  if (!product.is_active) {
    throw new ValidationError("Product is inactive: " + product.product_name);
  }
}

function calculateCustomAmountLine(product, customAmountRaw) {
  if (!product.allow_custom_amount) {
    throw new ValidationError(
      "Product does not allow custom peso amount sales: " + product.product_name
    );
  }
  const customAmountInt = toMoneyInt(customAmountRaw, "custom_amount");
  const sellingPriceInt = toMoneyInt(product.selling_price, "selling_price");
  const baseQuantityInt = divideMoneyToQuantityInt(customAmountInt, sellingPriceInt);
  if (baseQuantityInt <= 0) {
    throw new ValidationError("Calculated custom base_quantity must be greater than zero");
  }
  const formattedPeso = fromMoneyInt(customAmountInt).toFixed(2);
  return {
    option_id: null,
    option_name_snapshot: "Custom Amount (₱" + formattedPeso + ")",
    quantity_int: toQuantityInt(1, "quantity"),
    base_quantity_int: baseQuantityInt,
    unit_price_int: customAmountInt,
    gross_subtotal_int: customAmountInt
  };
}

function calculateOptionLine(product, option, soldQuantityRaw) {
  if (!option.is_active) {
    throw new ValidationError("Selling option is inactive: " + option.option_name);
  }
  if (option.product_id !== product.product_id) {
    throw new ValidationError("Selling option does not belong to product");
  }
  const soldQuantityInt = toQuantityInt(soldQuantityRaw, "quantity");
  if (soldQuantityInt <= 0) {
    throw new ValidationError("quantity must be greater than zero");
  }
  const optionQuantityInt = toQuantityInt(option.quantity, "option.quantity");
  const baseQuantityInt = multiplyQuantitiesInt(optionQuantityInt, soldQuantityInt);
  const unitPriceInt = toMoneyInt(option.price, "option.price");
  const grossSubtotalInt = multiplyMoneyByQuantityInt(unitPriceInt, soldQuantityInt);

  return {
    option_id: option.option_id,
    option_name_snapshot: option.option_name,
    quantity_int: soldQuantityInt,
    base_quantity_int: baseQuantityInt,
    unit_price_int: unitPriceInt,
    gross_subtotal_int: grossSubtotalInt
  };
}

function calculateBaseUnitLine(product, soldQuantityRaw) {
  const soldQuantityInt = toQuantityInt(soldQuantityRaw, "quantity");
  if (soldQuantityInt <= 0) {
    throw new ValidationError("quantity must be greater than zero");
  }
  const unitPriceInt = toMoneyInt(product.selling_price, "selling_price");
  const grossSubtotalInt = multiplyMoneyByQuantityInt(unitPriceInt, soldQuantityInt);

  return {
    option_id: null,
    option_name_snapshot: product.base_unit,
    quantity_int: soldQuantityInt,
    base_quantity_int: soldQuantityInt,
    unit_price_int: unitPriceInt,
    gross_subtotal_int: grossSubtotalInt
  };
}

export function calculateSaleLine(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("Sale line input must be an object");
  }
  validateSellableProduct(input.product);

  let rawLine = null;
  if (input.custom_amount !== undefined && input.custom_amount !== null) {
    rawLine = calculateCustomAmountLine(input.product, input.custom_amount);
  } else if (input.option !== undefined && input.option !== null) {
    rawLine = calculateOptionLine(input.product, input.option, input.quantity);
  } else {
    rawLine = calculateBaseUnitLine(input.product, input.quantity);
  }

  let rawDiscount = input.discount_amount;
  if (rawDiscount === undefined || rawDiscount === null) {
    rawDiscount = 0;
  }
  const discountInt = toMoneyInt(rawDiscount, "discount_amount");
  if (discountInt < 0) {
    throw new ValidationError("Line discount_amount cannot be negative");
  }
  if (discountInt > rawLine.gross_subtotal_int) {
    throw new ValidationError("Line discount_amount cannot exceed line subtotal");
  }

  const netSubtotalInt = rawLine.gross_subtotal_int - discountInt;
  const unitCostInt = toMoneyInt(input.product.cost_price, "cost_price");

  return {
    product_id: input.product.product_id,
    option_id: rawLine.option_id,
    option_name_snapshot: rawLine.option_name_snapshot,
    quantity: fromQuantityInt(rawLine.quantity_int),
    base_quantity: fromQuantityInt(rawLine.base_quantity_int),
    unit_price: fromMoneyInt(rawLine.unit_price_int),
    unit_cost: fromMoneyInt(unitCostInt),
    discount_amount: fromMoneyInt(discountInt),
    subtotal: fromMoneyInt(netSubtotalInt)
  };
}

export function calculateItemProfit(salesItem) {
  const subtotalInt = toMoneyInt(salesItem.subtotal, "subtotal");
  const baseQuantityInt = toQuantityInt(salesItem.base_quantity, "base_quantity");
  const unitCostInt = toMoneyInt(salesItem.unit_cost, "unit_cost");
  const totalCostInt = multiplyMoneyByQuantityInt(unitCostInt, baseQuantityInt);
  return fromMoneyInt(subtotalInt - totalCostInt);
}

export function validatePaymentBreakdown(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("Payment data must be an object");
  }
  const paymentMethod = requireNonEmptyText(input.payment_method, "payment_method");
  if (!VALID_PAYMENT_METHODS.has(paymentMethod)) {
    throw new ValidationError("Invalid payment_method: " + paymentMethod);
  }

  const totalInt = toMoneyInt(input.total_amount, "total_amount");
  if (totalInt < 0) {
    throw new ValidationError("total_amount cannot be negative");
  }

  const customerId = normalizeOptionalText(input.customer_id, "customer_id");
  let cashInt = 0;
  let creditInt = 0;
  let amountPaidInt = 0;

  if (paymentMethod === PAYMENT_METHODS.CASH) {
    cashInt = totalInt;
    creditInt = 0;
    amountPaidInt = toMoneyInt(input.amount_paid, "amount_paid");
    if (amountPaidInt < totalInt) {
      throw new ValidationError("amount_paid must be at least total_amount for CASH sale");
    }
  } else if (paymentMethod === PAYMENT_METHODS.CREDIT) {
    if (customerId === null) {
      throw new ValidationError("customer_id is required for CREDIT sale");
    }
    cashInt = 0;
    creditInt = totalInt;
    amountPaidInt = 0;
  } else {
    if (customerId === null) {
      throw new ValidationError("customer_id is required for SPLIT sale");
    }
    cashInt = toMoneyInt(input.cash_amount, "cash_amount");
    creditInt = toMoneyInt(input.credit_amount, "credit_amount");
    if (cashInt <= 0 || creditInt <= 0) {
      throw new ValidationError("SPLIT sale requires both cash_amount and credit_amount > 0");
    }
    if (cashInt + creditInt !== totalInt) {
      throw new ValidationError("cash_amount + credit_amount must equal total_amount");
    }
    amountPaidInt = toMoneyInt(input.amount_paid, "amount_paid");
    if (amountPaidInt < cashInt) {
      throw new ValidationError("amount_paid must be at least cash_amount for SPLIT sale");
    }
  }

  let changeInt = amountPaidInt - cashInt;
  if (changeInt < 0) {
    changeInt = 0;
  }

  return {
    payment_method: paymentMethod,
    customer_id: customerId,
    cash_amount: fromMoneyInt(cashInt),
    credit_amount: fromMoneyInt(creditInt),
    amount_paid: fromMoneyInt(amountPaidInt),
    change_amount: fromMoneyInt(changeInt)
  };
}

export function formatReceiptNumber(compactManilaDate, sequenceNumber) {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber <= 0) {
    throw new ValidationError("Receipt sequenceNumber must be a positive integer");
  }
  const paddedSequence = String(sequenceNumber).padStart(4, "0");
  return compactManilaDate + "-" + paddedSequence;
}

export function calculateReturnRefundSplit(refundAmount, remainingCreditOnSale) {
  const refundInt = toMoneyInt(refundAmount, "refund_amount");
  if (refundInt <= 0) {
    throw new ValidationError("refund_amount must be greater than zero");
  }
  let creditAvailableInt = 0;
  if (remainingCreditOnSale !== undefined && remainingCreditOnSale !== null) {
    creditAvailableInt = toMoneyInt(remainingCreditOnSale, "remaining_credit");
  }
  if (creditAvailableInt < 0) {
    creditAvailableInt = 0;
  }

  let creditRefundInt = refundInt;
  if (creditRefundInt > creditAvailableInt) {
    creditRefundInt = creditAvailableInt;
  }
  const cashRefundInt = refundInt - creditRefundInt;

  return {
    credit_refund_amount: fromMoneyInt(creditRefundInt),
    cash_refund_amount: fromMoneyInt(cashRefundInt)
  };
}
