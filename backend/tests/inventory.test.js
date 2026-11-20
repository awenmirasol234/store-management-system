import { describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "../src/shared/errors.js";
import { INVENTORY_TRANSACTION_TYPES } from "../src/inventory/domain.js";
import {
  createAdjustStockUseCase,
  createDeleteProductUseCase,
  createGetLowStockProductsUseCase,
  createCreateProductUseCase,
  createSaveSellingOptionUseCase,
  createStockInUseCase
} from "../src/inventory/use-cases.js";

function createInMemoryInventoryDeps() {
  const products = new Map();
  const options = new Map();
  const transactions = [];
  let counter = 1;

  return {
    products: products,
    options: options,
    transactions: transactions,
    idGenerator: {
      nextId() {
        const idValue = "id-" + String(counter);
        counter = counter + 1;
        return idValue;
      }
    },
    clock: {
      nowIso() {
        return "2026-11-20T02:00:00.000Z";
      }
    },
    unitOfWork: {
      async run(work) {
        return work();
      }
    },
    productRepository: {
      async findById(productId) {
        return products.get(productId) || null;
      },
      async findByBarcode(barcode) {
        for (const product of products.values()) {
          if (product.barcode === barcode && product.deleted_at === null) {
            return product;
          }
        }
        return null;
      },
      async listAll() {
        return Array.from(products.values());
      },
      async save(product) {
        products.set(product.product_id, product);
      }
    },
    sellingOptionRepository: {
      async findById(optionId) {
        return options.get(optionId) || null;
      },
      async findByBarcode(barcode) {
        for (const option of options.values()) {
          if (option.barcode === barcode) {
            return option;
          }
        }
        return null;
      },
      async save(option) {
        options.set(option.option_id, option);
      }
    },
    inventoryTransactionRepository: {
      async save(transaction) {
        transactions.push(transaction);
      }
    }
  };
}

describe("inventory domain and use cases", function () {
  it("creates a product with image_url and enforces cross-table barcode uniqueness", async function () {
    const deps = createInMemoryInventoryDeps();
    const createProduct = createCreateProductUseCase(deps);
    const saveOption = createSaveSellingOptionUseCase(deps);

    const noodles = await createProduct({
      product_name: "Instant Noodles",
      barcode: "480001",
      image_url: "/uploads/products/noodles.png",
      base_unit: "piece",
      current_stock: 20,
      cost_price: 10,
      selling_price: 15,
      reorder_level: 10
    });

    expect(noodles.image_url).toBe("/uploads/products/noodles.png");
    expect(noodles.deleted_at).toBeNull();

    // Option cannot reuse the product's barcode
    await expect(
      saveOption({
        product_id: noodles.product_id,
        option_name: "1 Box (40 pcs)",
        barcode: "480001",
        quantity: 40,
        price: 500
      })
    ).rejects.toThrow(ConflictError);

    // Distinct option barcode succeeds
    const boxOption = await saveOption({
      product_id: noodles.product_id,
      option_name: "1 Box (40 pcs)",
      barcode: "480001-BOX",
      quantity: 40,
      price: 500
    });
    expect(boxOption.quantity).toBe(40);

    // Another product cannot reuse the option's barcode
    await expect(
      createProduct({
        product_name: "Other Product",
        barcode: "480001-BOX",
        base_unit: "piece",
        selling_price: 20
      })
    ).rejects.toThrow(ConflictError);
  });

  it("stocks in by bulk pack/box multiplier and updates cost_price to latest unit_cost", async function () {
    const deps = createInMemoryInventoryDeps();
    const createProduct = createCreateProductUseCase(deps);
    const saveOption = createSaveSellingOptionUseCase(deps);
    const stockIn = createStockInUseCase(deps);

    const noodles = await createProduct({
      product_name: "Instant Noodles",
      base_unit: "piece",
      current_stock: 10,
      cost_price: 10,
      selling_price: 15,
      reorder_level: 5
    });

    const boxOption = await saveOption({
      product_id: noodles.product_id,
      option_name: "1 Box",
      quantity: 40,
      price: 500
    });

    const result = await stockIn({
      product_id: noodles.product_id,
      option_id: boxOption.option_id,
      supplier_id: "sup-1",
      quantity: 2,
      unit_cost: 11.5,
      reference_number: "DR-001",
      created_by: "owner-1"
    });

    expect(result.product.current_stock).toBe(90);
    expect(result.product.cost_price).toBe(11.5);
    expect(result.transaction.transaction_type).toBe(INVENTORY_TRANSACTION_TYPES.STOCK_IN);
    expect(result.transaction.quantity).toBe(80);
    expect(result.transaction.unit_cost).toBe(11.5);
  });

  it("enforces sign rules, remarks, and non-negative stock on AdjustStock", async function () {
    const deps = createInMemoryInventoryDeps();
    const createProduct = createCreateProductUseCase(deps);
    const adjustStock = createAdjustStockUseCase(deps);

    const rice = await createProduct({
      product_name: "Rice",
      base_unit: "kg",
      current_stock: 5,
      cost_price: 48,
      selling_price: 60,
      reorder_level: 10
    });

    // DAMAGED must be negative
    await expect(
      adjustStock({
        product_id: rice.product_id,
        transaction_type: INVENTORY_TRANSACTION_TYPES.DAMAGED,
        quantity: 1,
        remarks: "Wet sack",
        created_by: "owner-1"
      })
    ).rejects.toThrow(ValidationError);

    // Remarks required
    await expect(
      adjustStock({
        product_id: rice.product_id,
        transaction_type: INVENTORY_TRANSACTION_TYPES.EXPIRED,
        quantity: -1,
        remarks: "",
        created_by: "owner-1"
      })
    ).rejects.toThrow(ValidationError);

    // Cannot go negative
    await expect(
      adjustStock({
        product_id: rice.product_id,
        transaction_type: INVENTORY_TRANSACTION_TYPES.DAMAGED,
        quantity: -6,
        remarks: "Spoiled",
        created_by: "owner-1"
      })
    ).rejects.toThrow(ValidationError);

    // Valid fractional deduction
    const adjusted = await adjustStock({
      product_id: rice.product_id,
      transaction_type: INVENTORY_TRANSACTION_TYPES.DAMAGED,
      quantity: -0.75,
      remarks: "Spilled sack",
      created_by: "owner-1"
    });
    expect(adjusted.product.current_stock).toBe(4.25);
  });

  it("soft-deletes products via deleted_at and excludes them from low-stock alerts", async function () {
    const deps = createInMemoryInventoryDeps();
    const createProduct = createCreateProductUseCase(deps);
    const deleteProduct = createDeleteProductUseCase(deps);
    const getLowStock = createGetLowStockProductsUseCase(deps);

    const water = await createProduct({
      product_name: "Bottled Water",
      base_unit: "piece",
      current_stock: 5,
      cost_price: 10,
      selling_price: 15,
      reorder_level: 10
    });

    const soda = await createProduct({
      product_name: "Soda",
      base_unit: "piece",
      current_stock: 2,
      cost_price: 12,
      selling_price: 18,
      reorder_level: 5
    });

    const deletedSoda = await deleteProduct({ product_id: soda.product_id });
    expect(deletedSoda.deleted_at).toBe("2026-11-20T02:00:00.000Z");
    expect(deletedSoda.is_active).toBe(false);

    const lowStock = await getLowStock();
    expect(lowStock.length).toBe(1);
    expect(lowStock[0].product_id).toBe(water.product_id);
  });
});
