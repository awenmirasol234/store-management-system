import {
  fromMoneyInt,
  fromQuantityInt,
  multiplyMoneyByQuantityInt
} from "../shared/decimal.js";

export function createSqliteReportsRepository(database) {
  const salesSummaryStmt = database.prepare(`
    SELECT
      COUNT(*) AS sale_count,
      COALESCE(SUM(total_amount_int), 0) AS gross_sales_int,
      COALESCE(SUM(cash_amount_int), 0) AS cash_sales_int,
      COALESCE(SUM(credit_amount_int), 0) AS credit_sales_int,
      COALESCE(SUM(discount_amount_int), 0) AS total_discount_int
    FROM sales_transactions
    WHERE status = 'COMPLETED'
      AND date(created_at, '+8 hours') >= ?
      AND date(created_at, '+8 hours') <= ?
  `);

  const returnsSummaryStmt = database.prepare(`
    SELECT
      COALESCE(SUM(total_refund_amount_int), 0) AS total_refund_int,
      COALESCE(SUM(cash_refund_amount_int), 0) AS cash_refund_int,
      COALESCE(SUM(credit_refund_amount_int), 0) AS credit_refund_int
    FROM sales_returns
    WHERE date(created_at, '+8 hours') >= ?
      AND date(created_at, '+8 hours') <= ?
  `);

  const salesItemsInRangeStmt = database.prepare(`
    SELECT
      si.product_id,
      p.product_name,
      p.base_unit,
      si.base_quantity_int,
      si.unit_cost_int,
      si.subtotal_int,
      date(st.created_at, '+8 hours') AS manila_date
    FROM sales_items si
    INNER JOIN sales_transactions st ON st.sale_id = si.sale_id
    INNER JOIN products p ON p.product_id = si.product_id
    WHERE st.status = 'COMPLETED'
      AND date(st.created_at, '+8 hours') >= ?
      AND date(st.created_at, '+8 hours') <= ?
  `);

  const dailySalesStmt = database.prepare(`
    SELECT
      date(created_at, '+8 hours') AS manila_date,
      COUNT(*) AS sale_count,
      COALESCE(SUM(total_amount_int), 0) AS gross_sales_int
    FROM sales_transactions
    WHERE status = 'COMPLETED'
      AND date(created_at, '+8 hours') >= ?
      AND date(created_at, '+8 hours') <= ?
    GROUP BY date(created_at, '+8 hours')
    ORDER BY manila_date DESC
  `);

  const activeProductsStmt = database.prepare(`
    SELECT
      current_stock_int,
      cost_price_int,
      reorder_level_int
    FROM products
    WHERE deleted_at IS NULL AND is_active = 1
  `);

  return {
    async getSummary(fromDate, toDate) {
      const salesRow = salesSummaryStmt.get(fromDate, toDate);
      const returnRow = returnsSummaryStmt.get(fromDate, toDate);
      const itemRows = salesItemsInRangeStmt.all(fromDate, toDate);

      let totalCogsInt = 0;
      for (let index = 0; index < itemRows.length; index++) {
        const row = itemRows[index];
        totalCogsInt =
          totalCogsInt + multiplyMoneyByQuantityInt(row.unit_cost_int, row.base_quantity_int);
      }

      const netProfitInt =
        salesRow.gross_sales_int - totalCogsInt - returnRow.total_refund_int;

      const productRows = activeProductsStmt.all();
      let lowStockCount = 0;
      let inventoryValuationInt = 0;
      for (let index = 0; index < productRows.length; index++) {
        const productRow = productRows[index];
        if (productRow.current_stock_int <= productRow.reorder_level_int) {
          lowStockCount = lowStockCount + 1;
        }
        inventoryValuationInt =
          inventoryValuationInt +
          multiplyMoneyByQuantityInt(productRow.cost_price_int, productRow.current_stock_int);
      }

      return {
        from_date: fromDate,
        to_date: toDate,
        sale_count: salesRow.sale_count,
        gross_sales: fromMoneyInt(salesRow.gross_sales_int),
        cash_sales: fromMoneyInt(salesRow.cash_sales_int),
        credit_sales: fromMoneyInt(salesRow.credit_sales_int),
        total_discount: fromMoneyInt(salesRow.total_discount_int),
        total_refunds: fromMoneyInt(returnRow.total_refund_int),
        cogs: fromMoneyInt(totalCogsInt),
        net_profit: fromMoneyInt(netProfitInt),
        active_product_count: productRows.length,
        low_stock_count: lowStockCount,
        inventory_valuation: fromMoneyInt(inventoryValuationInt)
      };
    },

    async getTopProducts(fromDate, toDate, limitCount) {
      const itemRows = salesItemsInRangeStmt.all(fromDate, toDate);
      const grouped = new Map();

      for (let index = 0; index < itemRows.length; index++) {
        const row = itemRows[index];
        let entry = grouped.get(row.product_id);
        if (!entry) {
          entry = {
            product_id: row.product_id,
            product_name: row.product_name,
            base_unit: row.base_unit,
            total_base_qty_int: 0,
            revenue_int: 0,
            cost_int: 0
          };
          grouped.set(row.product_id, entry);
        }
        entry.total_base_qty_int = entry.total_base_qty_int + row.base_quantity_int;
        entry.revenue_int = entry.revenue_int + row.subtotal_int;
        entry.cost_int =
          entry.cost_int + multiplyMoneyByQuantityInt(row.unit_cost_int, row.base_quantity_int);
      }

      const list = Array.from(grouped.values());
      list.sort(function sortByRevenueDesc(first, second) {
        return second.revenue_int - first.revenue_int;
      });

      let limit = limitCount;
      if (!Number.isInteger(limit) || limit <= 0) {
        limit = 10;
      }
      const sliced = list.slice(0, limit);
      const results = [];
      for (let index = 0; index < sliced.length; index++) {
        const entry = sliced[index];
        results.push({
          product_id: entry.product_id,
          product_name: entry.product_name,
          base_unit: entry.base_unit,
          quantity_sold: fromQuantityInt(entry.total_base_qty_int),
          revenue: fromMoneyInt(entry.revenue_int),
          profit: fromMoneyInt(entry.revenue_int - entry.cost_int)
        });
      }
      return results;
    },

    async getDailyBreakdown(fromDate, toDate) {
      const dailyRows = dailySalesStmt.all(fromDate, toDate);
      const itemRows = salesItemsInRangeStmt.all(fromDate, toDate);

      const cogsByDate = new Map();
      for (let index = 0; index < itemRows.length; index++) {
        const row = itemRows[index];
        let existing = cogsByDate.get(row.manila_date);
        if (existing === undefined) {
          existing = 0;
        }
        const lineCostInt = multiplyMoneyByQuantityInt(row.unit_cost_int, row.base_quantity_int);
        cogsByDate.set(row.manila_date, existing + lineCostInt);
      }

      const results = [];
      for (let index = 0; index < dailyRows.length; index++) {
        const row = dailyRows[index];
        let dayCogsInt = cogsByDate.get(row.manila_date);
        if (dayCogsInt === undefined) {
          dayCogsInt = 0;
        }
        results.push({
          date: row.manila_date,
          sale_count: row.sale_count,
          gross_sales: fromMoneyInt(row.gross_sales_int),
          profit: fromMoneyInt(row.gross_sales_int - dayCogsInt)
        });
      }
      return results;
    }
  };
}
