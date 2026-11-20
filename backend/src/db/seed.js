import path from "node:path";
import { openSqliteDatabase } from "./sqlite.js";
import {
  CATEGORIES,
  PRODUCTS,
  SAMPLE_SALES,
  SUPPLIERS,
  getMockProductImageUrl
} from "./seed-data.js";
import { toMoneyInt, toQuantityInt } from "../shared/decimal.js";
import { createDefaultIdGenerator, createSystemClock } from "../shared/ports.js";
import { formatReceiptNumber } from "../sales/domain.js";

export function seedDatabase(targetDbPath, clean = false) {
  let resolvedPath = targetDbPath;
  if (!resolvedPath) {
    resolvedPath = path.resolve(import.meta.dirname, "../../data/store.db");
  }

  const database = openSqliteDatabase(resolvedPath);
  const idGen = createDefaultIdGenerator();
  const clock = createSystemClock();
  const nowIso = clock.nowIso();

  if (clean) {
    database.exec("DELETE FROM sales_return_items");
    database.exec("DELETE FROM sales_returns");
    database.exec("DELETE FROM sales_items");
    database.exec("DELETE FROM sales_transactions");
    database.exec("DELETE FROM receipt_sequences");
    database.exec("DELETE FROM inventory_transactions");
    database.exec("DELETE FROM product_selling_options");
    database.exec("DELETE FROM products");
    database.exec("DELETE FROM suppliers");
    database.exec("DELETE FROM product_categories");
  }

  // 1. Seed Categories
  const insertCatStmt = database.prepare(`
    INSERT OR IGNORE INTO product_categories (category_id, category_name, description, is_active)
    VALUES (?, ?, ?, 1)
  `);
  for (let categoryIndex = 0; categoryIndex < CATEGORIES.length; categoryIndex = categoryIndex + 1) {
    const categoryItem = CATEGORIES[categoryIndex];
    insertCatStmt.run(categoryItem.category_id, categoryItem.category_name, categoryItem.description);
  }

  // 2. Seed Suppliers
  const insertSupStmt = database.prepare(`
    INSERT OR IGNORE INTO suppliers (supplier_id, supplier_name, contact_person, phone, address, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  for (let supplierIndex = 0; supplierIndex < SUPPLIERS.length; supplierIndex = supplierIndex + 1) {
    const supplierItem = SUPPLIERS[supplierIndex];
    insertSupStmt.run(
      supplierItem.supplier_id,
      supplierItem.supplier_name,
      supplierItem.contact_person,
      supplierItem.phone,
      supplierItem.address
    );
  }

  // 3. Seed Products and Selling Options
  const insertProdStmt = database.prepare(`
    INSERT OR REPLACE INTO products (
      product_id, category_id, product_name, barcode, description,
      image_url, base_unit, current_stock_int, cost_price_int,
      selling_price_int, reorder_level_int, allow_custom_amount,
      is_active, deleted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NULL, ?, ?)
  `);

  const insertOptionStmt = database.prepare(`
    INSERT OR REPLACE INTO product_selling_options (
      option_id, product_id, option_name, barcode, quantity_int,
      price_int, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertTxStmt = database.prepare(`
    INSERT INTO inventory_transactions (
      transaction_id, product_id, supplier_id, option_id,
      transaction_type, quantity_int, unit_cost_int, reference_number,
      remarks, created_by, created_at
    ) VALUES (?, ?, ?, NULL, 'STOCK_IN', ?, ?, ?, 'Initial inventory stock', 'system', ?)
  `);

  for (let productIndex = 0; productIndex < PRODUCTS.length; productIndex = productIndex + 1) {
    const item = PRODUCTS[productIndex];
    const stockInt = toQuantityInt(item.stock, "stock");
    const costInt = toMoneyInt(item.cost, "cost");
    const priceInt = toMoneyInt(item.price, "price");
    const reorderInt = toQuantityInt(item.reorder, "reorder");
    const mockImageUrl = getMockProductImageUrl(item);

    insertProdStmt.run(
      item.id,
      item.category_id,
      item.name,
      item.barcode,
      null,
      item.image_url || mockImageUrl,
      item.unit,
      stockInt,
      costInt,
      priceInt,
      reorderInt,
      nowIso,
      nowIso
    );

    // Initial stock-in movement
    if (stockInt > 0) {
      const txId = idGen.nextId();
      insertTxStmt.run(
        txId,
        item.id,
        item.supplier_id,
        stockInt,
        costInt,
        "INIT-STOCK",
        nowIso
      );
    }

    // Selling options
    if (item.options && item.options.length > 0) {
      for (let optionIndex = 0; optionIndex < item.options.length; optionIndex = optionIndex + 1) {
        const optionItem = item.options[optionIndex];
        const optionId = idGen.nextId();
        const optionQtyInt = toQuantityInt(optionItem.quantity, "option.quantity");
        const optionPriceInt = toMoneyInt(optionItem.price, "option.price");

        insertOptionStmt.run(
          optionId,
          item.id,
          optionItem.name,
          optionItem.barcode,
          optionQtyInt,
          optionPriceInt,
          nowIso,
          nowIso
        );
      }
    }
  }

  // 4. Seed Sample Completed Sales Transactions (12 sales across today and yesterday)
  const insertSaleStmt = database.prepare(`
    INSERT OR IGNORE INTO sales_transactions (
      sale_id, receipt_number, shift_id, customer_id, payment_method,
      subtotal_amount_int, discount_amount_int, total_amount_int,
      cash_amount_int, credit_amount_int, amount_paid_int, change_amount_int,
      status, created_by, created_at
    ) VALUES (?, ?, NULL, NULL, 'CASH', ?, 0, ?, ?, 0, ?, ?, 'COMPLETED', 'system', ?)
  `);

  const insertSaleItemStmt = database.prepare(`
    INSERT OR IGNORE INTO sales_items (
      sale_item_id, sale_id, product_id, option_id, option_name_snapshot,
      quantity_int, base_quantity_int, unit_price_int, unit_cost_int,
      discount_amount_int, subtotal_int
    ) VALUES (?, ?, ?, NULL, 'Base Unit', ?, ?, ?, ?, 0, ?)
  `);

  const compactDate = clock.todayManilaCompact();

  const findSaleByReceiptStmt = database.prepare(
    "SELECT sale_id FROM sales_transactions WHERE receipt_number = ?"
  );

  for (let saleIndex = 0; saleIndex < SAMPLE_SALES.length; saleIndex = saleIndex + 1) {
    const saleData = SAMPLE_SALES[saleIndex];
    const receiptNum = formatReceiptNumber(compactDate, saleIndex + 1);
    const existingSale = findSaleByReceiptStmt.get(receiptNum);
    if (existingSale) {
      continue;
    }

    const saleId = idGen.nextId();

    let subtotalInt = 0;
    for (let itemIndex = 0; itemIndex < saleData.items.length; itemIndex = itemIndex + 1) {
      const itm = saleData.items[itemIndex];
      subtotalInt = subtotalInt + (itm.price * itm.qty);
    }

    const changeInt = saleData.cashPaid - subtotalInt;
    const saleTimestamp = new Date(Date.now() - (saleData.hoursAgo * 60 * 60 * 1000)).toISOString();

    insertSaleStmt.run(
      saleId,
      receiptNum,
      subtotalInt,
      subtotalInt,
      saleData.cashPaid,
      saleData.cashPaid,
      changeInt,
      saleTimestamp
    );

    for (let itemIndex = 0; itemIndex < saleData.items.length; itemIndex = itemIndex + 1) {
      const itm = saleData.items[itemIndex];
      const saleItemId = idGen.nextId();
      const lineSubtotal = itm.price * itm.qty;
      const qtyInt = toQuantityInt(itm.qty, "qty");

      insertSaleItemStmt.run(
        saleItemId,
        saleId,
        itm.id,
        qtyInt,
        qtyInt,
        itm.price,
        itm.cost,
        lineSubtotal
      );
    }
  }

  // Keep receipt numbering ahead of the seeded sales.
  const receiptSequenceStmt = database.prepare(`
    INSERT INTO receipt_sequences (business_date, last_sequence)
    VALUES (?, ?)
    ON CONFLICT(business_date) DO UPDATE SET
      last_sequence = MAX(last_sequence, excluded.last_sequence)
  `);
  receiptSequenceStmt.run(compactDate, SAMPLE_SALES.length);

  const prodCountRow = database.prepare("SELECT count(*) as count FROM products").get();
  const catCountRow = database.prepare("SELECT count(*) as count FROM product_categories").get();
  const supCountRow = database.prepare("SELECT count(*) as count FROM suppliers").get();
  const optCountRow = database.prepare("SELECT count(*) as count FROM product_selling_options").get();
  const txCountRow = database.prepare("SELECT count(*) as count FROM inventory_transactions").get();
  const salesCountRow = database.prepare("SELECT count(*) as count FROM sales_transactions").get();

  const stats = {
    categories: catCountRow.count,
    suppliers: supCountRow.count,
    products: prodCountRow.count,
    selling_options: optCountRow.count,
    inventory_transactions: txCountRow.count,
    sales_transactions: salesCountRow.count
  };
  database.close();
  return stats;
}

// Direct CLI invocation
const isMain = process.argv[1] && process.argv[1].endsWith("seed.js");
if (isMain) {
  const shouldClean = process.argv.includes("--clean");
  console.log("Seeding store database (clean: " + shouldClean + ")...");
  const stats = seedDatabase(null, shouldClean);
  console.log("Database seeded successfully!");
  console.log("  Categories:             " + stats.categories);
  console.log("  Suppliers:              " + stats.suppliers);
  console.log("  Products:               " + stats.products);
  console.log("  Selling Options:        " + stats.selling_options);
  console.log("  Inventory Transactions: " + stats.inventory_transactions);
  console.log("  Sales Transactions:     " + stats.sales_transactions);
}
