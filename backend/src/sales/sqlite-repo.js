import { fromMoneyInt, fromQuantityInt, toMoneyInt, toQuantityInt } from "../shared/decimal.js";

function mapSaleRow(row) {
  if (!row) {
    return null;
  }
  return {
    sale_id: row.sale_id,
    receipt_number: row.receipt_number,
    shift_id: row.shift_id,
    customer_id: row.customer_id,
    payment_method: row.payment_method,
    subtotal_amount: fromMoneyInt(row.subtotal_amount_int),
    discount_amount: fromMoneyInt(row.discount_amount_int),
    total_amount: fromMoneyInt(row.total_amount_int),
    cash_amount: fromMoneyInt(row.cash_amount_int),
    credit_amount: fromMoneyInt(row.credit_amount_int),
    amount_paid: fromMoneyInt(row.amount_paid_int),
    change_amount: fromMoneyInt(row.change_amount_int),
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at
  };
}

function mapSaleItemRow(row) {
  return {
    sale_item_id: row.sale_item_id,
    sale_id: row.sale_id,
    product_id: row.product_id,
    option_id: row.option_id,
    option_name_snapshot: row.option_name_snapshot,
    quantity: fromQuantityInt(row.quantity_int),
    base_quantity: fromQuantityInt(row.base_quantity_int),
    unit_price: fromMoneyInt(row.unit_price_int),
    unit_cost: fromMoneyInt(row.unit_cost_int),
    discount_amount: fromMoneyInt(row.discount_amount_int),
    subtotal: fromMoneyInt(row.subtotal_int)
  };
}

export function createSqliteSalesRepository(database) {
  const upsertSequenceStmt = database.prepare(`
    INSERT INTO receipt_sequences (business_date, last_sequence)
    VALUES (?, 1)
    ON CONFLICT(business_date) DO UPDATE SET last_sequence = last_sequence + 1
    RETURNING last_sequence
  `);

  const insertSaleStmt = database.prepare(`
    INSERT INTO sales_transactions (
      sale_id, receipt_number, shift_id, customer_id, payment_method,
      subtotal_amount_int, discount_amount_int, total_amount_int,
      cash_amount_int, credit_amount_int, amount_paid_int, change_amount_int,
      status, created_by, created_at
    ) VALUES (
      @sale_id, @receipt_number, @shift_id, @customer_id, @payment_method,
      @subtotal_amount_int, @discount_amount_int, @total_amount_int,
      @cash_amount_int, @credit_amount_int, @amount_paid_int, @change_amount_int,
      @status, @created_by, @created_at
    )
  `);

  const insertSaleItemStmt = database.prepare(`
    INSERT INTO sales_items (
      sale_item_id, sale_id, product_id, option_id, option_name_snapshot,
      quantity_int, base_quantity_int, unit_price_int, unit_cost_int,
      discount_amount_int, subtotal_int
    ) VALUES (
      @sale_item_id, @sale_id, @product_id, @option_id, @option_name_snapshot,
      @quantity_int, @base_quantity_int, @unit_price_int, @unit_cost_int,
      @discount_amount_int, @subtotal_int
    )
  `);

  const findSaleStmt = database.prepare("SELECT * FROM sales_transactions WHERE sale_id = ?");
  const findSaleItemsStmt = database.prepare("SELECT * FROM sales_items WHERE sale_id = ?");
  const listRecentSalesStmt = database.prepare(
    "SELECT * FROM sales_transactions ORDER BY created_at DESC LIMIT ?"
  );

  const returnedQtyStmt = database.prepare(`
    SELECT sri.sale_item_id, SUM(sri.quantity_int) AS returned_qty_int
    FROM sales_return_items sri
    INNER JOIN sales_returns sr ON sr.return_id = sri.return_id
    WHERE sr.sale_id = ?
    GROUP BY sri.sale_item_id
  `);

  const refundedCreditStmt = database.prepare(`
    SELECT COALESCE(SUM(credit_refund_amount_int), 0) AS total_credit_refund_int
    FROM sales_returns
    WHERE sale_id = ?
  `);

  const insertReturnStmt = database.prepare(`
    INSERT INTO sales_returns (
      return_id, sale_id, shift_id, total_refund_amount_int,
      credit_refund_amount_int, cash_refund_amount_int, remarks, created_by, created_at
    ) VALUES (
      @return_id, @sale_id, @shift_id, @total_refund_amount_int,
      @credit_refund_amount_int, @cash_refund_amount_int, @remarks, @created_by, @created_at
    )
  `);

  const insertReturnItemStmt = database.prepare(`
    INSERT INTO sales_return_items (
      return_item_id, return_id, sale_item_id, product_id,
      quantity_int, base_quantity_int, refund_amount_int
    ) VALUES (
      @return_item_id, @return_id, @sale_item_id, @product_id,
      @quantity_int, @base_quantity_int, @refund_amount_int
    )
  `);

  return {
    async nextReceiptSequence(compactDate) {
      const row = upsertSequenceStmt.get(compactDate);
      return row.last_sequence;
    },
    async saveSale(sale, items) {
      insertSaleStmt.run({
        sale_id: sale.sale_id,
        receipt_number: sale.receipt_number,
        shift_id: sale.shift_id,
        customer_id: sale.customer_id,
        payment_method: sale.payment_method,
        subtotal_amount_int: toMoneyInt(sale.subtotal_amount, "subtotal_amount"),
        discount_amount_int: toMoneyInt(sale.discount_amount, "discount_amount"),
        total_amount_int: toMoneyInt(sale.total_amount, "total_amount"),
        cash_amount_int: toMoneyInt(sale.cash_amount, "cash_amount"),
        credit_amount_int: toMoneyInt(sale.credit_amount, "credit_amount"),
        amount_paid_int: toMoneyInt(sale.amount_paid, "amount_paid"),
        change_amount_int: toMoneyInt(sale.change_amount, "change_amount"),
        status: sale.status,
        created_by: sale.created_by,
        created_at: sale.created_at
      });

      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        insertSaleItemStmt.run({
          sale_item_id: item.sale_item_id,
          sale_id: item.sale_id,
          product_id: item.product_id,
          option_id: item.option_id,
          option_name_snapshot: item.option_name_snapshot,
          quantity_int: toQuantityInt(item.quantity, "quantity"),
          base_quantity_int: toQuantityInt(item.base_quantity, "base_quantity"),
          unit_price_int: toMoneyInt(item.unit_price, "unit_price"),
          unit_cost_int: toMoneyInt(item.unit_cost, "unit_cost"),
          discount_amount_int: toMoneyInt(item.discount_amount, "discount_amount"),
          subtotal_int: toMoneyInt(item.subtotal, "subtotal")
        });
      }
    },
    async findSaleById(saleId) {
      const saleRow = findSaleStmt.get(saleId);
      if (!saleRow) {
        return null;
      }
      const itemRows = findSaleItemsStmt.all(saleId);
      const items = [];
      for (let index = 0; index < itemRows.length; index++) {
        items.push(mapSaleItemRow(itemRows[index]));
      }
      return {
        sale: mapSaleRow(saleRow),
        items: items
      };
    },
    async listRecentSales(limitCount) {
      const rows = listRecentSalesStmt.all(limitCount);
      const results = [];
      for (let index = 0; index < rows.length; index++) {
        results.push(mapSaleRow(rows[index]));
      }
      return results;
    },
    async getReturnedQuantitiesBySaleId(saleId) {
      const rows = returnedQtyStmt.all(saleId);
      const totals = new Map();
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        totals.set(row.sale_item_id, fromQuantityInt(row.returned_qty_int));
      }
      return totals;
    },
    async getRefundedCreditBySaleId(saleId) {
      const row = refundedCreditStmt.get(saleId);
      return fromMoneyInt(row.total_credit_refund_int);
    },
    async saveReturn(returnRecord) {
      insertReturnStmt.run({
        return_id: returnRecord.return_id,
        sale_id: returnRecord.sale_id,
        shift_id: returnRecord.shift_id,
        total_refund_amount_int: toMoneyInt(
          returnRecord.total_refund_amount,
          "total_refund_amount"
        ),
        credit_refund_amount_int: toMoneyInt(
          returnRecord.credit_refund_amount,
          "credit_refund_amount"
        ),
        cash_refund_amount_int: toMoneyInt(returnRecord.cash_refund_amount, "cash_refund_amount"),
        remarks: returnRecord.remarks,
        created_by: returnRecord.created_by,
        created_at: returnRecord.created_at
      });

      for (let index = 0; index < returnRecord.items.length; index++) {
        const item = returnRecord.items[index];
        insertReturnItemStmt.run({
          return_item_id: item.return_item_id,
          return_id: returnRecord.return_id,
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          quantity_int: toQuantityInt(item.quantity, "quantity"),
          base_quantity_int: toQuantityInt(item.base_quantity, "base_quantity"),
          refund_amount_int: toMoneyInt(item.refund_amount, "refund_amount")
        });
      }
    }
  };
}
