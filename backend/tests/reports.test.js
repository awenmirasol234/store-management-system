import { afterEach, describe, expect, it } from "vitest";
import { createSqliteUnitOfWork, openSqliteDatabase } from "../src/db/sqlite.js";
import { createDefaultIdGenerator } from "../src/shared/ports.js";
import {
  createSqliteInventoryTransactionRepository,
  createSqliteProductRepository,
  createSqliteSellingOptionRepository
} from "../src/inventory/sqlite-repo.js";
import { createProductUseCase } from "../src/inventory/use-cases.js";
import { createSqliteSalesRepository } from "../src/sales/sqlite-repo.js";
import { PAYMENT_METHODS } from "../src/sales/domain.js";
import { createProcessSaleUseCase } from "../src/sales/use-cases.js";
import { createSqliteReportsRepository } from "../src/reports/sqlite-repo.js";

let activeDatabase = null;

afterEach(function cleanup() {
  if (activeDatabase) {
    activeDatabase.close();
    activeDatabase = null;
  }
});

describe("reports SQLite repository", function () {
  it("computes daily summary, COGS profit, inventory valuation, and top products", async function () {
    const database = openSqliteDatabase(":memory:");
    activeDatabase = database;

    const deps = {
      idGenerator: createDefaultIdGenerator(),
      clock: {
        nowIso() {
          return "2026-11-20T02:00:00.000Z";
        },
        todayManilaCompact() {
          return "20261120";
        },
        todayManilaIsoDate() {
          return "2026-11-20";
        }
      },
      unitOfWork: createSqliteUnitOfWork(database),
      productRepository: createSqliteProductRepository(database),
      sellingOptionRepository: createSqliteSellingOptionRepository(database),
      inventoryTransactionRepository: createSqliteInventoryTransactionRepository(database),
      salesRepository: createSqliteSalesRepository(database)
    };

    const createProduct = createProductUseCase(deps);
    const processSale = createProcessSaleUseCase(deps);
    const reportsRepo = createSqliteReportsRepository(database);

    const water = await createProduct({
      product_name: "Bottled Water",
      base_unit: "piece",
      current_stock: 10,
      cost_price: 10,
      selling_price: 15,
      reorder_level: 8
    });

    await processSale({
      items: [{ product_id: water.product_id, quantity: 4 }],
      payment_method: PAYMENT_METHODS.CASH,
      amount_paid: 100,
      created_by: "owner"
    });

    const summary = await reportsRepo.getSummary("2026-11-20", "2026-11-20");
    expect(summary.sale_count).toBe(1);
    expect(summary.gross_sales).toBe(60);
    expect(summary.cogs).toBe(40);
    expect(summary.net_profit).toBe(20);
    expect(summary.low_stock_count).toBe(1);
    expect(summary.inventory_valuation).toBe(60);

    const topProducts = await reportsRepo.getTopProducts("2026-11-20", "2026-11-20", 5);
    expect(topProducts.length).toBe(1);
    expect(topProducts[0].quantity_sold).toBe(4);
    expect(topProducts[0].revenue).toBe(60);
    expect(topProducts[0].profit).toBe(20);

    const daily = await reportsRepo.getDailyBreakdown("2026-11-20", "2026-11-20");
    expect(daily.length).toBe(1);
    expect(daily[0].date).toBe("2026-11-20");
    expect(daily[0].profit).toBe(20);
  });
});
