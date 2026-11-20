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
    expect(stats.products).toBe(50);
    expect(stats.sales_transactions).toBe(12);

    activeDatabase = openSqliteDatabase(databasePath);
    const compactDate = createSystemClock().todayManilaCompact();
    const sequenceRow = activeDatabase
      .prepare("SELECT last_sequence FROM receipt_sequences WHERE business_date = ?")
      .get(compactDate);

    expect(sequenceRow.last_sequence).toBe(12);
  });
});
