import {
  fromMoneyInt,
  fromQuantityInt,
  multiplyMoneyByQuantityInt
} from "../shared/decimal.js";
import { ValidationError } from "../shared/errors.js";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(text) {
  const parts = text.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year) {
    return false;
  }
  if (parsed.getUTCMonth() !== month - 1) {
    return false;
  }
  return parsed.getUTCDate() === day;
}

export function resolveReportDate(rawValue, fallbackDate, fieldName) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim().length === 0) {
    return fallbackDate;
  }
  const text = String(rawValue).trim();
  if (!ISO_DATE_PATTERN.test(text)) {
    throw new ValidationError(fieldName + " must use YYYY-MM-DD format");
  }
  if (!isCalendarDate(text)) {
    throw new ValidationError(fieldName + " must be a valid calendar date");
  }
  return text;
}

export function calculateTotalCogsInt(itemRows) {
  let totalCogsInt = 0;
  for (let index = 0; index < itemRows.length; index++) {
    const row = itemRows[index];
    totalCogsInt =
      totalCogsInt + multiplyMoneyByQuantityInt(row.unit_cost_int, row.base_quantity_int);
  }
  return totalCogsInt;
}

export function calculateNetProfitInt(grossSalesInt, totalCogsInt, totalRefundInt) {
  return grossSalesInt - totalCogsInt - totalRefundInt;
}

export function countLowStockProducts(productRows) {
  let lowStockCount = 0;
  for (let index = 0; index < productRows.length; index++) {
    const row = productRows[index];
    if (row.current_stock_int > 0 && row.current_stock_int <= row.reorder_level_int) {
      lowStockCount = lowStockCount + 1;
    }
  }
  return lowStockCount;
}

export function countOutOfStockProducts(productRows) {
  let outOfStockCount = 0;
  for (let index = 0; index < productRows.length; index++) {
    const row = productRows[index];
    if (row.current_stock_int <= 0) {
      outOfStockCount = outOfStockCount + 1;
    }
  }
  return outOfStockCount;
}

export function calculateTotalItemsSoldInt(itemRows) {
  let totalItemsInt = 0;
  for (let index = 0; index < itemRows.length; index++) {
    const row = itemRows[index];
    totalItemsInt = totalItemsInt + row.quantity_int;
  }
  return totalItemsInt;
}

export function buildCategorySales(itemRows) {
  const grouped = new Map();

  for (let index = 0; index < itemRows.length; index++) {
    const row = itemRows[index];
    const categoryId = row.category_id || "uncategorized";
    const categoryName = row.category_name || "Uncategorized";

    let entry = grouped.get(categoryId);
    if (!entry) {
      entry = {
        category_id: categoryId,
        category_name: categoryName,
        total_quantity_int: 0,
        revenue_int: 0,
        cost_int: 0
      };
      grouped.set(categoryId, entry);
    }
    entry.total_quantity_int = entry.total_quantity_int + row.quantity_int;
    entry.revenue_int = entry.revenue_int + row.subtotal_int;
    entry.cost_int =
      entry.cost_int + multiplyMoneyByQuantityInt(row.unit_cost_int, row.base_quantity_int);
  }

  const list = Array.from(grouped.values());
  list.sort(function sortByRevenueDesc(first, second) {
    return second.revenue_int - first.revenue_int;
  });

  const results = [];
  for (let index = 0; index < list.length; index++) {
    const entry = list[index];
    results.push({
      category_id: entry.category_id,
      category_name: entry.category_name,
      quantity_sold: fromQuantityInt(entry.total_quantity_int),
      revenue: fromMoneyInt(entry.revenue_int),
      profit: fromMoneyInt(entry.revenue_int - entry.cost_int)
    });
  }
  return results;
}

export function calculateInventoryValuationInt(productRows) {
  let valuationInt = 0;
  for (let index = 0; index < productRows.length; index++) {
    const row = productRows[index];
    valuationInt =
      valuationInt + multiplyMoneyByQuantityInt(row.cost_price_int, row.current_stock_int);
  }
  return valuationInt;
}

export function buildTopProducts(itemRows, limitCount) {
  const grouped = new Map();

  for (let index = 0; index < itemRows.length; index++) {
    const row = itemRows[index];
    let entry = grouped.get(row.product_id);
    if (!entry) {
      entry = {
        product_id: row.product_id,
        product_name: row.product_name,
        image_url: row.image_url || null,
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

  const sliced = list.slice(0, limitCount);
  const results = [];
  for (let index = 0; index < sliced.length; index++) {
    const entry = sliced[index];
    results.push({
      product_id: entry.product_id,
      product_name: entry.product_name,
      image_url: entry.image_url,
      base_unit: entry.base_unit,
      quantity_sold: fromQuantityInt(entry.total_base_qty_int),
      revenue: fromMoneyInt(entry.revenue_int),
      profit: fromMoneyInt(entry.revenue_int - entry.cost_int)
    });
  }
  return results;
}

export function buildDailyBreakdown(dailyRows, itemRows) {
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
