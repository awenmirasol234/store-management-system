import {
  fromMoneyInt,
  fromQuantityInt,
  multiplyQuantitiesInt,
  toMoneyInt,
  toQuantityInt
} from "../shared/decimal.js";
import { ValidationError } from "../shared/errors.js";

export const INVENTORY_TRANSACTION_TYPES = {
  STOCK_IN: "STOCK_IN",
  SALE: "SALE",
  RETURN: "RETURN",
  ADJUSTMENT: "ADJUSTMENT",
  DAMAGED: "DAMAGED",
  EXPIRED: "EXPIRED"
};

const VALID_TRANSACTION_TYPES = new Set(Object.values(INVENTORY_TRANSACTION_TYPES));

export function requireNonEmptyText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(fieldName + " is required");
  }
  return value.trim();
}

export function normalizeOptionalText(value, fieldName) {
  if (value === undefined || value === null) {
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

export function normalizeBoolean(value, defaultValue, fieldName) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value !== "boolean") {
    throw new ValidationError(fieldName + " must be a boolean");
  }
  return value;
}

export function createCategoryEntity(input) {
  const categoryId = requireNonEmptyText(input.category_id, "category_id");
  const categoryName = requireNonEmptyText(input.category_name, "category_name");
  const description = normalizeOptionalText(input.description, "description");
  const isActive = normalizeBoolean(input.is_active, true, "is_active");

  return {
    category_id: categoryId,
    category_name: categoryName,
    description: description,
    is_active: isActive
  };
}

export function createSupplierEntity(input) {
  const supplierId = requireNonEmptyText(input.supplier_id, "supplier_id");
  const supplierName = requireNonEmptyText(input.supplier_name, "supplier_name");
  const contactPerson = normalizeOptionalText(input.contact_person, "contact_person");
  const phone = normalizeOptionalText(input.phone, "phone");
  const address = normalizeOptionalText(input.address, "address");
  const isActive = normalizeBoolean(input.is_active, true, "is_active");

  return {
    supplier_id: supplierId,
    supplier_name: supplierName,
    contact_person: contactPerson,
    phone: phone,
    address: address,
    is_active: isActive
  };
}

export function createProductEntity(input) {
  const productId = requireNonEmptyText(input.product_id, "product_id");
  const categoryId = normalizeOptionalText(input.category_id, "category_id");
  const productName = requireNonEmptyText(input.product_name, "product_name");
  const barcode = normalizeOptionalText(input.barcode, "barcode");
  const description = normalizeOptionalText(input.description, "description");
  const imageUrl = normalizeOptionalText(input.image_url, "image_url");
  const baseUnit = requireNonEmptyText(input.base_unit, "base_unit");

  let rawStock = input.current_stock;
  if (rawStock === undefined || rawStock === null) {
    rawStock = 0;
  }
  const currentStockInt = toQuantityInt(rawStock, "current_stock");
  if (currentStockInt < 0) {
    throw new ValidationError("current_stock cannot be negative");
  }

  let rawCost = input.cost_price;
  if (rawCost === undefined || rawCost === null) {
    rawCost = 0;
  }
  const costPriceInt = toMoneyInt(rawCost, "cost_price");
  if (costPriceInt < 0) {
    throw new ValidationError("cost_price cannot be negative");
  }

  const sellingPriceInt = toMoneyInt(input.selling_price, "selling_price");
  if (sellingPriceInt <= 0) {
    throw new ValidationError("selling_price must be greater than zero");
  }

  let rawReorder = input.reorder_level;
  if (rawReorder === undefined || rawReorder === null) {
    rawReorder = 0;
  }
  const reorderLevelInt = toQuantityInt(rawReorder, "reorder_level");
  if (reorderLevelInt < 0) {
    throw new ValidationError("reorder_level cannot be negative");
  }

  const allowCustomAmount = normalizeBoolean(
    input.allow_custom_amount,
    false,
    "allow_custom_amount"
  );
  const isActive = normalizeBoolean(input.is_active, true, "is_active");
  const deletedAt = normalizeOptionalText(input.deleted_at, "deleted_at");
  const createdAt = requireNonEmptyText(input.created_at, "created_at");
  const updatedAt = requireNonEmptyText(input.updated_at, "updated_at");

  return {
    product_id: productId,
    category_id: categoryId,
    product_name: productName,
    barcode: barcode,
    description: description,
    image_url: imageUrl,
    base_unit: baseUnit,
    current_stock: fromQuantityInt(currentStockInt),
    cost_price: fromMoneyInt(costPriceInt),
    selling_price: fromMoneyInt(sellingPriceInt),
    reorder_level: fromQuantityInt(reorderLevelInt),
    allow_custom_amount: allowCustomAmount,
    is_active: isActive,
    deleted_at: deletedAt,
    created_at: createdAt,
    updated_at: updatedAt
  };
}

export function createSellingOptionEntity(input) {
  const optionId = requireNonEmptyText(input.option_id, "option_id");
  const productId = requireNonEmptyText(input.product_id, "product_id");
  const optionName = requireNonEmptyText(input.option_name, "option_name");
  const barcode = normalizeOptionalText(input.barcode, "barcode");

  const quantityInt = toQuantityInt(input.quantity, "quantity");
  if (quantityInt <= 0) {
    throw new ValidationError("option quantity must be greater than zero");
  }

  const priceInt = toMoneyInt(input.price, "price");
  if (priceInt <= 0) {
    throw new ValidationError("option price must be greater than zero");
  }

  const isActive = normalizeBoolean(input.is_active, true, "is_active");
  const createdAt = requireNonEmptyText(input.created_at, "created_at");
  const updatedAt = requireNonEmptyText(input.updated_at, "updated_at");

  return {
    option_id: optionId,
    product_id: productId,
    option_name: optionName,
    barcode: barcode,
    quantity: fromQuantityInt(quantityInt),
    price: fromMoneyInt(priceInt),
    is_active: isActive,
    created_at: createdAt,
    updated_at: updatedAt
  };
}

function validateInventoryQuantitySign(transactionType, quantityInt, remarks) {
  if (
    transactionType === INVENTORY_TRANSACTION_TYPES.STOCK_IN ||
    transactionType === INVENTORY_TRANSACTION_TYPES.RETURN
  ) {
    if (quantityInt <= 0) {
      throw new ValidationError(transactionType + " quantity must be positive");
    }
    return;
  }

  if (
    transactionType === INVENTORY_TRANSACTION_TYPES.SALE ||
    transactionType === INVENTORY_TRANSACTION_TYPES.DAMAGED ||
    transactionType === INVENTORY_TRANSACTION_TYPES.EXPIRED
  ) {
    if (quantityInt >= 0) {
      throw new ValidationError(transactionType + " quantity must be negative");
    }
  }

  if (transactionType === INVENTORY_TRANSACTION_TYPES.ADJUSTMENT) {
    if (quantityInt === 0) {
      throw new ValidationError("ADJUSTMENT quantity cannot be zero");
    }
  }

  if (
    transactionType === INVENTORY_TRANSACTION_TYPES.ADJUSTMENT ||
    transactionType === INVENTORY_TRANSACTION_TYPES.DAMAGED ||
    transactionType === INVENTORY_TRANSACTION_TYPES.EXPIRED
  ) {
    if (remarks === null) {
      throw new ValidationError("remarks is required for " + transactionType);
    }
  }
}

export function createInventoryTransactionEntity(input) {
  const transactionId = requireNonEmptyText(input.transaction_id, "transaction_id");
  const productId = requireNonEmptyText(input.product_id, "product_id");
  const supplierId = normalizeOptionalText(input.supplier_id, "supplier_id");
  const optionId = normalizeOptionalText(input.option_id, "option_id");
  const transactionType = requireNonEmptyText(input.transaction_type, "transaction_type");

  if (!VALID_TRANSACTION_TYPES.has(transactionType)) {
    throw new ValidationError("Invalid inventory transaction_type: " + transactionType);
  }

  const quantityInt = toQuantityInt(input.quantity, "quantity");
  const remarks = normalizeOptionalText(input.remarks, "remarks");
  validateInventoryQuantitySign(transactionType, quantityInt, remarks);

  let rawUnitCost = input.unit_cost;
  if (rawUnitCost === undefined || rawUnitCost === null) {
    rawUnitCost = 0;
  }
  const unitCostInt = toMoneyInt(rawUnitCost, "unit_cost");
  if (unitCostInt < 0) {
    throw new ValidationError("unit_cost cannot be negative");
  }

  const referenceNumber = normalizeOptionalText(input.reference_number, "reference_number");
  const createdBy = requireNonEmptyText(input.created_by, "created_by");
  const createdAt = requireNonEmptyText(input.created_at, "created_at");

  return {
    transaction_id: transactionId,
    product_id: productId,
    supplier_id: supplierId,
    option_id: optionId,
    transaction_type: transactionType,
    quantity: fromQuantityInt(quantityInt),
    unit_cost: fromMoneyInt(unitCostInt),
    reference_number: referenceNumber,
    remarks: remarks,
    created_by: createdBy,
    created_at: createdAt
  };
}

export function calculateStockInBaseQuantity(enteredQuantity, optionQuantity) {
  const enteredInt = toQuantityInt(enteredQuantity, "entered_quantity");
  if (enteredInt <= 0) {
    throw new ValidationError("entered_quantity must be greater than zero");
  }
  if (optionQuantity === undefined || optionQuantity === null) {
    return fromQuantityInt(enteredInt);
  }
  const multiplierInt = toQuantityInt(optionQuantity, "option_quantity");
  if (multiplierInt <= 0) {
    throw new ValidationError("option_quantity must be greater than zero");
  }
  const totalInt = multiplyQuantitiesInt(enteredInt, multiplierInt);
  return fromQuantityInt(totalInt);
}

export function isProductLowStock(product) {
  if (!product.is_active || product.deleted_at !== null) {
    return false;
  }
  const currentStockInt = toQuantityInt(product.current_stock, "current_stock");
  const reorderLevelInt = toQuantityInt(product.reorder_level, "reorder_level");
  return currentStockInt <= reorderLevelInt;
}
