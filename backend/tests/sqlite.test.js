import { afterEach, describe, expect, it } from "vitest";
import { createSqliteUnitOfWork, openSqliteDatabase } from "../src/db/sqlite.js";
import { createDefaultIdGenerator } from "../src/shared/ports.js";
import {
  createSqliteInventoryTransactionRepository,
  createSqliteProductRepository,
  createSqliteSellingOptionRepository
} from "../src/inventory/sqlite-repo.js";
import {
  createCreateProductUseCase,
  createSaveSellingOptionUseCase,
  createStockInUseCase
} from "../src/inventory/use-cases.js";
import { createSqliteSalesRepository } from "../src/sales/sqlite-repo.js";
import { PAYMENT_METHODS } from "../src/sales/domain.js";
import { createProcessReturnUseCase, createProcessSaleUseCase } from "../src/sales/use-cases.js";

let activeDatabase = null;

afterEach(function cleanup() {
  if (activeDatabase) {
    activeDatabase.close();
    activeDatabase = null;
  }
});

function createSqliteDeps() {
  const database = openSqliteDatabase(":memory:");
  activeDatabase = database;

  return {
    database: database,
    idGenerator: createDefaultIdGenerator(),
    clock: {
      nowIso() {
        return "2026-11-20T02:00:00.000Z";
      },
      todayManilaCompact() {
        return "20261120";
      }
    },
    unitOfWork: createSqliteUnitOfWork(database),
    productRepository: createSqliteProductRepository(database),
    sellingOptionRepository: createSqliteSellingOptionRepository(database),
    inventoryTransactionRepository: createSqliteInventoryTransactionRepository(database),
    salesRepository: createSqliteSalesRepository(database)
  };
}

describe("SQLite repositories and UnitOfWork", function () {
  it("persists scaled integers accurately across StockIn, ProcessSale, and ProcessReturn", async function () {
    const deps = createSqliteDeps();
    const createProduct = createCreateProductUseCase(deps);
    const saveOption = createSaveSellingOptionUseCase(deps);
    const stockIn = createStockInUseCase(deps);
    const processSale = createProcessSaleUseCase(deps);
    const processReturn = createProcessReturnUseCase(deps);

    const rice = await createProduct({
      product_name: "Jasmine Rice",
      barcode: "RICE-01",
      base_unit: "kg",
      current_stock: 10,
      cost_price: 48.25,
      selling_price: 60.5,
      reorder_level: 5,
      allow_custom_amount: true
    });

    const quarterKg = await saveOption({
      product_id: rice.product_id,
      option_name: "250g",
      barcode: "RICE-250G",
      quantity: 0.25,
      price: 15.5
    });

    await stockIn({
      product_id: rice.product_id,
      quantity: 2.5,
      unit_cost: 49.0,
      created_by: "owner-1"
    });

    const afterStockIn = await deps.productRepository.findById(rice.product_id);
    expect(afterStockIn.current_stock).toBe(12.5);
    expect(afterStockIn.cost_price).toBe(49);

    const saleResult = await processSale({
      items: [
        { product_id: rice.product_id, option_id: quarterKg.option_id, quantity: 3 }
      ],
      payment_method: PAYMENT_METHODS.CASH,
      amount_paid: 50,
      created_by: "cashier-1"
    });

    expect(saleResult.sale.receipt_number).toBe("20261120-0001");
    expect(saleResult.sale.total_amount).toBe(46.5);
    expect(saleResult.sale.change_amount).toBe(3.5);

    const afterSale = await deps.productRepository.findById(rice.product_id);
    expect(afterSale.current_stock).toBe(11.75);

    const loadedSale = await deps.salesRepository.findSaleById(saleResult.sale.sale_id);
    expect(loadedSale.items.length).toBe(1);
    expect(loadedSale.items[0].unit_cost).toBe(49);

    await processReturn({
      sale_id: saleResult.sale.sale_id,
      items: [{ sale_item_id: saleResult.items[0].sale_item_id, quantity: 1 }],
      remarks: "Returned pack",
      created_by: "cashier-1"
    });

    const afterReturn = await deps.productRepository.findById(rice.product_id);
    expect(afterReturn.current_stock).toBe(12);
  });

  it("rolls back all writes atomically when UnitOfWork throws mid-transaction", async function () {
    const deps = createSqliteDeps();
    const createProduct = createCreateProductUseCase(deps);

    const water = await createProduct({
      product_name: "Water",
      base_unit: "piece",
      current_stock: 10,
      cost_price: 10,
      selling_price: 15
    });

    await expect(
      deps.unitOfWork.run(async function failingWork() {
        await deps.productRepository.save(
          Object.assign({}, water, {
            current_stock: 3
          })
        );
        throw new Error("Simulated crash before commit");
      })
    ).rejects.toThrow("Simulated crash before commit");

    const unchanged = await deps.productRepository.findById(water.product_id);
    expect(unchanged.current_stock).toBe(10);
  });
});
