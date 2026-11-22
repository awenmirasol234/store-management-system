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
  it("leaves receipt numbering after the seeded sales", function () {
    activeTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "store-seed-test-"));
    const databasePath = path.join(activeTempDir, "store.db");

    const stats = seedDatabase(databasePath, false);
    expect(stats.units).toBe(28);
    expect(stats.products).toBe(50);
    expect(stats.sales_transactions).toBe(12);

    activeDatabase = openSqliteDatabase(databasePath);
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

  it("is idempotent and preserves foreign keys and inventory counts when re-seeded over existing sales", function () {
    activeTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "store-seed-test-"));
    const databasePath = path.join(activeTempDir, "store.db");

    const firstStats = seedDatabase(databasePath, false);
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
    const secondStats = seedDatabase(databasePath, false);
    expect(secondStats.products).toBe(50);
    expect(secondStats.selling_options).toBe(16);
    expect(secondStats.inventory_transactions).toBe(48);

    activeDatabase = openSqliteDatabase(databasePath);
    const preservedOption = activeDatabase
      .prepare("SELECT option_id FROM product_selling_options WHERE option_id = ?")
      .get(sampleOption.option_id);
    expect(preservedOption.option_id).toBe(sampleOption.option_id);
  });
});
