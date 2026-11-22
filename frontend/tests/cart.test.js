import { describe, expect, it } from "vitest";
import { computeLocalCartTotals } from "../src/cart.js";

describe("cart totals", function () {
  it("rounds line totals to centavos", function () {
    const totals = computeLocalCartTotals([{ unit_price: 19.99, quantity: 3 }], 0);
    expect(totals.subtotal).toBe(59.97);
    expect(totals.total).toBe(59.97);
  });

  it("caps the discount at the subtotal and ignores invalid values", function () {
    const items = [{ unit_price: 10, quantity: 2 }];
    expect(computeLocalCartTotals(items, 999).discount).toBe(20);
    expect(computeLocalCartTotals(items, -5).discount).toBe(0);
    expect(computeLocalCartTotals(items, "abc").discount).toBe(0);
  });

  it("rounds the discount and total to centavos", function () {
    const totals = computeLocalCartTotals([{ unit_price: 100, quantity: 1 }], 33.333);
    expect(totals.discount).toBe(33.33);
    expect(totals.total).toBe(66.67);
  });

  it("returns zero totals for an empty cart", function () {
    expect(computeLocalCartTotals([], 10)).toEqual({
      subtotal: 0,
      discount: 0,
      total: 0
    });
  });

  it("accepts numeric strings and ignores infinite discounts", function () {
    const totals = computeLocalCartTotals([{ unit_price: "10", quantity: 2 }], "3.5");
    expect(totals.subtotal).toBe(20);
    expect(totals.discount).toBe(3.5);
    expect(totals.total).toBe(16.5);

    expect(computeLocalCartTotals([{ unit_price: 10, quantity: 1 }], Infinity).discount).toBe(0);
  });
});
