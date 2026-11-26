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
    WITH return_totals AS (
      SELECT
        sri.sale_item_id,
        COALESCE(SUM(sri.quantity_int), 0) AS returned_quantity_int,
        COALESCE(SUM(sri.base_quantity_int), 0) AS returned_base_quantity_int,
        COALESCE(SUM(sri.refund_amount_int), 0) AS returned_refund_int
      FROM sales_return_items sri
      INNER JOIN sales_returns sr ON sr.return_id = sri.return_id
      WHERE date(sr.created_at, ${MANILA_SQL_OFFSET}) >= ?
        AND date(sr.created_at, ${MANILA_SQL_OFFSET}) <= ?
      GROUP BY sri.sale_item_id
    ),
    sales_in_range AS (
      SELECT
        si.product_id,
        p.product_name,
        p.image_url,
        p.base_unit,
        p.category_id,
        pc.category_name,
        si.quantity_int - COALESCE(rt.returned_quantity_int, 0) AS quantity_int,
        si.base_quantity_int - COALESCE(rt.returned_base_quantity_int, 0) AS base_quantity_int,
        si.unit_cost_int,
        si.subtotal_int - COALESCE(rt.returned_refund_int, 0) AS subtotal_int,
        date(st.created_at, ${MANILA_SQL_OFFSET}) AS manila_date
      FROM sales_items si
      INNER JOIN sales_transactions st ON st.sale_id = si.sale_id
      INNER JOIN products p ON p.product_id = si.product_id
      LEFT JOIN product_categories pc ON pc.category_id = p.category_id
      LEFT JOIN return_totals rt ON rt.sale_item_id = si.sale_item_id
      WHERE st.status = '${COMPLETED_SALE_STATUS}'
        AND date(st.created_at, ${MANILA_SQL_OFFSET}) >= ?
        AND date(st.created_at, ${MANILA_SQL_OFFSET}) <= ?
    )
    SELECT * FROM sales_in_range
    UNION ALL
    SELECT
      si.product_id,
      p.product_name,
      p.image_url,
      p.base_unit,
      p.category_id,
      pc.category_name,
      -sri.quantity_int AS quantity_int,
      -sri.base_quantity_int AS base_quantity_int,
      si.unit_cost_int,
      -sri.refund_amount_int AS subtotal_int,
      date(sr.created_at, ${MANILA_SQL_OFFSET}) AS manila_date
    FROM sales_return_items sri
    INNER JOIN sales_returns sr ON sr.return_id = sri.return_id
    INNER JOIN sales_items si ON si.sale_item_id = sri.sale_item_id
    INNER JOIN sales_transactions st ON st.sale_id = si.sale_id
    INNER JOIN products p ON p.product_id = si.product_id
    LEFT JOIN product_categories pc ON pc.category_id = p.category_id
    WHERE st.status = '${COMPLETED_SALE_STATUS}'
      AND date(sr.created_at, ${MANILA_SQL_OFFSET}) >= ?
      AND date(sr.created_at, ${MANILA_SQL_OFFSET}) <= ?
      AND (
        date(st.created_at, ${MANILA_SQL_OFFSET}) < ?
        OR date(st.created_at, ${MANILA_SQL_OFFSET}) > ?
      )
  `);

  const stockMovementsStmt = database.prepare(`
    SELECT
      it.transaction_id,
      it.product_id,
      p.product_name,
      p.base_unit,
      it.transaction_type,
      it.quantity_int,
      it.unit_cost_int,
      it.reference_number,
      it.remarks,
      it.created_by,
      it.created_at,
      s.supplier_name
    FROM inventory_transactions it
    INNER JOIN products p ON p.product_id = it.product_id
    LEFT JOIN suppliers s ON s.supplier_id = it.supplier_id
    WHERE date(it.created_at, ${MANILA_SQL_OFFSET}) >= ?
      AND date(it.created_at, ${MANILA_SQL_OFFSET}) <= ?
    ORDER BY it.created_at DESC
  `);

  const detailedTransactionsStmt = database.prepare(`
    SELECT
      st.sale_id,
      st.receipt_number,
      st.payment_method,
      st.subtotal_amount_int,
      st.discount_amount_int,
      st.total_amount_int,
      st.cash_amount_int,
      st.credit_amount_int,
      st.status,
      st.created_by,
      st.created_at,
      (SELECT COUNT(*) FROM sales_items WHERE sale_id = st.sale_id) AS items_count
    FROM sales_transactions st
    WHERE date(st.created_at, ${MANILA_SQL_OFFSET}) >= ?
      AND date(st.created_at, ${MANILA_SQL_OFFSET}) <= ?
    ORDER BY st.created_at DESC
  `);

  const dailySalesStmt = database.prepare(`
    WITH sales_by_day AS (
      SELECT
        date(created_at, ${MANILA_SQL_OFFSET}) AS manila_date,
        COUNT(*) AS sale_count,
        COALESCE(SUM(total_amount_int), 0) AS gross_sales_int
      FROM sales_transactions
      WHERE status = '${COMPLETED_SALE_STATUS}'
        AND date(created_at, ${MANILA_SQL_OFFSET}) >= ?
        AND date(created_at, ${MANILA_SQL_OFFSET}) <= ?
      GROUP BY date(created_at, ${MANILA_SQL_OFFSET})
    ),
    returns_by_day AS (
      SELECT
        date(created_at, ${MANILA_SQL_OFFSET}) AS manila_date,
        COALESCE(SUM(total_refund_amount_int), 0) AS total_refund_int
      FROM sales_returns
      WHERE date(created_at, ${MANILA_SQL_OFFSET}) >= ?
        AND date(created_at, ${MANILA_SQL_OFFSET}) <= ?
      GROUP BY date(created_at, ${MANILA_SQL_OFFSET})
    ),
    report_dates AS (
      SELECT manila_date FROM sales_by_day
      UNION
      SELECT manila_date FROM returns_by_day
    )
    SELECT
      report_dates.manila_date,
      COALESCE(sales_by_day.sale_count, 0) AS sale_count,
      COALESCE(sales_by_day.gross_sales_int, 0) -
        COALESCE(returns_by_day.total_refund_int, 0) AS gross_sales_int
    FROM report_dates
    LEFT JOIN sales_by_day ON sales_by_day.manila_date = report_dates.manila_date
    LEFT JOIN returns_by_day ON returns_by_day.manila_date = report_dates.manila_date
    ORDER BY report_dates.manila_date DESC
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
        items: salesItemsInRangeStmt.all(
          fromDate,
          toDate,
          fromDate,
          toDate,
          fromDate,
          toDate,
          fromDate,
          toDate
        ),
        products: activeProductsStmt.all()
      };
    },

    async getSalesItems(fromDate, toDate) {
      return salesItemsInRangeStmt.all(
        fromDate,
        toDate,
        fromDate,
        toDate,
        fromDate,
        toDate,
        fromDate,
        toDate
      );
    },

    async getDailySalesRows(fromDate, toDate) {
      return dailySalesStmt.all(fromDate, toDate, fromDate, toDate);
    },

    async getStockMovementRows(fromDate, toDate) {
      return stockMovementsStmt.all(fromDate, toDate);
    },

    async getTransactionRows(fromDate, toDate) {
      return detailedTransactionsStmt.all(fromDate, toDate);
    }
  };
}
