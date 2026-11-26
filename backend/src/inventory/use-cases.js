import { fromMoneyInt, fromQuantityInt, toMoneyInt, toQuantityInt } from "../shared/decimal.js";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors.js";
import { normalizeOptionalText } from "../shared/validation.js";
import { generateCsv, parseCsv } from "../shared/csv.js";
import { generateProductXlsxTemplate, generateProductsXlsx, parseXlsx } from "../shared/xlsx.js";
import {
  INVENTORY_TRANSACTION_TYPES,
  PRODUCT_CSV_COLUMNS,
  calculateStockInBaseQuantity,
  createCategoryEntity,
  createInventoryTransactionEntity,
  createProductEntity,
  createSellingOptionEntity,
  createSupplierEntity,
  isProductLowStock,
  validateProductCsvHeaders,
  validateProductCsvRows
} from "./domain.js";

async function assertBarcodeAvailable(dependencies, barcode, ignoreProductId, ignoreOptionId) {
  if (barcode === null) {
    return;
  }
  const existingProduct = await dependencies.productRepository.findByBarcode(barcode);
  if (existingProduct && existingProduct.deleted_at === null) {
    if (existingProduct.product_id !== ignoreProductId) {
      throw new ConflictError("Barcode is already assigned to another product: " + barcode);
    }
  }
  const existingOption = await dependencies.sellingOptionRepository.findByBarcode(barcode);
  if (existingOption && existingOption.option_id !== ignoreOptionId) {
    throw new ConflictError("Barcode is already assigned to a selling option: " + barcode);
  }
}

export function createCreateProductUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const now = dependencies.clock.nowIso();
    const barcode = normalizeOptionalText(safeInput.barcode, "barcode");
    await assertBarcodeAvailable(dependencies, barcode, null, null);

    const product = createProductEntity({
      product_id: dependencies.idGenerator.nextId(),
      category_id: safeInput.category_id,
      product_name: safeInput.product_name,
      barcode: barcode,
      description: safeInput.description,
      image_url: safeInput.image_url,
      base_unit: safeInput.base_unit,
      current_stock: safeInput.current_stock,
      cost_price: safeInput.cost_price,
      selling_price: safeInput.selling_price,
      reorder_level: safeInput.reorder_level,
      allow_custom_amount: safeInput.allow_custom_amount,
      is_active: safeInput.is_active,
      deleted_at: null,
      created_at: now,
      updated_at: now
    });

    const saveProduct = async function saveProduct() {
      await dependencies.productRepository.save(product);

      if (product.current_stock > 0) {
        const initialTransaction = createInventoryTransactionEntity({
          transaction_id: dependencies.idGenerator.nextId(),
          product_id: product.product_id,
          supplier_id: null,
          option_id: null,
          transaction_type: INVENTORY_TRANSACTION_TYPES.STOCK_IN,
          quantity: product.current_stock,
          unit_cost: product.cost_price,
          reference_number: "INITIAL-STOCK",
          remarks: "Initial inventory stock",
          created_by: safeInput.created_by || "system",
          created_at: now
        });
        await dependencies.inventoryTransactionRepository.save(initialTransaction);
      }

      return product;
    };

    if (dependencies.unitOfWork) {
      return dependencies.unitOfWork.run(saveProduct);
    }
    return saveProduct();
  };
}

function pickField(incomingValue, fallbackValue) {
  if (incomingValue !== undefined) {
    return incomingValue;
  }
  return fallbackValue;
}

export function createUpdateProductUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const existing = await dependencies.productRepository.findById(safeInput.product_id);
    if (!existing || existing.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + safeInput.product_id);
    }

    let nextBarcode = existing.barcode;
    if (safeInput.barcode !== undefined) {
      nextBarcode = normalizeOptionalText(safeInput.barcode, "barcode");
    }
    await assertBarcodeAvailable(dependencies, nextBarcode, existing.product_id, null);

    const updated = createProductEntity({
      product_id: existing.product_id,
      category_id: pickField(safeInput.category_id, existing.category_id),
      product_name: pickField(safeInput.product_name, existing.product_name),
      barcode: nextBarcode,
      description: pickField(safeInput.description, existing.description),
      image_url: pickField(safeInput.image_url, existing.image_url),
      base_unit: pickField(safeInput.base_unit, existing.base_unit),
      current_stock: existing.current_stock,
      cost_price: pickField(safeInput.cost_price, existing.cost_price),
      selling_price: pickField(safeInput.selling_price, existing.selling_price),
      reorder_level: pickField(safeInput.reorder_level, existing.reorder_level),
      allow_custom_amount: pickField(safeInput.allow_custom_amount, existing.allow_custom_amount),
      is_active: pickField(safeInput.is_active, existing.is_active),
      deleted_at: null,
      created_at: existing.created_at,
      updated_at: dependencies.clock.nowIso()
    });

    await dependencies.productRepository.save(updated);
    return updated;
  };
}

export function createDeleteProductUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const existing = await dependencies.productRepository.findById(safeInput.product_id);
    if (!existing || existing.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + safeInput.product_id);
    }

    const now = dependencies.clock.nowIso();
    const deleted = Object.assign({}, existing, {
      is_active: false,
      deleted_at: now,
      updated_at: now
    });

    await dependencies.productRepository.save(deleted);
    return deleted;
  };
}

export function createSaveSellingOptionUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const product = await dependencies.productRepository.findById(safeInput.product_id);
    if (!product || product.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + safeInput.product_id);
    }

    const now = dependencies.clock.nowIso();
    let optionId = safeInput.option_id;
    let createdAt = now;
    if (optionId) {
      const existing = await dependencies.sellingOptionRepository.findById(optionId);
      if (!existing) {
        throw new NotFoundError("Selling option not found: " + optionId);
      }
      if (existing.product_id !== product.product_id) {
        throw new ValidationError("Selling option does not belong to product");
      }
      createdAt = existing.created_at;
    } else {
      optionId = dependencies.idGenerator.nextId();
    }

    const barcode = normalizeOptionalText(safeInput.barcode, "barcode");
    await assertBarcodeAvailable(dependencies, barcode, null, optionId);

    const option = createSellingOptionEntity({
      option_id: optionId,
      product_id: product.product_id,
      option_name: safeInput.option_name,
      barcode: barcode,
      quantity: safeInput.quantity,
      price: safeInput.price,
      is_active: safeInput.is_active,
      created_at: createdAt,
      updated_at: now
    });

    await dependencies.sellingOptionRepository.save(option);
    return option;
  };
}

export function createStockInUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    return dependencies.unitOfWork.run(async function runStockIn() {
      const product = await dependencies.productRepository.findById(safeInput.product_id);
      if (!product || product.deleted_at !== null) {
        throw new NotFoundError("Product not found: " + safeInput.product_id);
      }

      let optionQuantity = null;
      let optionId = null;
      if (safeInput.option_id) {
        const option = await dependencies.sellingOptionRepository.findById(safeInput.option_id);
        if (!option || option.product_id !== product.product_id) {
          throw new NotFoundError("Selling option not found for product: " + safeInput.option_id);
        }
        optionQuantity = option.quantity;
        optionId = option.option_id;
      }

      const addedQuantity = calculateStockInBaseQuantity(safeInput.quantity, optionQuantity);
      const addedQuantityInt = toQuantityInt(addedQuantity, "added_quantity");
      const currentStockInt = toQuantityInt(product.current_stock, "current_stock");
      const updatedStock = fromQuantityInt(currentStockInt + addedQuantityInt);

      let nextCostPrice = product.cost_price;
      let transactionUnitCost = product.cost_price;
      if (safeInput.unit_cost !== undefined && safeInput.unit_cost !== null) {
        const parsedCostInt = toMoneyInt(safeInput.unit_cost, "unit_cost");
        nextCostPrice = fromMoneyInt(parsedCostInt);
        transactionUnitCost = nextCostPrice;
      }

      const now = dependencies.clock.nowIso();
      const updatedProduct = createProductEntity(
        Object.assign({}, product, {
          current_stock: updatedStock,
          cost_price: nextCostPrice,
          updated_at: now
        })
      );

      const transaction = createInventoryTransactionEntity({
        transaction_id: dependencies.idGenerator.nextId(),
        product_id: product.product_id,
        supplier_id: safeInput.supplier_id,
        option_id: optionId,
        transaction_type: INVENTORY_TRANSACTION_TYPES.STOCK_IN,
        quantity: addedQuantity,
        unit_cost: transactionUnitCost,
        reference_number: safeInput.reference_number,
        remarks: safeInput.remarks,
        created_by: safeInput.created_by,
        created_at: now
      });

      await dependencies.productRepository.save(updatedProduct);
      await dependencies.inventoryTransactionRepository.save(transaction);

      return {
        product: updatedProduct,
        transaction: transaction
      };
    });
  };
}

export function createAdjustStockUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    return dependencies.unitOfWork.run(async function runAdjustStock() {
      const allowedTypes = new Set([
        INVENTORY_TRANSACTION_TYPES.ADJUSTMENT,
        INVENTORY_TRANSACTION_TYPES.DAMAGED,
        INVENTORY_TRANSACTION_TYPES.EXPIRED
      ]);
      if (!allowedTypes.has(safeInput.transaction_type)) {
        throw new ValidationError(
          "AdjustStock only supports ADJUSTMENT, DAMAGED, or EXPIRED"
        );
      }

      const product = await dependencies.productRepository.findById(safeInput.product_id);
      if (!product || product.deleted_at !== null) {
        throw new NotFoundError("Product not found: " + safeInput.product_id);
      }

      const now = dependencies.clock.nowIso();
      const transaction = createInventoryTransactionEntity({
        transaction_id: dependencies.idGenerator.nextId(),
        product_id: product.product_id,
        supplier_id: null,
        option_id: null,
        transaction_type: safeInput.transaction_type,
        quantity: safeInput.quantity,
        unit_cost: product.cost_price,
        reference_number: safeInput.reference_number,
        remarks: safeInput.remarks,
        created_by: safeInput.created_by,
        created_at: now
      });

      const currentStockInt = toQuantityInt(product.current_stock, "current_stock");
      const deltaInt = toQuantityInt(transaction.quantity, "quantity");
      const nextStockInt = currentStockInt + deltaInt;
      if (nextStockInt < 0) {
        throw new ValidationError("Stock adjustment cannot result in negative inventory");
      }

      const updatedProduct = createProductEntity(
        Object.assign({}, product, {
          current_stock: fromQuantityInt(nextStockInt),
          updated_at: now
        })
      );

      await dependencies.productRepository.save(updatedProduct);
      await dependencies.inventoryTransactionRepository.save(transaction);

      return {
        product: updatedProduct,
        transaction: transaction
      };
    });
  };
}

export function createGetLowStockProductsUseCase(dependencies) {
  return async function execute() {
    const products = await dependencies.productRepository.listAll();
    const lowStockProducts = [];
    for (let index = 0; index < products.length; index++) {
      const product = products[index];
      if (isProductLowStock(product)) {
        lowStockProducts.push(product);
      }
    }
    return lowStockProducts;
  };
}

export function createListProductsUseCase(dependencies) {
  return async function execute() {
    return dependencies.productRepository.listAll();
  };
}

export function createLookupBarcodeUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const barcode = safeInput.barcode;
    const product = await dependencies.productRepository.findByBarcode(barcode);
    if (product && product.deleted_at === null && product.is_active) {
      const options = await dependencies.sellingOptionRepository.listByProductId(product.product_id);
      return {
        match_type: "PRODUCT",
        product: product,
        option: null,
        options: options
      };
    }

    const option = await dependencies.sellingOptionRepository.findByBarcode(barcode);
    if (option && option.is_active) {
      const parentProduct = await dependencies.productRepository.findById(option.product_id);
      if (parentProduct && parentProduct.deleted_at === null && parentProduct.is_active) {
        const options = await dependencies.sellingOptionRepository.listByProductId(
          parentProduct.product_id
        );
        return {
          match_type: "OPTION",
          product: parentProduct,
          option: option,
          options: options
        };
      }
    }

    throw new NotFoundError("No product or selling option matches barcode: " + barcode);
  };
}

export function createGetProductUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const product = await dependencies.productRepository.findById(safeInput.product_id);
    if (!product || product.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + safeInput.product_id);
    }
    const options = await dependencies.sellingOptionRepository.listByProductId(product.product_id);
    return Object.assign({}, product, { selling_options: options });
  };
}

export function createListSellingOptionsUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    return dependencies.sellingOptionRepository.listByProductId(safeInput.product_id);
  };
}

export function createListInventoryTransactionsUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    return dependencies.inventoryTransactionRepository.listByProductId(safeInput.product_id);
  };
}

export function createListCategoriesUseCase(dependencies) {
  return async function execute() {
    return dependencies.categoryRepository.listAll();
  };
}

export function createCreateCategoryUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const category = createCategoryEntity(
      Object.assign({}, safeInput, { category_id: dependencies.idGenerator.nextId() })
    );
    await dependencies.categoryRepository.save(category);
    return category;
  };
}

export function createListSuppliersUseCase(dependencies) {
  return async function execute() {
    return dependencies.supplierRepository.listAll();
  };
}

export function createCreateSupplierUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const supplier = createSupplierEntity(
      Object.assign({}, safeInput, { supplier_id: dependencies.idGenerator.nextId() })
    );
    await dependencies.supplierRepository.save(supplier);
    return supplier;
  };
}

export function createListUnitsUseCase(dependencies) {
  return async function execute() {
    return dependencies.unitRepository.listAll();
  };
}

export function createImportProductsFromCsvUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const updateExisting = Boolean(safeInput.update_existing);
    const createdBy = safeInput.created_by || "system";
    const now = dependencies.clock.nowIso();

    // 1. Parse File (CSV or XLSX)
    let parsed;
    if (safeInput.fileType === "xlsx" || (safeInput.fileBuffer && !safeInput.csvText)) {
      if (!safeInput.fileBuffer || safeInput.fileBuffer.length === 0) {
        throw new ValidationError("Excel file is empty. Please provide a valid .xlsx file with product data.");
      }
      parsed = await parseXlsx(safeInput.fileBuffer);
    } else {
      const csvText = safeInput.csvText;
      if (typeof csvText !== "string" || csvText.trim().length === 0) {
        throw new ValidationError("CSV file is empty. Please provide a valid CSV file with product data.");
      }
      parsed = parseCsv(csvText);
    }

    if (parsed.headers.length === 0) {
      throw new ValidationError("File header is missing or empty.");
    }
    if (parsed.rowCount === 0) {
      throw new ValidationError("File contains no product data rows.");
    }

    // 2. Validate Headers
    validateProductCsvHeaders(parsed.headers);

    // 3. Fetch existing data for duplicate checks and category resolution
    const [existingProducts, existingCategories] = await Promise.all([
      dependencies.productRepository.listAll(),
      dependencies.categoryRepository.listAll()
    ]);

    // Also fetch selling options across products to check barcode collisions
    let allSellingOptions = [];
    if (dependencies.sellingOptionRepository) {
      const optionPromises = existingProducts.map(function (prod) {
        return dependencies.sellingOptionRepository.listByProductId(prod.product_id);
      });
      const optionArrays = await Promise.all(optionPromises);
      for (let i = 0; i < optionArrays.length; i = i + 1) {
        allSellingOptions = allSellingOptions.concat(optionArrays[i]);
      }
    }

    // 4. Validate all data rows (All-or-nothing check)
    const validatedRecords = validateProductCsvRows(
      parsed.rows,
      existingProducts,
      allSellingOptions,
      updateExisting
    );

    // 5. Category lookup map (case-insensitive name -> category_id)
    const categoryMap = new Map();
    for (let c = 0; c < existingCategories.length; c = c + 1) {
      const cat = existingCategories[c];
      categoryMap.set(cat.category_name.trim().toLowerCase(), cat.category_id);
    }

    // 6. Execute in atomic transaction
    const performImport = async function performImport() {
      let createdCount = 0;
      let updatedCount = 0;
      const resultProducts = [];

      for (let i = 0; i < validatedRecords.length; i = i + 1) {
        const record = validatedRecords[i];

        // Resolve or create category
        let categoryId = null;
        if (record.category_name) {
          const lowerCatName = record.category_name.trim().toLowerCase();
          if (categoryMap.has(lowerCatName)) {
            categoryId = categoryMap.get(lowerCatName);
          } else {
            // Auto-create missing category
            const newCatId = dependencies.idGenerator.nextId();
            const newCategory = createCategoryEntity({
              category_id: newCatId,
              category_name: record.category_name.trim(),
              description: "Created via CSV import",
              is_active: true
            });
            await dependencies.categoryRepository.save(newCategory);
            categoryMap.set(lowerCatName, newCatId);
            categoryId = newCatId;
          }
        }

        if (record.existing_product && updateExisting) {
          // Update existing product
          const existing = record.existing_product;
          const prevStock = existing.current_stock;
          let newStock = prevStock;
          if (record.stock_provided) {
            newStock = record.current_stock;
          }

          const updatedProduct = createProductEntity({
            product_id: existing.product_id,
            category_id: categoryId !== null ? categoryId : existing.category_id,
            product_name: record.product_name,
            barcode: record.barcode !== null ? record.barcode : existing.barcode,
            description: record.description !== null ? record.description : existing.description,
            image_url: record.image_url !== null ? record.image_url : existing.image_url,
            base_unit: record.base_unit,
            current_stock: newStock,
            cost_price: record.cost_price,
            selling_price: record.selling_price,
            reorder_level: record.reorder_level,
            allow_custom_amount: record.allow_custom_amount,
            is_active: record.is_active,
            deleted_at: null,
            created_at: existing.created_at || now,
            updated_at: now
          });

          await dependencies.productRepository.save(updatedProduct);

          // If stock was provided and changed, record an inventory audit transaction
          if (record.stock_provided && newStock !== prevStock) {
            const stockDiff = Math.round((newStock - prevStock) * 10000) / 10000;
            const transactionType =
              stockDiff > 0
                ? INVENTORY_TRANSACTION_TYPES.STOCK_IN
                : INVENTORY_TRANSACTION_TYPES.ADJUSTMENT;

            const stockTx = createInventoryTransactionEntity({
              transaction_id: dependencies.idGenerator.nextId(),
              product_id: existing.product_id,
              supplier_id: null,
              option_id: null,
              transaction_type: transactionType,
              quantity: Math.abs(stockDiff),
              unit_cost: record.cost_price,
              reference_number: "CSV-UPDATE",
              remarks: "Stock update from CSV import (was " + prevStock + ", now " + newStock + ")",
              created_by: createdBy,
              created_at: now
            });
            await dependencies.inventoryTransactionRepository.save(stockTx);
          }

          updatedCount = updatedCount + 1;
          resultProducts.push(updatedProduct);
        } else {
          // Create new product
          const productId = dependencies.idGenerator.nextId();
          const newProduct = createProductEntity({
            product_id: productId,
            category_id: categoryId,
            product_name: record.product_name,
            barcode: record.barcode,
            description: record.description,
            image_url: record.image_url,
            base_unit: record.base_unit,
            current_stock: record.current_stock,
            cost_price: record.cost_price,
            selling_price: record.selling_price,
            reorder_level: record.reorder_level,
            allow_custom_amount: record.allow_custom_amount,
            is_active: record.is_active,
            deleted_at: null,
            created_at: now,
            updated_at: now
          });

          await dependencies.productRepository.save(newProduct);

          // Initial stock transaction
          if (record.current_stock > 0) {
            const initialTx = createInventoryTransactionEntity({
              transaction_id: dependencies.idGenerator.nextId(),
              product_id: productId,
              supplier_id: null,
              option_id: null,
              transaction_type: INVENTORY_TRANSACTION_TYPES.STOCK_IN,
              quantity: record.current_stock,
              unit_cost: record.cost_price,
              reference_number: "CSV-IMPORT",
              remarks: "Initial inventory stock from CSV import",
              created_by: createdBy,
              created_at: now
            });
            await dependencies.inventoryTransactionRepository.save(initialTx);
          }

          createdCount = createdCount + 1;
          resultProducts.push(newProduct);
        }
      }

      return {
        imported_count: createdCount + updatedCount,
        created_count: createdCount,
        updated_count: updatedCount,
        products: resultProducts
      };
    };

    if (dependencies.unitOfWork) {
      return dependencies.unitOfWork.run(performImport);
    }
    return performImport();
  };
}

export function createExportProductsToCsvUseCase(dependencies) {
  return async function execute() {
    const [products, categories] = await Promise.all([
      dependencies.productRepository.listAll(),
      dependencies.categoryRepository.listAll()
    ]);

    const categoryMap = new Map();
    for (let c = 0; c < categories.length; c = c + 1) {
      const cat = categories[c];
      categoryMap.set(cat.category_id, cat.category_name);
    }

    const rows = [];
    for (let i = 0; i < products.length; i = i + 1) {
      const p = products[i];
      let catName = "";
      if (p.category_id && categoryMap.has(p.category_id)) {
        catName = categoryMap.get(p.category_id);
      }
      rows.push({
        product_name: p.product_name,
        barcode: p.barcode || "",
        category: catName,
        description: p.description || "",
        image_url: p.image_url || "",
        base_unit: p.base_unit,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        current_stock: p.current_stock,
        reorder_level: p.reorder_level,
        allow_custom_amount: Boolean(p.allow_custom_amount),
        is_active: Boolean(p.is_active)
      });
    }

    return generateCsv(PRODUCT_CSV_COLUMNS, rows);
  };
}

export function createGenerateProductXlsxTemplateUseCase(dependencies) {
  return async function execute() {
    const [categories, units] = await Promise.all([
      dependencies.categoryRepository.listAll(),
      dependencies.unitRepository ? dependencies.unitRepository.listAll() : []
    ]);
    return generateProductXlsxTemplate({ categories: categories, units: units });
  };
}

export function createExportProductsToXlsxUseCase(dependencies) {
  return async function execute() {
    const [products, categories, units] = await Promise.all([
      dependencies.productRepository.listAll(),
      dependencies.categoryRepository.listAll(),
      dependencies.unitRepository ? dependencies.unitRepository.listAll() : []
    ]);
    return generateProductsXlsx({
      products: products,
      categories: categories,
      units: units
    });
  };
}
