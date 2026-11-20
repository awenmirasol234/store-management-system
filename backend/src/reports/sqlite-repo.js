export function createSqliteReportsRepository(database) {
  const MANILA_SQL_OFFSET = "'+8 hours'";
  const COMPLETED_SALE_STATUS = "COMPLETED";

  const salesSummaryStmt = database.prepare(`
    SELECT
      COUNT(*) AS sale_count,
      COALESCE(SUM(total_amount_int), 0) AS gross_sales_int,
      COALESCE(SUM(cash_amount_int), 0) AS cash_sales_int,
      COALESCE(SUM(credit_amount_int), 0) AS credit_sales_int,
      COALESCE(SUM(discount_amount_int), 0) AS total_discount_int
    FROM sales_transactions
    WHERE status = '${COMPLETED_SALE_STATUS}'
      AND date(created_at, ${MANILA_SQL_OFFSET}) >= ?
      AND date(created_at, ${MANILA_SQL_OFFSET}) <= ?
  `);

  const returnsSummaryStmt = database.prepare(`
    SELECT
      COALESCE(SUM(total_refund_amount_int), 0) AS total_refund_int,
      COALESCE(SUM(cash_refund_amount_int), 0) AS cash_refund_int,
      COALESCE(SUM(credit_refund_amount_int), 0) AS credit_refund_int
    FROM sales_returns
    WHERE date(created_at, ${MANILA_SQL_OFFSET}) >= ?
      AND date(created_at, ${MANILA_SQL_OFFSET}) <= ?
  `);

  const salesItemsInRangeStmt = database.prepare(`
    SELECT
      si.product_id,
      p.product_name,
      p.base_unit,
      si.base_quantity_int,
      si.unit_cost_int,
      si.subtotal_int,
      date(st.created_at, ${MANILA_SQL_OFFSET}) AS manila_date
    FROM sales_items si
    INNER JOIN sales_transactions st ON st.sale_id = si.sale_id
    INNER JOIN products p ON p.product_id = si.product_id
    WHERE st.status = '${COMPLETED_SALE_STATUS}'
      AND date(st.created_at, ${MANILA_SQL_OFFSET}) >= ?
      AND date(st.created_at, ${MANILA_SQL_OFFSET}) <= ?
  `);

  const dailySalesStmt = database.prepare(`
    SELECT
      date(created_at, ${MANILA_SQL_OFFSET}) AS manila_date,
      COUNT(*) AS sale_count,
      COALESCE(SUM(total_amount_int), 0) AS gross_sales_int
    FROM sales_transactions
    WHERE status = '${COMPLETED_SALE_STATUS}'
      AND date(created_at, ${MANILA_SQL_OFFSET}) >= ?
      AND date(created_at, ${MANILA_SQL_OFFSET}) <= ?
    GROUP BY date(created_at, ${MANILA_SQL_OFFSET})
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
    async getSummaryRows(fromDate, toDate) {
      return {
        sales: salesSummaryStmt.get(fromDate, toDate),
        returns: returnsSummaryStmt.get(fromDate, toDate),
        items: salesItemsInRangeStmt.all(fromDate, toDate),
        products: activeProductsStmt.all()
      };
    },

    async getSalesItems(fromDate, toDate) {
      return salesItemsInRangeStmt.all(fromDate, toDate);
    },

    async getDailySalesRows(fromDate, toDate) {
      return dailySalesStmt.all(fromDate, toDate);
    }
  };
}
