import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import { seedDatabase } from "../src/db/seed.js";
import { createSystemClock } from "../src/shared/ports.js";

let activeDatabase = null;
let activeTempDir = null;

afterEach(function cleanup() {
  if (activeDatabase) {
    activeDatabase.close();
    activeDatabase = null;
  }
  if (activeTempDir) {
    fs.rmSync(activeTempDir, { recursive: true, force: true });
    activeTempDir = null;
  }
});

describe("seedDatabase", function () {
  it("leaves receipt numbering after the seeded sales", async function () {
    activeTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "store-seed-test-"));
    const databasePath = path.join(activeTempDir, "store.db");

    const stats = await seedDatabase(databasePath, false);
    expect(stats.units).toBe(28);
    expect(stats.categories).toBe(20);
    expect(stats.products).toBe(50);
    expect(stats.sales_transactions).toBe(12);

    activeDatabase = openSqliteDatabase(databasePath);
    const catRows = activeDatabase
      .prepare("SELECT category_name FROM product_categories ORDER BY category_name ASC")
      .all();
    expect(catRows.length).toBe(20);
    const catNames = catRows.map(function (row) {
      return row.category_name;
    });
    expect(catNames.includes("Beverages")).toBe(true);
    expect(catNames.includes("Biscuits & Crackers")).toBe(true);
    expect(catNames.includes("Instant Food")).toBe(true);
    expect(catNames.includes("Dairy & Breakfast")).toBe(false);
    expect(catNames.includes("Party & Gift Supplies")).toBe(false);
    expect(catNames.includes("Agricultural Supplies")).toBe(false);
    expect(catNames.includes("Mobile & Electronics Accessories")).toBe(false);
    expect(catNames.includes("Pet Supplies")).toBe(false);
    expect(catNames.includes("Load & E-Wallet Services")).toBe(false);
    expect(catNames.includes("Other")).toBe(false);
    const unitRows = activeDatabase.prepare("SELECT unit_name FROM product_units ORDER BY rowid ASC").all();
    expect(unitRows.length).toBe(28);
    expect(unitRows[0].unit_name).toBe("Piece (pc)");
    expect(unitRows[27].unit_name).toBe("Sheet");
    const compactDate = createSystemClock().todayManilaCompact();
    const sequenceRow = activeDatabase
      .prepare("SELECT last_sequence FROM receipt_sequences WHERE business_date = ?")
      .get(compactDate);

    expect(sequenceRow.last_sequence).toBe(12);
  });

  it("is idempotent and preserves foreign keys and inventory counts when re-seeded over existing sales", async function () {
    activeTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "store-seed-test-"));
    const databasePath = path.join(activeTempDir, "store.db");

    const firstStats = await seedDatabase(databasePath, false);
    expect(firstStats.products).toBe(50);
    expect(firstStats.selling_options).toBe(16);
    expect(firstStats.inventory_transactions).toBe(48);

    // Record a sale referencing an existing selling option to test foreign key stability
    activeDatabase = openSqliteDatabase(databasePath);
    const sampleOption = activeDatabase
      .prepare("SELECT option_id, product_id FROM product_selling_options LIMIT 1")
      .get();

    activeDatabase
      .prepare(`
        INSERT INTO sales_transactions (
          sale_id, receipt_number, payment_method, subtotal_amount_int,
          discount_amount_int, total_amount_int, cash_amount_int, credit_amount_int,
          amount_paid_int, change_amount_int, status, created_by, created_at
        ) VALUES ('test-sale-1', 'TEST-RCP-01', 'CASH', 5000, 0, 5000, 5000, 0, 5000, 0, 'COMPLETED', 'cashier', '2026-11-20T00:00:00.000Z')
      `)
      .run();

    activeDatabase
      .prepare(`
        INSERT INTO sales_items (
          sale_item_id, sale_id, product_id, option_id, option_name_snapshot,
          quantity_int, base_quantity_int, unit_price_int, unit_cost_int,
          discount_amount_int, subtotal_int
        ) VALUES ('test-item-1', 'test-sale-1', ?, ?, 'Pack', 10000, 30000, 5000, 3000, 0, 5000)
      `)
      .run(sampleOption.product_id, sampleOption.option_id);

    activeDatabase.close();
    activeDatabase = null;

    // Re-seed should not crash with foreign key constraint failure or duplicate transactions
    const secondStats = await seedDatabase(databasePath, false);
    expect(secondStats.products).toBe(50);
    expect(secondStats.selling_options).toBe(16);
    expect(secondStats.inventory_transactions).toBe(48);

    activeDatabase = openSqliteDatabase(databasePath);
    const preservedOption = activeDatabase
      .prepare("SELECT option_id FROM product_selling_options WHERE option_id = ?")
      .get(sampleOption.option_id);
    expect(preservedOption.option_id).toBe(sampleOption.option_id);
  });

  it("cleans rows that reference users, customers, and sales without foreign key failures", async function () {
    activeTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "store-seed-test-"));
    const databasePath = path.join(activeTempDir, "store.db");

    await seedDatabase(databasePath, false);

    activeDatabase = openSqliteDatabase(databasePath);
    const sampleSale = activeDatabase
      .prepare("SELECT sale_id FROM sales_transactions LIMIT 1")
      .get();
    activeDatabase
      .prepare(`
        INSERT INTO users (user_id, username, full_name, role, pin_hash, pin_salt, is_active, created_at, updated_at)
        VALUES ('test-user-1', 'test-user', 'Test User', 'CASHIER', 'hash', 'salt', 1, '2026-11-20T00:00:00.000Z', '2026-11-20T00:00:00.000Z')
      `)
      .run();
    activeDatabase
      .prepare(`
        INSERT INTO cashier_shifts (shift_id, user_id, opened_at, opening_cash_int, status)
        VALUES ('test-shift-1', 'test-user-1', '2026-11-20T00:00:00.000Z', 0, 'OPEN')
      `)
      .run();
    activeDatabase
      .prepare(`
        INSERT INTO cash_movements (movement_id, shift_id, type, amount_int, remarks, created_by, created_at)
        VALUES ('test-movement-1', 'test-shift-1', 'CASH_IN', 100, 'Test', 'test-user-1', '2026-11-20T00:00:00.000Z')
      `)
      .run();
    activeDatabase
      .prepare(`
        INSERT INTO customers (customer_id, full_name, current_balance_int, is_active, created_at, updated_at)
        VALUES ('test-customer-1', 'Test Customer', 100, 1, '2026-11-20T00:00:00.000Z', '2026-11-20T00:00:00.000Z')
      `)
      .run();
    activeDatabase
      .prepare(`
        INSERT INTO credit_transactions (credit_tx_id, customer_id, sale_id, type, amount_int, created_by, created_at)
        VALUES ('test-credit-1', 'test-customer-1', ?, 'CREDIT', 100, 'test-user-1', '2026-11-20T00:00:00.000Z')
      `)
      .run(sampleSale.sale_id);
    activeDatabase.close();
    activeDatabase = null;

    const stats = await seedDatabase(databasePath, true);
    expect(stats.products).toBe(50);
    expect(stats.sales_transactions).toBe(12);

    activeDatabase = openSqliteDatabase(databasePath);
    const cleanedTables = [
      "sales_return_items",
      "sales_returns",
      "credit_transactions",
      "cash_movements",
      "cashier_shifts",
      "customers",
      "user_sessions",
      "users"
    ];
    for (let tableIndex = 0; tableIndex < cleanedTables.length; tableIndex = tableIndex + 1) {
      const tableName = cleanedTables[tableIndex];
      const countRow = activeDatabase.prepare("SELECT count(*) AS count FROM " + tableName).get();
      expect(countRow.count).toBe(0);
    }
  });
});
