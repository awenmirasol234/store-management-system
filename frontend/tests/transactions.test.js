import { describe, expect, it } from "vitest";
import { filterSales } from "../src/pages/TransactionsPage.jsx";

describe("filterSales", function () {
  const sampleSales = [
    { sale_id: "s1", receipt_number: 1001, payment_method: "CASH" },
    { sale_id: "s2", receipt_number: 1002, payment_method: "CREDIT" },
    { sale_id: "s3", receipt_number: 2050, payment_method: "CASH" }
  ];

  it("filters sales by exact receipt number", function () {
    const results = filterSales(sampleSales, "1001");
    expect(results.length).toBe(1);
    expect(results[0].receipt_number).toBe(1001);
  });

  it("filters sales by partial substring receipt number", function () {
    const results = filterSales(sampleSales, "10");
    expect(results.length).toBe(2);
    expect(results[0].receipt_number).toBe(1001);
    expect(results[1].receipt_number).toBe(1002);
  });

  it("handles queries prefixed with # or OR #", function () {
    expect(filterSales(sampleSales, "#1001").length).toBe(1);
    expect(filterSales(sampleSales, "OR #1002").length).toBe(1);
    expect(filterSales(sampleSales, "or 2050").length).toBe(1);
  });

  it("returns all sales when query is empty or only whitespace", function () {
    expect(filterSales(sampleSales, "").length).toBe(3);
    expect(filterSales(sampleSales, "   ").length).toBe(3);
    expect(filterSales(sampleSales, null).length).toBe(3);
  });

  it("handles null or non-array sales gracefully", function () {
    expect(filterSales(null, "1001")).toEqual([]);
    expect(filterSales(undefined, "1001")).toEqual([]);
  });
});
