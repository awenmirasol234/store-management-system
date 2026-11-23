import { afterEach, describe, expect, it } from "vitest";
import { createSqliteUnitOfWork, openSqliteDatabase } from "../src/db/sqlite.js";
import { createDefaultIdGenerator } from "../src/shared/ports.js";
import {
  createSqliteInventoryTransactionRepository,
  createSqliteProductRepository,
  createSqliteSellingOptionRepository
} from "../src/inventory/sqlite-repo.js";
import { createCreateProductUseCase } from "../src/inventory/use-cases.js";
import { createSqliteSalesRepository } from "../src/sales/sqlite-repo.js";
import { PAYMENT_METHODS } from "../src/sales/domain.js";
import { createProcessSaleUseCase } from "../src/sales/use-cases.js";
import { createSqliteReportsRepository } from "../src/reports/sqlite-repo.js";
import {
  createGetCategorySalesUseCase,
  createGetDailyBreakdownUseCase,
  createGetReportsSummaryUseCase,
  createGetStockMovementReportUseCase,
  createGetTopProductsUseCase,
  createGetTransactionsReportUseCase
} from "../src/reports/use-cases.js";
import {
  buildCategorySales,
  buildDailyBreakdown,
  buildTopProducts,
  calculateInventoryValuationInt,
  calculateNetProfitInt,
  calculateTotalCogsInt,
  calculateTotalItemsSoldInt,
  countLowStockProducts,
  countOutOfStockProducts,
  resolveReportDate
} from "../src/reports/domain.js";
import { ValidationError } from "../src/shared/errors.js";

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

    const createProduct = createCreateProductUseCase(deps);
    const processSale = createProcessSaleUseCase(deps);
    const reportsRepo = createSqliteReportsRepository(database);
    const reportDeps = {
      reportsRepository: reportsRepo,
      clock: deps.clock
    };
    const getSummary = createGetReportsSummaryUseCase(reportDeps);
    const getTopProducts = createGetTopProductsUseCase(reportDeps);
    const getDailyBreakdown = createGetDailyBreakdownUseCase(reportDeps);
    const getCategorySales = createGetCategorySalesUseCase(reportDeps);
    const getStockMovements = createGetStockMovementReportUseCase(reportDeps);
    const getTransactions = createGetTransactionsReportUseCase(reportDeps);

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

    const summary = await getSummary({ from: "2026-11-20", to: "2026-11-20" });
    expect(summary.sale_count).toBe(1);
    expect(summary.total_items_sold).toBe(4);
    expect(summary.gross_sales).toBe(60);
    expect(summary.net_sales).toBe(60);
    expect(summary.cogs).toBe(40);
    expect(summary.net_profit).toBe(20);
    expect(summary.low_stock_count).toBe(1);
    expect(summary.inventory_valuation).toBe(60);

    const topProducts = await getTopProducts({ from: "2026-11-20", to: "2026-11-20", limit: 5 });
    expect(topProducts.length).toBe(1);
    expect(topProducts[0].quantity_sold).toBe(4);
    expect(topProducts[0].revenue).toBe(60);
    expect(topProducts[0].profit).toBe(20);
    expect(topProducts[0].image_url).toBe(null);

    const daily = await getDailyBreakdown({ from: "2026-11-20", to: "2026-11-20" });
    expect(daily.length).toBe(1);
    expect(daily[0].date).toBe("2026-11-20");
    expect(daily[0].profit).toBe(20);

    const categories = await getCategorySales({ from: "2026-11-20", to: "2026-11-20" });
    expect(categories.length).toBe(1);
    expect(categories[0].revenue).toBe(60);
    expect(categories[0].profit).toBe(20);

    const movements = await getStockMovements({ from: "2026-11-20", to: "2026-11-20" });
    expect(movements.length).toBeGreaterThanOrEqual(1);

    const txs = await getTransactions({ from: "2026-11-20", to: "2026-11-20" });
    expect(txs.length).toBe(1);
    expect(txs[0].total_amount).toBe(60);
    expect(txs[0].payment_method).toBe(PAYMENT_METHODS.CASH);
  });

  it("validates report date format, calendar dates, and net profit calculations", function () {
    expect(resolveReportDate("2026-11-20", "2026-11-01", "from")).toBe("2026-11-20");
    expect(resolveReportDate("", "2026-11-01", "from")).toBe("2026-11-01");
    expect(resolveReportDate(null, "2026-11-01", "from")).toBe("2026-11-01");

    expect(function () {
      resolveReportDate("2026/11/20", "2026-11-01", "from");
    }).toThrow(ValidationError);

    expect(function () {
      resolveReportDate("2026-02-30", "2026-11-01", "from");
    }).toThrow(ValidationError);

    expect(calculateNetProfitInt(10000, 6000, 1000)).toBe(3000);
  });

  it("computes report helpers from scaled integer rows", function () {
    const itemRows = [
      {
        product_id: "prod-1",
        product_name: "Rice",
        image_url: "/uploads/rice.png",
        base_unit: "kg",
        manila_date: "2026-11-20",
        base_quantity_int: 25000,
        unit_cost_int: 1000,
        subtotal_int: 5000
      },
      {
        product_id: "prod-1",
        product_name: "Rice",
        base_unit: "kg",
        manila_date: "2026-11-21",
        base_quantity_int: 10000,
        unit_cost_int: 1000,
        subtotal_int: 2000
      }
    ];

    expect(calculateTotalCogsInt(itemRows)).toBe(3500);

    const topProducts = buildTopProducts(itemRows, 5);
    expect(topProducts.length).toBe(1);
    expect(topProducts[0].quantity_sold).toBe(3.5);
    expect(topProducts[0].revenue).toBe(70);
    expect(topProducts[0].profit).toBe(35);
    expect(topProducts[0].image_url).toBe("/uploads/rice.png");
    expect(buildTopProducts(itemRows, 1).length).toBe(1);

    const dailyRows = [
      { manila_date: "2026-11-20", sale_count: 2, gross_sales_int: 5000 },
      { manila_date: "2026-11-21", sale_count: 1, gross_sales_int: 2000 }
    ];
    expect(buildDailyBreakdown(dailyRows, itemRows)).toEqual([
      { date: "2026-11-20", sale_count: 2, gross_sales: 50, profit: 25 },
      { date: "2026-11-21", sale_count: 1, gross_sales: 20, profit: 10 }
    ]);

    expect(
      countOutOfStockProducts([
        { current_stock_int: 0 },
        { current_stock_int: -1000 },
        { current_stock_int: 5000 }
      ])
    ).toBe(2);

    expect(calculateTotalItemsSoldInt([
      { quantity_int: 20000 },
      { quantity_int: 15000 }
    ])).toBe(35000);

    const categoryItemRows = [
      {
        category_id: "cat-1",
        category_name: "Beverages",
        quantity_int: 20000,
        base_quantity_int: 20000,
        subtotal_int: 3000,
        unit_cost_int: 1000
      },
      {
        category_id: "cat-1",
        category_name: "Beverages",
        quantity_int: 10000,
        base_quantity_int: 10000,
        subtotal_int: 1500,
        unit_cost_int: 1000
      }
    ];
    const catSales = buildCategorySales(categoryItemRows);
    expect(catSales.length).toBe(1);
    expect(catSales[0].quantity_sold).toBe(3);
    expect(catSales[0].revenue).toBe(45);
    expect(catSales[0].profit).toBe(15);
    expect(
      calculateInventoryValuationInt([
        { cost_price_int: 1000, current_stock_int: 25000 },
        { cost_price_int: 500, current_stock_int: 10000 }
      ])
    ).toBe(3000);
  });
});
