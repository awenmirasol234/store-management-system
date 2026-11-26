import { describe, expect, it } from "vitest";
import {
  calculatePosGridColumns,
  filterProducts,
  getStockLevel,
  PRODUCT_CATEGORIES,
  STOCK_LEVELS,
  validateImageUrl
} from "../src/products.js";

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
  it("exports 21 categories starting with 'All'", function () {
    expect(Array.isArray(PRODUCT_CATEGORIES)).toBe(true);
    expect(PRODUCT_CATEGORIES.length).toBe(21);
    expect(PRODUCT_CATEGORIES[0]).toBe("All");
    expect(PRODUCT_CATEGORIES[1]).toBe("Beverages");
    expect(PRODUCT_CATEGORIES[2]).toBe("Snacks");
    expect(PRODUCT_CATEGORIES[3]).toBe("Biscuits & Crackers");
    expect(PRODUCT_CATEGORIES[20]).toBe("Cigarettes & Tobacco");
  });
});

describe("validateImageUrl", function () {
  it("allows empty or undefined URLs since the field is optional", function () {
    expect(validateImageUrl("")).toBe("");
    expect(validateImageUrl("   ")).toBe("");
    expect(validateImageUrl(null)).toBe("");
    expect(validateImageUrl(undefined)).toBe("");
  });

  it("accepts valid http and https image URLs", function () {
    expect(validateImageUrl("https://example.com/product.jpg")).toBe("");
    expect(validateImageUrl("http://example.com/product.png")).toBe("");
    expect(
      validateImageUrl("https://images.unsplash.com/photo-1544943910-4c1dc44a0b27?w=400&auto=format")
    ).toBe("");
  });

  it("rejects non-http/https protocols such as javascript, ftp, and file", function () {
    expect(validateImageUrl("javascript:alert(1)")).toBe("URL must start with http:// or https://");
    expect(validateImageUrl("ftp://example.com/file.jpg")).toBe("URL must start with http:// or https://");
    expect(validateImageUrl("file:///C:/image.png")).toBe("URL must start with http:// or https://");
  });

  it("rejects malformed URLs without domains", function () {
    expect(validateImageUrl("https://")).toBe("Please enter a valid web URL");
    expect(validateImageUrl("not-a-valid-url")).toBe("URL must start with http:// or https://");
  });
});

describe("calculatePosGridColumns", function () {
  it("enforces minimum 200px card width on desktop viewports (>= 1024px)", function () {
    // When sidebars are open and available width is 400px: 1 column fits at >= 200px
    expect(calculatePosGridColumns({ containerWidth: 400, viewportWidth: 1024 })).toBe(1);
    // At 412px: 2 columns of 200px each with 12px gap
    expect(calculatePosGridColumns({ containerWidth: 412, viewportWidth: 1024 })).toBe(2);
    // At 620px: drops to 2 columns (2 * 200 + 12 = 412) rather than forcing 3 narrow cards (3 requires 624px)
    expect(calculatePosGridColumns({ containerWidth: 620, viewportWidth: 1024 })).toBe(2);
    // At 624px: exactly 3 columns of 200px
    expect(calculatePosGridColumns({ containerWidth: 624, viewportWidth: 1024 })).toBe(3);
    // At 836px: 4 columns
    expect(calculatePosGridColumns({ containerWidth: 836, viewportWidth: 1024 })).toBe(4);
    // At 1080px: 5 columns
    expect(calculatePosGridColumns({ containerWidth: 1080, viewportWidth: 1280 })).toBe(5);
    // Caps at 6 columns on large containers
    expect(calculatePosGridColumns({ containerWidth: 1600, viewportWidth: 1920 })).toBe(6);
  });

  it("enforces minimum 180px card width on tablet viewports (768px to 1023px)", function () {
    // At 380px: 2 columns of 184px each with 12px gap
    expect(calculatePosGridColumns({ containerWidth: 380, viewportWidth: 800 })).toBe(2);
    // At 550px: drops to 2 columns rather than forcing 3 cards (3 requires 3 * 180 + 24 = 564px)
    expect(calculatePosGridColumns({ containerWidth: 550, viewportWidth: 800 })).toBe(2);
    // At 564px: exactly 3 columns
    expect(calculatePosGridColumns({ containerWidth: 564, viewportWidth: 800 })).toBe(3);
    // Caps at 4 columns on tablet
    expect(calculatePosGridColumns({ containerWidth: 900, viewportWidth: 900 })).toBe(4);
  });

  it("preserves 2-column layout on mobile viewports (< 768px)", function () {
    expect(calculatePosGridColumns({ containerWidth: 360, viewportWidth: 390 })).toBe(2);
    expect(calculatePosGridColumns({ containerWidth: 400, viewportWidth: 420 })).toBe(2);
    expect(calculatePosGridColumns({ containerWidth: 200, viewportWidth: 320 })).toBe(1);
  });

  it("provides sensible responsive fallback when containerWidth is 0 or unmeasured", function () {
    expect(calculatePosGridColumns({ containerWidth: 0, viewportWidth: 1920 })).toBe(6);
    expect(calculatePosGridColumns({ containerWidth: 0, viewportWidth: 1300 })).toBe(5);
    expect(calculatePosGridColumns({ containerWidth: 0, viewportWidth: 1024 })).toBe(4);
    expect(calculatePosGridColumns({ containerWidth: 0, viewportWidth: 800 })).toBe(3);
    expect(calculatePosGridColumns({ containerWidth: 0, viewportWidth: 400 })).toBe(2);
    expect(calculatePosGridColumns(null)).toBe(2);
  });
});
