import { fromMoneyInt, toMoneyInt } from "../shared/decimal.js";

function toSqliteBool(booleanValue) {
  if (booleanValue) {
    return 1;
  }
  return 0;
}

function fromSqliteBool(intValue) {
  return intValue === 1;
}

function mapCustomerRow(row) {
  if (!row) {
    return null;
  }
  let creditLimit = null;
  if (row.credit_limit_int !== null && row.credit_limit_int !== undefined) {
    creditLimit = fromMoneyInt(row.credit_limit_int);
  }
  return {
    customer_id: row.customer_id,
    full_name: row.full_name,
    phone: row.phone,
    address: row.address,
    credit_limit: creditLimit,
    current_balance: fromMoneyInt(row.current_balance_int),
    is_active: fromSqliteBool(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapCreditTransactionRow(row) {
  if (!row) {
    return null;
  }
  return {
    credit_tx_id: row.credit_tx_id,
    customer_id: row.customer_id,
    sale_id: row.sale_id,
    shift_id: row.shift_id,
    type: row.type,
    amount: fromMoneyInt(row.amount_int),
    remarks: row.remarks,
    created_by: row.created_by,
    created_at: row.created_at
  };
}

export function createSqliteCustomerRepository(database) {
  const insertOrUpdateStmt = database.prepare(`
    INSERT INTO customers (
      customer_id,
      full_name,
      phone,
      address,
      credit_limit_int,
      current_balance_int,
      is_active,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(customer_id) DO UPDATE SET
      full_name = excluded.full_name,
      phone = excluded.phone,
      address = excluded.address,
      credit_limit_int = excluded.credit_limit_int,
      current_balance_int = excluded.current_balance_int,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at
  `);

  const findByIdStmt = database.prepare(`
    SELECT * FROM customers WHERE customer_id = ?
  `);

  const listAllStmt = database.prepare(`
    SELECT * FROM customers ORDER BY full_name ASC
  `);

  const searchStmt = database.prepare(`
    SELECT * FROM customers
    WHERE full_name LIKE ? OR phone LIKE ?
    ORDER BY full_name ASC
  `);

  return {
    async save(customer) {
      let limitInt = null;
      if (customer.credit_limit !== null && customer.credit_limit !== undefined) {
        limitInt = toMoneyInt(customer.credit_limit, "credit_limit");
      }
      const balanceInt = toMoneyInt(customer.current_balance, "current_balance");

      insertOrUpdateStmt.run(
        customer.customer_id,
        customer.full_name,
        customer.phone,
        customer.address,
        limitInt,
        balanceInt,
        toSqliteBool(customer.is_active),
        customer.created_at,
        customer.updated_at
      );
      return customer;
    },

    async findById(customerId) {
      const row = findByIdStmt.get(customerId);
      return mapCustomerRow(row);
    },

    async listAll() {
      const rows = listAllStmt.all();
      const list = [];
      for (let index = 0; index < rows.length; index++) {
        list.push(mapCustomerRow(rows[index]));
      }
      return list;
    },

    async search(query) {
      const pattern = "%" + query + "%";
      const rows = searchStmt.all(pattern, pattern);
      const list = [];
      for (let index = 0; index < rows.length; index++) {
        list.push(mapCustomerRow(rows[index]));
      }
      return list;
    }
  };
}

export function createSqliteCreditTransactionRepository(database) {
  const insertStmt = database.prepare(`
    INSERT INTO credit_transactions (
      credit_tx_id,
      customer_id,
      sale_id,
      shift_id,
      type,
      amount_int,
      remarks,
      created_by,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const findByIdStmt = database.prepare(`
    SELECT * FROM credit_transactions WHERE credit_tx_id = ?
  `);

  const listByCustomerIdStmt = database.prepare(`
    SELECT * FROM credit_transactions
    WHERE customer_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const listRecentStmt = database.prepare(`
    SELECT * FROM credit_transactions
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return {
    async save(tx) {
      const amountInt = toMoneyInt(tx.amount, "amount");
      insertStmt.run(
        tx.credit_tx_id,
        tx.customer_id,
        tx.sale_id,
        tx.shift_id,
        tx.type,
        amountInt,
        tx.remarks,
        tx.created_by,
        tx.created_at
      );
      return tx;
    },

    async findById(txId) {
      const row = findByIdStmt.get(txId);
      return mapCreditTransactionRow(row);
    },

    async listByCustomerId(customerId, limit) {
      const safeLimit = limit || 50;
      const rows = listByCustomerIdStmt.all(customerId, safeLimit);
      const list = [];
      for (let index = 0; index < rows.length; index++) {
        list.push(mapCreditTransactionRow(rows[index]));
      }
      return list;
    },

    async listRecent(limit) {
      const safeLimit = limit || 50;
      const rows = listRecentStmt.all(safeLimit);
      const list = [];
      for (let index = 0; index < rows.length; index++) {
        list.push(mapCreditTransactionRow(rows[index]));
      }
      return list;
    }
  };
}
