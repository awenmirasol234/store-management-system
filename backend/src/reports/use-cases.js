import { fromMoneyInt } from "../shared/decimal.js";
import { parsePositiveLimit } from "../shared/validation.js";
import {
  buildDailyBreakdown,
  buildTopProducts,
  calculateInventoryValuationInt,
  calculateNetProfitInt,
  calculateTotalCogsInt,
  countLowStockProducts,
  resolveReportDate
} from "./domain.js";

function resolveReportRange(dependencies, input) {
  const today = dependencies.clock.todayManilaIsoDate();
  return {
    fromDate: resolveReportDate(input.from, today, "from"),
    toDate: resolveReportDate(input.to, today, "to")
  };
}

export function createGetReportsSummaryUseCase(dependencies) {
  return async function execute(input) {
    const range = resolveReportRange(dependencies, input);
    const rows = await dependencies.reportsRepository.getSummaryRows(range.fromDate, range.toDate);
    const totalCogsInt = calculateTotalCogsInt(rows.items);

    return {
      from_date: range.fromDate,
      to_date: range.toDate,
      sale_count: rows.sales.sale_count,
      gross_sales: fromMoneyInt(rows.sales.gross_sales_int),
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
      inventory_valuation: fromMoneyInt(calculateInventoryValuationInt(rows.products))
    };
  };
}

export function createGetTopProductsUseCase(dependencies) {
  return async function execute(input) {
    const range = resolveReportRange(dependencies, input);
    const limit = parsePositiveLimit(input.limit, 10, "limit");
    const itemRows = await dependencies.reportsRepository.getSalesItems(range.fromDate, range.toDate);
    return buildTopProducts(itemRows, limit);
  };
}

export function createGetDailyBreakdownUseCase(dependencies) {
  return async function execute(input) {
    const range = resolveReportRange(dependencies, input);
    const dailyRows = await dependencies.reportsRepository.getDailySalesRows(
      range.fromDate,
      range.toDate
    );
    const itemRows = await dependencies.reportsRepository.getSalesItems(range.fromDate, range.toDate);
    return buildDailyBreakdown(dailyRows, itemRows);
  };
}
