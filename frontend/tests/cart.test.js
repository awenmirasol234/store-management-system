import { describe, expect, it } from "vitest";
import {
  calculateProductCartStockUsage,
  canAddStockToCart,
  computeItemBaseQuantity,
  computeLocalCartTotals,
  evaluateCashTendered,
  getSmartCashPresets,
  sanitizeCartItems
} from "../src/cart.js";

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

  it("sanitizes persisted cart values while accepting legacy base-unit items", function () {
    const legacyItem = {
      key: "rice:base",
      product_id: "rice",
      unit_price: "10",
      quantity: "2",
      custom_amount: null
    };
    const result = sanitizeCartItems([
      legacyItem,
      { key: "bad", product_id: "rice", unit_price: "not-a-number", quantity: 1 },
      null
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      Object.assign({}, legacyItem, {
        unit_price: 10,
        quantity: 2
      })
    );
    expect(sanitizeCartItems("not an array")).toEqual([]);
  });

  it("rejects non-positive custom amounts when calculating stock usage", function () {
    expect(
      computeItemBaseQuantity({
        product: { selling_price: 20 },
        customAmount: 0
      })
    ).toBe(0);
  });

  it("accepts numeric strings and ignores infinite discounts", function () {
    const totals = computeLocalCartTotals([{ unit_price: "10", quantity: 2 }], "3.5");
    expect(totals.subtotal).toBe(20);
    expect(totals.discount).toBe(3.5);
    expect(totals.total).toBe(16.5);

    expect(computeLocalCartTotals([{ unit_price: 10, quantity: 1 }], Infinity).discount).toBe(0);
  });
});

describe("computeItemBaseQuantity", function () {
  const dummyProduct = {
    product_id: "prod-1",
    product_name: "Cooking Oil",
    selling_price: 100,
    base_unit: "Liter (L)"
  };

  it("returns 1 for standard base unit item by default", function () {
    const qty = computeItemBaseQuantity({ product: dummyProduct });
    expect(qty).toBe(1);
  });

  it("multiplies base quantity by requested item quantity", function () {
    const qty = computeItemBaseQuantity({ product: dummyProduct, quantity: 3 });
    expect(qty).toBe(3);
  });

  it("multiplies option quantity by requested item quantity", function () {
    const option = { option_id: "opt-1", quantity: 5 };
    const qty = computeItemBaseQuantity({
      product: dummyProduct,
      option: option,
      quantity: 2
    });
    expect(qty).toBe(10);
  });

  it("computes custom tingi base quantity rounded to 4 decimals", function () {
    const qty = computeItemBaseQuantity({
      product: dummyProduct,
      customAmount: 50
    });
    expect(qty).toBe(0.5);

    const fractionalQty = computeItemBaseQuantity({
      product: { selling_price: 30 },
      customAmount: 10
    });
    expect(fractionalQty).toBe(0.3333);
  });

  it("safely handles zero selling price or invalid inputs", function () {
    expect(
      computeItemBaseQuantity({
        product: { selling_price: 0 },
        customAmount: 10
      })
    ).toBe(0);

    expect(computeItemBaseQuantity(null)).toBe(1);
  });
});

describe("calculateProductCartStockUsage", function () {
  it("returns 0 when cart is empty or productId is missing", function () {
    expect(calculateProductCartStockUsage([], "prod-1")).toBe(0);
    expect(calculateProductCartStockUsage(null, "prod-1")).toBe(0);
    expect(calculateProductCartStockUsage([{ product_id: "prod-1" }], null)).toBe(0);
  });

  it("aggregates base unit items for the target product", function () {
    const cart = [
      { product_id: "prod-1", quantity: 2, base_quantity_per_unit: 1 },
      { product_id: "prod-2", quantity: 5, base_quantity_per_unit: 1 }
    ];
    expect(calculateProductCartStockUsage(cart, "prod-1")).toBe(2);
  });

  it("aggregates mixed items (base unit, options, tingi) for the same product", function () {
    const cart = [
      { product_id: "prod-1", quantity: 2, base_quantity_per_unit: 1 }, // 2 base
      { product_id: "prod-1", quantity: 1, base_quantity_per_unit: 6 }, // 6 base (6-pack)
      { product_id: "prod-1", quantity: 1, base_quantity_per_unit: 0.5 } // 0.5 base (tingi)
    ];
    expect(calculateProductCartStockUsage(cart, "prod-1")).toBe(8.5);
  });

  it("avoids floating point rounding drift", function () {
    const cart = [
      { product_id: "prod-1", quantity: 1, base_quantity_per_unit: 0.1 },
      { product_id: "prod-1", quantity: 1, base_quantity_per_unit: 0.2 }
    ];
    expect(calculateProductCartStockUsage(cart, "prod-1")).toBe(0.3);
  });
});

describe("canAddStockToCart", function () {
  const dummyProduct = {
    product_id: "prod-1",
    product_name: "Coke Can",
    base_unit: "Piece (pc)",
    current_stock: 5,
    selling_price: 25
  };

  it("rejects when product is out of stock (current_stock <= 0)", function () {
    const outOfStockProd = Object.assign({}, dummyProduct, { current_stock: 0 });
    const result = canAddStockToCart({
      cartItems: [],
      product: outOfStockProd,
      additionalBaseQuantity: 1
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toBe("Coke Can is out of stock");
  });

  it("allows adding when quantity is within available stock", function () {
    const result = canAddStockToCart({
      cartItems: [],
      product: dummyProduct,
      additionalBaseQuantity: 3
    });
    expect(result.allowed).toBe(true);
    expect(result.message).toBe("");
  });

  it("allows adding when quantity exactly reaches available stock", function () {
    const cart = [{ product_id: "prod-1", quantity: 3, base_quantity_per_unit: 1 }];
    const result = canAddStockToCart({
      cartItems: cart,
      product: dummyProduct,
      additionalBaseQuantity: 2
    });
    expect(result.allowed).toBe(true);
    expect(result.message).toBe("");
  });

  it("rejects when addition exceeds available stock and returns clear error message", function () {
    const cart = [{ product_id: "prod-1", quantity: 4, base_quantity_per_unit: 1 }];
    const result = canAddStockToCart({
      cartItems: cart,
      product: dummyProduct,
      additionalBaseQuantity: 2
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toBe(
      "Requested quantity exceeds available stock for Coke Can (5 Pieces (pcs) available)."
    );
  });

  it("rejects when single option addition exceeds available stock", function () {
    const result = canAddStockToCart({
      cartItems: [],
      product: dummyProduct,
      additionalBaseQuantity: 6 // e.g. 6-pack when only 5 in stock
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toBe(
      "Requested quantity exceeds available stock for Coke Can (5 Pieces (pcs) available)."
    );
  });

  it("handles missing product gracefully", function () {
    const result = canAddStockToCart({
      cartItems: [],
      product: null,
      additionalBaseQuantity: 1
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toBe("Product is not available");
  });
});

describe("getSmartCashPresets", function () {
  it("returns Exact plus up to 3 strictly greater PHP banknotes under 1000", function () {
    expect(getSmartCashPresets(100)).toEqual([
      { key: "exact", label: "Exact", amount: 100 },
      { key: "200", label: "₱200", amount: 200 },
      { key: "500", label: "₱500", amount: 500 },
      { key: "1000", label: "₱1,000", amount: 1000 }
    ]);
    expect(getSmartCashPresets(550)).toEqual([
      { key: "exact", label: "Exact", amount: 550 },
      { key: "1000", label: "₱1,000", amount: 1000 }
    ]);
    expect(getSmartCashPresets(45)).toEqual([
      { key: "exact", label: "Exact", amount: 45 },
      { key: "50", label: "₱50", amount: 50 },
      { key: "100", label: "₱100", amount: 100 },
      { key: "200", label: "₱200", amount: 200 }
    ]);
  });

  it("returns Exact plus stepped bill combinations when total is 1000 or more", function () {
    expect(getSmartCashPresets(1250)).toEqual([
      { key: "exact", label: "Exact", amount: 1250 },
      { key: "1300", label: "₱1,300", amount: 1300 },
      { key: "1500", label: "₱1,500", amount: 1500 },
      { key: "2000", label: "₱2,000", amount: 2000 }
    ]);
  });

  it("returns only Exact when total is 0", function () {
    expect(getSmartCashPresets(0)).toEqual([
      { key: "exact", label: "Exact", amount: 0 }
    ]);
  });
});

describe("evaluateCashTendered", function () {
  it("distinguishes empty, invalid, short, exact, and overpayment states", function () {
    expect(evaluateCashTendered("", 100).status).toBe("empty");
    expect(evaluateCashTendered("-50", 100).status).toBe("invalid");
    expect(evaluateCashTendered("abc", 100).status).toBe("invalid");
    expect(evaluateCashTendered("100.123", 100).status).toBe("invalid");

    const shortEval = evaluateCashTendered("75.50", 100);
    expect(shortEval.status).toBe("short");
    expect(shortEval.shortAmount).toBe(24.5);

    const exactEval = evaluateCashTendered("100", 100);
    expect(exactEval.status).toBe("sufficient");
    expect(exactEval.changeAmount).toBe(0);

    const changeEval = evaluateCashTendered("200", 125.25);
    expect(changeEval.status).toBe("sufficient");
    expect(changeEval.changeAmount).toBe(74.75);
  });
});
