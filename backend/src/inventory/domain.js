import {
  fromMoneyInt,
  fromQuantityInt,
  multiplyQuantitiesInt,
  toMoneyInt,
  toQuantityInt
} from "../shared/decimal.js";
import { ValidationError } from "../shared/errors.js";
import {
  normalizeBoolean,
  normalizeOptionalText,
  requireNonEmptyText
} from "../shared/validation.js";

export const INVENTORY_TRANSACTION_TYPES = {
  STOCK_IN: "STOCK_IN",
  SALE: "SALE",
  RETURN: "RETURN",
  ADJUSTMENT: "ADJUSTMENT",
  DAMAGED: "DAMAGED",
  EXPIRED: "EXPIRED"
};

const VALID_TRANSACTION_TYPES = new Set(Object.values(INVENTORY_TRANSACTION_TYPES));

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
  if (imageUrl !== null) {
    if (imageUrl.length > 2048) {
      throw new ValidationError("image_url cannot exceed 2048 characters");
    }
    const isAllowedPath =
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://") ||
      imageUrl.startsWith("/uploads/") ||
      imageUrl.startsWith("/");
    if (!isAllowedPath) {
      throw new ValidationError("image_url must be an HTTP/HTTPS URL or a local path");
    }
  }
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

export const PRODUCT_CSV_COLUMNS = [
  "product_name",
  "barcode",
  "category",
  "description",
  "image_url",
  "base_unit",
  "cost_price",
  "selling_price",
  "current_stock",
  "reorder_level",
  "allow_custom_amount",
  "is_active"
];

export const REQUIRED_PRODUCT_CSV_COLUMNS = [
  "product_name",
  "base_unit",
  "selling_price"
];

const COMMON_UNIT_MAP = {
  pc: "Piece (pc)",
  pcs: "Piece (pc)",
  piece: "Piece (pc)",
  pieces: "Piece (pc)",
  "piece (pc)": "Piece (pc)",
  pack: "Pack",
  packs: "Pack",
  box: "Box",
  boxes: "Box",
  bottle: "Bottle",
  bottles: "Bottle",
  can: "Can",
  cans: "Can",
  sachet: "Sachet",
  sachets: "Sachet",
  kg: "Kilogram (kg)",
  kgs: "Kilogram (kg)",
  kilo: "Kilogram (kg)",
  kilos: "Kilogram (kg)",
  kilogram: "Kilogram (kg)",
  kilograms: "Kilogram (kg)",
  "kilogram (kg)": "Kilogram (kg)",
  g: "Gram (g)",
  gram: "Gram (g)",
  grams: "Gram (g)",
  "gram (g)": "Gram (g)",
  l: "Liter (L)",
  liter: "Liter (L)",
  liters: "Liter (L)",
  "liter (l)": "Liter (L)",
  ml: "Milliliter (mL)",
  milliliter: "Milliliter (mL)",
  milliliters: "Milliliter (mL)",
  "milliliter (ml)": "Milliliter (mL)"
};

export function normalizeBaseUnit(rawUnit) {
  if (typeof rawUnit !== "string") {
    return "";
  }
  const trimmed = rawUnit.trim();
  const lower = trimmed.toLowerCase();
  if (COMMON_UNIT_MAP[lower]) {
    return COMMON_UNIT_MAP[lower];
  }
  return trimmed;
}

export function validateProductCsvHeaders(rawHeaders) {
  if (!Array.isArray(rawHeaders) || rawHeaders.length === 0) {
    throw new ValidationError("CSV file header is missing or empty");
  }

  const normalizedHeaders = new Set();
  for (let i = 0; i < rawHeaders.length; i = i + 1) {
    let h = String(rawHeaders[i]).trim().toLowerCase();
    if (h === "category_name") {
      h = "category";
    }
    normalizedHeaders.add(h);
  }

  const missingColumns = [];
  for (let r = 0; r < REQUIRED_PRODUCT_CSV_COLUMNS.length; r = r + 1) {
    const requiredCol = REQUIRED_PRODUCT_CSV_COLUMNS[r];
    if (!normalizedHeaders.has(requiredCol)) {
      missingColumns.push(requiredCol);
    }
  }

  if (missingColumns.length > 0) {
    throw new ValidationError(
      "Missing required CSV column(s): " +
        missingColumns.join(", ") +
        ". Required columns are: " +
        REQUIRED_PRODUCT_CSV_COLUMNS.join(", ")
    );
  }

  return true;
}

function parseCsvBoolean(value, defaultValue) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }
  const str = String(value).trim().toLowerCase();
  if (str === "true" || str === "yes" || str === "1" || str === "t") {
    return true;
  }
  if (str === "false" || str === "no" || str === "0" || str === "f") {
    return false;
  }
  return null;
}

export function validateProductCsvRows(parsedRows, existingProducts, existingOptions, updateExisting) {
  if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
    throw new ValidationError("CSV file contains no product data rows");
  }

  const existingProductsByBarcode = new Map();
  if (Array.isArray(existingProducts)) {
    for (let p = 0; p < existingProducts.length; p = p + 1) {
      const prod = existingProducts[p];
      if (prod.barcode && prod.deleted_at === null) {
        existingProductsByBarcode.set(prod.barcode, prod);
      }
    }
  }

  const existingOptionsByBarcode = new Map();
  if (Array.isArray(existingOptions)) {
    for (let o = 0; o < existingOptions.length; o = o + 1) {
      const opt = existingOptions[o];
      if (opt.barcode && opt.is_active) {
        existingOptionsByBarcode.set(opt.barcode, opt);
      }
    }
  }

  const fileBarcodes = new Map();
  const errors = [];
  const validatedRecords = [];

  for (let i = 0; i < parsedRows.length; i = i + 1) {
    const rawRow = parsedRows[i];
    const rowNum = i + 2; // Line 1 is headers; line 2 is first data row

    // Normalize keys (case-insensitive & map category_name -> category)
    const row = {};
    const keys = Object.keys(rawRow);
    for (let k = 0; k < keys.length; k = k + 1) {
      const key = keys[k];
      let normKey = key.trim().toLowerCase();
      if (normKey === "category_name") {
        normKey = "category";
      }
      row[normKey] = rawRow[key];
    }

    // 1. product_name (Required)
    const rawName = row["product_name"];
    let productName = "";
    if (typeof rawName === "string") {
      productName = rawName.trim();
    }
    if (productName.length === 0) {
      errors.push('Row ' + rowNum + ': "product_name" is required and cannot be empty.');
    } else if (productName.length > 255) {
      errors.push('Row ' + rowNum + ': "product_name" cannot exceed 255 characters.');
    }

    // 2. base_unit (Required)
    const rawUnit = row["base_unit"];
    const baseUnit = normalizeBaseUnit(rawUnit);
    if (!baseUnit || baseUnit.length === 0) {
      errors.push('Row ' + rowNum + ': "base_unit" is required and cannot be empty.');
    }

    // 3. selling_price (Required, number > 0)
    const rawSellingPrice = row["selling_price"];
    let sellingPrice = NaN;
    if (rawSellingPrice !== undefined && rawSellingPrice !== null && String(rawSellingPrice).trim() !== "") {
      sellingPrice = Number(String(rawSellingPrice).replace(/,/g, "").trim());
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      errors.push('Row ' + rowNum + ': "selling_price" is required and must be a valid number greater than zero.');
    }

    // 4. cost_price (Optional, number >= 0, default 0)
    const rawCostPrice = row["cost_price"];
    let costPrice = 0;
    if (rawCostPrice !== undefined && rawCostPrice !== null && String(rawCostPrice).trim() !== "") {
      costPrice = Number(String(rawCostPrice).replace(/,/g, "").trim());
      if (!Number.isFinite(costPrice) || costPrice < 0) {
        errors.push('Row ' + rowNum + ': "cost_price" must be a valid number greater than or equal to zero.');
      }
    }

    // 5. current_stock (Optional, number >= 0, default 0)
    const rawCurrentStock = row["current_stock"];
    let currentStock = 0;
    let stockProvided = false;
    if (rawCurrentStock !== undefined && rawCurrentStock !== null && String(rawCurrentStock).trim() !== "") {
      currentStock = Number(String(rawCurrentStock).replace(/,/g, "").trim());
      stockProvided = true;
      if (!Number.isFinite(currentStock) || currentStock < 0) {
        errors.push('Row ' + rowNum + ': "current_stock" must be a valid number greater than or equal to zero.');
      }
    }

    // 6. reorder_level (Optional, number >= 0, default 0)
    const rawReorderLevel = row["reorder_level"];
    let reorderLevel = 0;
    if (rawReorderLevel !== undefined && rawReorderLevel !== null && String(rawReorderLevel).trim() !== "") {
      reorderLevel = Number(String(rawReorderLevel).replace(/,/g, "").trim());
      if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
        errors.push('Row ' + rowNum + ': "reorder_level" must be a valid number greater than or equal to zero.');
      }
    }

    // 7. allow_custom_amount (Optional, boolean, default false)
    const allowCustomAmount = parseCsvBoolean(row["allow_custom_amount"], false);
    if (allowCustomAmount === null) {
      errors.push('Row ' + rowNum + ': "allow_custom_amount" must be a boolean (true/false).');
    }

    // 8. is_active (Optional, boolean, default true)
    const isActive = parseCsvBoolean(row["is_active"], true);
    if (isActive === null) {
      errors.push('Row ' + rowNum + ': "is_active" must be a boolean (true/false).');
    }

    // 9. barcode (Optional string, unique if provided)
    let barcode = null;
    const rawBarcode = row["barcode"];
    if (rawBarcode !== undefined && rawBarcode !== null && String(rawBarcode).trim() !== "") {
      barcode = String(rawBarcode).trim();
      if (barcode.length > 128) {
        errors.push('Row ' + rowNum + ': "barcode" cannot exceed 128 characters.');
      } else {
        // In-file duplicate check
        if (fileBarcodes.has(barcode)) {
          errors.push(
            'Row ' +
              rowNum +
              ': Duplicate barcode "' +
              barcode +
              '" found in CSV (already used in row ' +
              fileBarcodes.get(barcode) +
              ').'
          );
        } else {
          fileBarcodes.set(barcode, rowNum);
        }

        // Selling options duplicate check
        const existingOption = existingOptionsByBarcode.get(barcode);
        if (existingOption) {
          errors.push(
            'Row ' +
              rowNum +
              ': Barcode "' +
              barcode +
              '" is already assigned to a selling option ("' +
              existingOption.option_name +
              '").'
          );
        }

        // Existing product duplicate check
        const existingProd = existingProductsByBarcode.get(barcode);
        if (existingProd && !updateExisting) {
          errors.push(
            'Row ' +
              rowNum +
              ': Barcode "' +
              barcode +
              '" is already assigned to an existing product ("' +
              existingProd.product_name +
              '"). Check "Update existing products if barcode matches" to allow updating existing items.'
          );
        }
      }
    }

    // Category and description
    let category = null;
    if (row["category"] !== undefined && row["category"] !== null && String(row["category"]).trim() !== "") {
      category = String(row["category"]).trim();
    }

    let description = null;
    if (row["description"] !== undefined && row["description"] !== null && String(row["description"]).trim() !== "") {
      description = String(row["description"]).trim();
    }

    // image_url (Optional string, max 2048 chars, http/https or /uploads/ path)
    let imageUrl = null;
    const rawImageUrl = row["image_url"];
    if (rawImageUrl !== undefined && rawImageUrl !== null && String(rawImageUrl).trim() !== "") {
      imageUrl = String(rawImageUrl).trim();
      if (imageUrl.length > 2048) {
        errors.push('Row ' + rowNum + ': "image_url" cannot exceed 2048 characters.');
      } else {
        const isAllowedPath =
          imageUrl.startsWith("http://") ||
          imageUrl.startsWith("https://") ||
          imageUrl.startsWith("/uploads/") ||
          imageUrl.startsWith("/");
        if (!isAllowedPath) {
          errors.push('Row ' + rowNum + ': "image_url" must start with http://, https://, or a local / path.');
        }
      }
    }

    let existingProduct = null;
    if (barcode && existingProductsByBarcode.has(barcode)) {
      existingProduct = existingProductsByBarcode.get(barcode);
    }

    validatedRecords.push({
      row_number: rowNum,
      product_name: productName,
      barcode: barcode,
      category_name: category,
      description: description,
      image_url: imageUrl,
      base_unit: baseUnit,
      cost_price: Number.isFinite(costPrice) ? costPrice : 0,
      selling_price: Number.isFinite(sellingPrice) ? sellingPrice : 0,
      current_stock: Number.isFinite(currentStock) ? currentStock : 0,
      stock_provided: stockProvided,
      reorder_level: Number.isFinite(reorderLevel) ? reorderLevel : 0,
      allow_custom_amount: Boolean(allowCustomAmount),
      is_active: Boolean(isActive),
      existing_product: existingProduct
    });
  }

  if (errors.length > 0) {
    const errorTitle = "CSV import validation failed (" + errors.length + " error" + (errors.length > 1 ? "s" : "") + " found):";
    throw new ValidationError(errorTitle + "\n• " + errors.join("\n• "));
  }

  return validatedRecords;
}
