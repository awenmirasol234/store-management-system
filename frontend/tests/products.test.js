import { describe, expect, it } from "vitest";
import { filterProducts, getStockLevel, PRODUCT_CATEGORIES, STOCK_LEVELS } from "../src/products.js";

describe("stock levels", function () {
  it("marks out of stock when current stock is zero or negative", function () {
    expect(getStockLevel({ current_stock: 0, reorder_level: 5 })).toBe(STOCK_LEVELS.OUT);
    expect(getStockLevel({ current_stock: -1, reorder_level: 5 })).toBe(STOCK_LEVELS.OUT);
    expect(getStockLevel({ current_stock: "0", reorder_level: "5" })).toBe(STOCK_LEVELS.OUT);
  });

  it("marks low stock when stock is at or below reorder level", function () {
    expect(getStockLevel({ current_stock: 5, reorder_level: 5 })).toBe(STOCK_LEVELS.LOW);
    expect(getStockLevel({ current_stock: 2, reorder_level: 5 })).toBe(STOCK_LEVELS.LOW);
  });

  it("marks healthy stock when stock is above reorder level", function () {
    expect(getStockLevel({ current_stock: 10, reorder_level: 5 })).toBe(STOCK_LEVELS.HEALTHY);
  });

  it("treats missing and invalid stock values as out of stock", function () {
    expect(getStockLevel(null)).toBe(STOCK_LEVELS.OUT);
    expect(getStockLevel({ current_stock: "abc", reorder_level: 5 })).toBe(STOCK_LEVELS.OUT);
    expect(getStockLevel({ current_stock: 10, reorder_level: "abc" })).toBe(
      STOCK_LEVELS.HEALTHY
    );
  });
});

describe("filter products", function () {
  const sampleProducts = [
    { product_id: "p1", product_name: "San Miguel Pale Pilsen", barcode: "480001" },
    { product_id: "p2", product_name: "Red Horse 500ml", barcode: "480002" },
    { product_id: "p3", product_name: "Coke Sakto", barcode: null }
  ];

  it("filters products by partial case-insensitive name match", function () {
    const results = filterProducts(sampleProducts, "san");
    expect(results.length).toBe(1);
    expect(results[0].product_id).toBe("p1");
  });

  it("filters products by barcode match", function () {
    const results = filterProducts(sampleProducts, "480002");
    expect(results.length).toBe(1);
    expect(results[0].product_id).toBe("p2");
  });

  it("returns all products when search query is empty or whitespace", function () {
    const results = filterProducts(sampleProducts, "  ");
    expect(results.length).toBe(3);
  });

  it("handles invalid product lists, queries, and numeric barcodes", function () {
    expect(filterProducts(null, "rice")).toEqual([]);
    expect(filterProducts(sampleProducts, 123).length).toBe(3);
    expect(filterProducts([null, sampleProducts[0]], "").length).toBe(1);

    const numericBarcodeProducts = [{ product_id: "p1", product_name: "Rice", barcode: 480001 }];
    const results = filterProducts(numericBarcodeProducts, "480");
    expect(results.length).toBe(1);
    expect(results[0].product_id).toBe("p1");
  });
});

describe("PRODUCT_CATEGORIES", function () {
  it("exports 28 categories starting with 'All'", function () {
    expect(Array.isArray(PRODUCT_CATEGORIES)).toBe(true);
    expect(PRODUCT_CATEGORIES.length).toBe(28);
    expect(PRODUCT_CATEGORIES[0]).toBe("All");
    expect(PRODUCT_CATEGORIES[1]).toBe("Beverages");
    expect(PRODUCT_CATEGORIES[2]).toBe("Snacks");
    expect(PRODUCT_CATEGORIES[3]).toBe("Biscuits & Crackers");
    expect(PRODUCT_CATEGORIES[27]).toBe("Other");
  });
});
