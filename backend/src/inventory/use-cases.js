import { fromMoneyInt, fromQuantityInt, toMoneyInt, toQuantityInt } from "../shared/decimal.js";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors.js";
import {
  INVENTORY_TRANSACTION_TYPES,
  calculateStockInBaseQuantity,
  createCategoryEntity,
  createInventoryTransactionEntity,
  createProductEntity,
  createSellingOptionEntity,
  createSupplierEntity,
  isProductLowStock,
  normalizeOptionalText
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

export function createProductUseCase(dependencies) {
  return async function execute(input) {
    const now = dependencies.clock.nowIso();
    const barcode = normalizeOptionalText(input.barcode, "barcode");
    await assertBarcodeAvailable(dependencies, barcode, null, null);

    const product = createProductEntity({
      product_id: dependencies.idGenerator.nextId(),
      category_id: input.category_id,
      product_name: input.product_name,
      barcode: barcode,
      description: input.description,
      image_url: input.image_url,
      base_unit: input.base_unit,
      current_stock: input.current_stock,
      cost_price: input.cost_price,
      selling_price: input.selling_price,
      reorder_level: input.reorder_level,
      allow_custom_amount: input.allow_custom_amount,
      is_active: input.is_active,
      deleted_at: null,
      created_at: now,
      updated_at: now
    });

    await dependencies.productRepository.save(product);
    return product;
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
    const existing = await dependencies.productRepository.findById(input.product_id);
    if (!existing || existing.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + input.product_id);
    }

    let nextBarcode = existing.barcode;
    if (input.barcode !== undefined) {
      nextBarcode = normalizeOptionalText(input.barcode, "barcode");
    }
    await assertBarcodeAvailable(dependencies, nextBarcode, existing.product_id, null);

    const updated = createProductEntity({
      product_id: existing.product_id,
      category_id: pickField(input.category_id, existing.category_id),
      product_name: pickField(input.product_name, existing.product_name),
      barcode: nextBarcode,
      description: pickField(input.description, existing.description),
      image_url: pickField(input.image_url, existing.image_url),
      base_unit: pickField(input.base_unit, existing.base_unit),
      current_stock: existing.current_stock,
      cost_price: pickField(input.cost_price, existing.cost_price),
      selling_price: pickField(input.selling_price, existing.selling_price),
      reorder_level: pickField(input.reorder_level, existing.reorder_level),
      allow_custom_amount: pickField(input.allow_custom_amount, existing.allow_custom_amount),
      is_active: pickField(input.is_active, existing.is_active),
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
    const existing = await dependencies.productRepository.findById(input.product_id);
    if (!existing || existing.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + input.product_id);
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
    const product = await dependencies.productRepository.findById(input.product_id);
    if (!product || product.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + input.product_id);
    }

    const now = dependencies.clock.nowIso();
    let optionId = input.option_id;
    let createdAt = now;
    if (optionId) {
      const existing = await dependencies.sellingOptionRepository.findById(optionId);
      if (!existing) {
        throw new NotFoundError("Selling option not found: " + optionId);
      }
      createdAt = existing.created_at;
    } else {
      optionId = dependencies.idGenerator.nextId();
    }

    const barcode = normalizeOptionalText(input.barcode, "barcode");
    await assertBarcodeAvailable(dependencies, barcode, null, optionId);

    const option = createSellingOptionEntity({
      option_id: optionId,
      product_id: product.product_id,
      option_name: input.option_name,
      barcode: barcode,
      quantity: input.quantity,
      price: input.price,
      is_active: input.is_active,
      created_at: createdAt,
      updated_at: now
    });

    await dependencies.sellingOptionRepository.save(option);
    return option;
  };
}

export function createStockInUseCase(dependencies) {
  return async function execute(input) {
    return dependencies.unitOfWork.run(async function runStockIn() {
      const product = await dependencies.productRepository.findById(input.product_id);
      if (!product || product.deleted_at !== null) {
        throw new NotFoundError("Product not found: " + input.product_id);
      }

      let optionQuantity = null;
      let optionId = null;
      if (input.option_id) {
        const option = await dependencies.sellingOptionRepository.findById(input.option_id);
        if (!option || option.product_id !== product.product_id) {
          throw new NotFoundError("Selling option not found for product: " + input.option_id);
        }
        optionQuantity = option.quantity;
        optionId = option.option_id;
      }

      const addedQuantity = calculateStockInBaseQuantity(input.quantity, optionQuantity);
      const addedQuantityInt = toQuantityInt(addedQuantity, "added_quantity");
      const currentStockInt = toQuantityInt(product.current_stock, "current_stock");
      const updatedStock = fromQuantityInt(currentStockInt + addedQuantityInt);

      let nextCostPrice = product.cost_price;
      let transactionUnitCost = product.cost_price;
      if (input.unit_cost !== undefined && input.unit_cost !== null) {
        const parsedCostInt = toMoneyInt(input.unit_cost, "unit_cost");
        if (parsedCostInt < 0) {
          throw new ValidationError("unit_cost cannot be negative");
        }
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
        supplier_id: input.supplier_id,
        option_id: optionId,
        transaction_type: INVENTORY_TRANSACTION_TYPES.STOCK_IN,
        quantity: addedQuantity,
        unit_cost: transactionUnitCost,
        reference_number: input.reference_number,
        remarks: input.remarks,
        created_by: input.created_by,
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
    return dependencies.unitOfWork.run(async function runAdjustStock() {
      const allowedTypes = new Set([
        INVENTORY_TRANSACTION_TYPES.ADJUSTMENT,
        INVENTORY_TRANSACTION_TYPES.DAMAGED,
        INVENTORY_TRANSACTION_TYPES.EXPIRED
      ]);
      if (!allowedTypes.has(input.transaction_type)) {
        throw new ValidationError(
          "AdjustStock only supports ADJUSTMENT, DAMAGED, or EXPIRED"
        );
      }

      const product = await dependencies.productRepository.findById(input.product_id);
      if (!product || product.deleted_at !== null) {
        throw new NotFoundError("Product not found: " + input.product_id);
      }

      const now = dependencies.clock.nowIso();
      const transaction = createInventoryTransactionEntity({
        transaction_id: dependencies.idGenerator.nextId(),
        product_id: product.product_id,
        supplier_id: null,
        option_id: null,
        transaction_type: input.transaction_type,
        quantity: input.quantity,
        unit_cost: product.cost_price,
        reference_number: input.reference_number,
        remarks: input.remarks,
        created_by: input.created_by,
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
    const barcode = input.barcode;
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
    const product = await dependencies.productRepository.findById(input.product_id);
    if (!product || product.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + input.product_id);
    }
    const options = await dependencies.sellingOptionRepository.listByProductId(product.product_id);
    return Object.assign({}, product, { selling_options: options });
  };
}

export function createListSellingOptionsUseCase(dependencies) {
  return async function execute(input) {
    return dependencies.sellingOptionRepository.listByProductId(input.product_id);
  };
}

export function createListInventoryTransactionsUseCase(dependencies) {
  return async function execute(input) {
    return dependencies.inventoryTransactionRepository.listByProductId(input.product_id);
  };
}

export function createListCategoriesUseCase(dependencies) {
  return async function execute() {
    return dependencies.categoryRepository.listAll();
  };
}

export function createCreateCategoryUseCase(dependencies) {
  return async function execute(input) {
    const category = createCategoryEntity(
      Object.assign({}, input, { category_id: dependencies.idGenerator.nextId() })
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
    const supplier = createSupplierEntity(
      Object.assign({}, input, { supplier_id: dependencies.idGenerator.nextId() })
    );
    await dependencies.supplierRepository.save(supplier);
    return supplier;
  };
}
