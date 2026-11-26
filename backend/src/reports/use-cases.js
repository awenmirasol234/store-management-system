import { fromMoneyInt, fromQuantityInt } from "../shared/decimal.js";
import { ValidationError } from "../shared/errors.js";
import { parsePositiveLimit } from "../shared/validation.js";
import {
  buildCategorySales,
  buildDailyBreakdown,
  buildTopProducts,
  calculateInventoryValuationInt,
  calculateNetProfitInt,
  calculateTotalCogsInt,
  calculateTotalItemsSoldInt,
  countLowStockProducts,
  countOutOfStockProducts,
  resolveReportDate
} from "./domain.js";

function resolveReportRange(dependencies, input) {
  const safeInput = input || {};
  const today = dependencies.clock.todayManilaIsoDate();
  const fromDate = resolveReportDate(safeInput.from, today, "from");
  const toDate = resolveReportDate(safeInput.to, today, "to");
  if (fromDate > toDate) {
    throw new ValidationError("from must be on or before to");
  }
  return {
    fromDate: fromDate,
    toDate: toDate
  };
}

export function createGetReportsSummaryUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const range = resolveReportRange(dependencies, safeInput);
    const rows = await dependencies.reportsRepository.getSummaryRows(range.fromDate, range.toDate);
    const totalCogsInt = calculateTotalCogsInt(rows.items);
    const totalItemsSoldInt = calculateTotalItemsSoldInt(rows.items);
    const netSalesInt = rows.sales.gross_sales_int - rows.returns.total_refund_int;

    return {
      from_date: range.fromDate,
      to_date: range.toDate,
      sale_count: rows.sales.sale_count,
      total_items_sold: fromQuantityInt(totalItemsSoldInt),
      gross_sales: fromMoneyInt(rows.sales.gross_sales_int),
      net_sales: fromMoneyInt(netSalesInt),
      cash_sales: fromMoneyInt(rows.sales.cash_sales_int),
      credit_sales: fromMoneyInt(rows.sales.credit_sales_int),
      total_discount: fromMoneyInt(rows.sales.total_discount_int),
      total_refunds: fromMoneyInt(rows.returns.total_refund_int),
      cogs: fromMoneyInt(totalCogsInt),
      net_profit: fromMoneyInt(
        calculateNetProfitInt(rows.sales.gross_sales_int, totalCogsInt, rows.returns.total_refund_int)
      ),
      active_product_count: rows.products.length,
      low_stock_count: countLowStockProducts(rows.products),
      out_of_stock_count: countOutOfStockProducts(rows.products),
      inventory_valuation: fromMoneyInt(calculateInventoryValuationInt(rows.products))
    };
  };
}

export function createGetTopProductsUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const range = resolveReportRange(dependencies, safeInput);
    const limit = parsePositiveLimit(safeInput.limit, 10, "limit");
    const itemRows = await dependencies.reportsRepository.getSalesItems(range.fromDate, range.toDate);
    return buildTopProducts(itemRows, limit);
  };
}

export function createGetDailyBreakdownUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const range = resolveReportRange(dependencies, safeInput);
    const dailyRows = await dependencies.reportsRepository.getDailySalesRows(
      range.fromDate,
      range.toDate
    );
    const itemRows = await dependencies.reportsRepository.getSalesItems(range.fromDate, range.toDate);
    return buildDailyBreakdown(dailyRows, itemRows);
  };
}

export function createGetCategorySalesUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const range = resolveReportRange(dependencies, safeInput);
    const itemRows = await dependencies.reportsRepository.getSalesItems(range.fromDate, range.toDate);
    return buildCategorySales(itemRows);
  };
}

export function createGetStockMovementReportUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const range = resolveReportRange(dependencies, safeInput);
    const rows = await dependencies.reportsRepository.getStockMovementRows(range.fromDate, range.toDate);
    const results = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      results.push({
        transaction_id: row.transaction_id,
        product_id: row.product_id,
        product_name: row.product_name,
        base_unit: row.base_unit,
        transaction_type: row.transaction_type,
        quantity: fromQuantityInt(row.quantity_int),
        unit_cost: fromMoneyInt(row.unit_cost_int),
        reference_number: row.reference_number,
        remarks: row.remarks,
        supplier_name: row.supplier_name,
        created_by: row.created_by,
        created_at: row.created_at
      });
    }
    return results;
  };
}

export function createGetTransactionsReportUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const range = resolveReportRange(dependencies, safeInput);
    const rows = await dependencies.reportsRepository.getTransactionRows(range.fromDate, range.toDate);
    const results = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      results.push({
        sale_id: row.sale_id,
        receipt_number: row.receipt_number,
        payment_method: row.payment_method,
        subtotal_amount: fromMoneyInt(row.subtotal_amount_int),
        discount_amount: fromMoneyInt(row.discount_amount_int),
        total_amount: fromMoneyInt(row.total_amount_int),
        cash_amount: fromMoneyInt(row.cash_amount_int),
        credit_amount: fromMoneyInt(row.credit_amount_int),
        status: row.status,
        items_count: row.items_count,
        created_by: row.created_by,
        created_at: row.created_at
      });
    }
    return results;
  };
}
