import { formatSmartDate } from "./format.js";

export function buildDailySeries(input) {
  const safeInput = input || {};
  const rows = safeInput.rows || [];
  const startDate = safeInput.startDate;
  const endDate = safeInput.endDate;

  if (!startDate || !endDate) {
    return [];
  }

  const startParts = startDate.split("-");
  const endParts = endDate.split("-");
  if (startParts.length !== 3 || endParts.length !== 3) {
    return [];
  }

  const startUtc = Date.UTC(
    Number(startParts[0]),
    Number(startParts[1]) - 1,
    Number(startParts[2])
  );
  const endUtc = Date.UTC(
    Number(endParts[0]),
    Number(endParts[1]) - 1,
    Number(endParts[2])
  );

  if (startUtc > endUtc) {
    return [];
  }

  const rowMap = new Map();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.date) {
      rowMap.set(row.date, row);
    }
  }

  const series = [];
  const oneDayMs = 24 * 60 * 60 * 1000;
  let currentUtc = startUtc;

  while (currentUtc <= endUtc) {
    const curDate = new Date(currentUtc);
    const yearStr = String(curDate.getUTCFullYear());
    const monthStr = String(curDate.getUTCMonth() + 1).padStart(2, "0");
    const dayStr = String(curDate.getUTCDate()).padStart(2, "0");
    const dateKey = yearStr + "-" + monthStr + "-" + dayStr;

    let sales = 0;
    let profit = 0;
    let saleCount = 0;

    const matchedRow = rowMap.get(dateKey);
    if (matchedRow) {
      if (matchedRow.gross_sales !== undefined) {
        sales = Number(matchedRow.gross_sales || 0);
      } else if (matchedRow.sales !== undefined) {
        sales = Number(matchedRow.sales || 0);
      }

      if (matchedRow.profit !== undefined) {
        profit = Number(matchedRow.profit || 0);
      }

      if (matchedRow.sale_count !== undefined) {
        saleCount = Number(matchedRow.sale_count || 0);
      } else if (matchedRow.saleCount !== undefined) {
        saleCount = Number(matchedRow.saleCount || 0);
      }
    }

    let metaText = "No transactions";
    if (saleCount === 1) {
      metaText = "1 transaction";
    } else if (saleCount > 1) {
      metaText = saleCount + " transactions";
    }

    series.push({
      date: dateKey,
      label: formatSmartDate(dateKey),
      shortLabel: dateKey.slice(5),
      tickLabel: dateKey.slice(5),
      sales: sales,
      profit: profit,
      saleCount: saleCount,
      meta: metaText
    });

    currentUtc = currentUtc + oneDayMs;
  }

  return series;
}

export function pickTickIndexes(input) {
  const safeInput = input || {};
  const count = Number(safeInput.count || 0);
  let maxTicks = Number(safeInput.maxTicks || 5);

  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [0];
  }
  if (maxTicks < 2) {
    return [0];
  }
  if (count <= maxTicks) {
    const all = [];
    for (let i = 0; i < count; i++) {
      all.push(i);
    }
    return all;
  }

  const result = [];
  const step = (count - 1) / (maxTicks - 1);
  for (let i = 0; i < maxTicks; i++) {
    const idx = Math.min(count - 1, Math.round(i * step));
    if (result.length === 0 || result[result.length - 1] !== idx) {
      result.push(idx);
    }
  }

  if (result[result.length - 1] !== count - 1) {
    result[result.length - 1] = count - 1;
  }

  return result;
}

export function groupTopItems(input) {
  const safeInput = input || {};
  const rawItems = safeInput.items || [];
  const limit = Number(safeInput.limit || 5);
  let otherLabel = "Other";
  if (safeInput.otherLabel) {
    otherLabel = safeInput.otherLabel;
  }

  const positiveItems = [];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const val = Number(item.value || 0);
    if (val > 0) {
      positiveItems.push({
        label: item.label,
        value: val,
        count: item.count || 0,
        color: item.color
      });
    }
  }

  positiveItems.sort(function (first, second) {
    return second.value - first.value;
  });

  if (positiveItems.length <= limit) {
    return positiveItems;
  }

  const results = positiveItems.slice(0, limit);
  let otherValue = 0;
  let otherCount = 0;
  for (let i = limit; i < positiveItems.length; i++) {
    otherValue = otherValue + positiveItems[i].value;
    otherCount = otherCount + positiveItems[i].count;
  }

  if (otherValue > 0) {
    results.push({
      label: otherLabel,
      value: otherValue,
      count: otherCount,
      color: "#777777"
    });
  }

  return results;
}
