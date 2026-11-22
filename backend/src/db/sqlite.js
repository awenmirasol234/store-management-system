import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS product_categories (
  category_id TEXT PRIMARY KEY,
  category_name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  product_id TEXT PRIMARY KEY,
  category_id TEXT,
  product_name TEXT NOT NULL,
  barcode TEXT,
  description TEXT,
  image_url TEXT,
  base_unit TEXT NOT NULL,
  current_stock_int INTEGER NOT NULL DEFAULT 0,
  cost_price_int INTEGER NOT NULL DEFAULT 0,
  selling_price_int INTEGER NOT NULL,
  reorder_level_int INTEGER NOT NULL DEFAULT 0,
  allow_custom_amount INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES product_categories(category_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_active_barcode
  ON products(barcode)
  WHERE barcode IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS product_selling_options (
  option_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  option_name TEXT NOT NULL,
  barcode TEXT,
  quantity_int INTEGER NOT NULL,
  price_int INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_selling_options_barcode
  ON product_selling_options(barcode)
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_selling_options_product_id
  ON product_selling_options(product_id);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  transaction_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  supplier_id TEXT,
  option_id TEXT,
  transaction_type TEXT NOT NULL,
  quantity_int INTEGER NOT NULL,
  unit_cost_int INTEGER NOT NULL DEFAULT 0,
  reference_number TEXT,
  remarks TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
  FOREIGN KEY (option_id) REFERENCES product_selling_options(option_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_product_id
  ON inventory_transactions(product_id);

CREATE TABLE IF NOT EXISTS receipt_sequences (
  business_date TEXT PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales_transactions (
  sale_id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  shift_id TEXT,
  customer_id TEXT,
  payment_method TEXT NOT NULL,
  subtotal_amount_int INTEGER NOT NULL,
  discount_amount_int INTEGER NOT NULL DEFAULT 0,
  total_amount_int INTEGER NOT NULL,
  cash_amount_int INTEGER NOT NULL DEFAULT 0,
  credit_amount_int INTEGER NOT NULL DEFAULT 0,
  amount_paid_int INTEGER NOT NULL DEFAULT 0,
  change_amount_int INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_created_at
  ON sales_transactions(created_at);

CREATE TABLE IF NOT EXISTS sales_items (
  sale_item_id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  option_id TEXT,
  option_name_snapshot TEXT NOT NULL,
  quantity_int INTEGER NOT NULL,
  base_quantity_int INTEGER NOT NULL,
  unit_price_int INTEGER NOT NULL,
  unit_cost_int INTEGER NOT NULL,
  discount_amount_int INTEGER NOT NULL DEFAULT 0,
  subtotal_int INTEGER NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales_transactions(sale_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (option_id) REFERENCES product_selling_options(option_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id
  ON sales_items(sale_id);

CREATE TABLE IF NOT EXISTS sales_returns (
  return_id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  shift_id TEXT,
  total_refund_amount_int INTEGER NOT NULL,
  credit_refund_amount_int INTEGER NOT NULL DEFAULT 0,
  cash_refund_amount_int INTEGER NOT NULL DEFAULT 0,
  remarks TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales_transactions(sale_id)
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  return_item_id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL,
  sale_item_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity_int INTEGER NOT NULL,
  base_quantity_int INTEGER NOT NULL,
  refund_amount_int INTEGER NOT NULL,
  FOREIGN KEY (return_id) REFERENCES sales_returns(return_id),
  FOREIGN KEY (sale_item_id) REFERENCES sales_items(sale_item_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  credit_limit_int INTEGER,
  current_balance_int INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_full_name
  ON customers(full_name);

CREATE TABLE IF NOT EXISTS credit_transactions (
  credit_tx_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  sale_id TEXT,
  shift_id TEXT,
  type TEXT NOT NULL,
  amount_int INTEGER NOT NULL,
  remarks TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (sale_id) REFERENCES sales_transactions(sale_id)
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_customer_id
  ON credit_transactions(customer_id);

CREATE INDEX IF NOT EXISTS idx_credit_tx_created_at
  ON credit_transactions(created_at);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users(username);

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token
  ON user_sessions(token);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions(user_id);
`;

export function openSqliteDatabase(databasePath) {
  let targetPath = databasePath;
  if (!targetPath) {
    targetPath = ":memory:";
  }
  if (targetPath !== ":memory:") {
    const folderPath = path.dirname(targetPath);
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const database = new DatabaseSync(targetPath);
  if (targetPath !== ":memory:") {
    database.exec("PRAGMA journal_mode = WAL");
  }
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(SCHEMA_SQL);
  return database;
}

export function createSqliteUnitOfWork(database) {
  let activeDepth = 0;

  return {
    async run(work) {
      const isOuterTransaction = activeDepth === 0;
      const savepointName = "sp_" + String(activeDepth + 1);
      activeDepth = activeDepth + 1;

      if (isOuterTransaction) {
        database.exec("BEGIN IMMEDIATE");
      } else {
        database.exec("SAVEPOINT " + savepointName);
      }

      try {
        const result = await work();
        if (isOuterTransaction) {
          database.exec("COMMIT");
        } else {
          database.exec("RELEASE SAVEPOINT " + savepointName);
        }
        return result;
      } catch (error) {
        if (isOuterTransaction) {
          database.exec("ROLLBACK");
        } else {
          database.exec("ROLLBACK TO SAVEPOINT " + savepointName);
          database.exec("RELEASE SAVEPOINT " + savepointName);
        }
        throw error;
      } finally {
        activeDepth = activeDepth - 1;
      }
    }
  };
}
