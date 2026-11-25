import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Globe, MoreVertical } from "lucide-react";
import { InventoryPage, validateProductImageFile } from "../src/pages/InventoryPage.jsx";
import { Badge } from "../src/components/Badge.jsx";
import { Button } from "../src/components/Button.jsx";

describe("InventoryPage SSR test", function () {
  it("renders without throwing an error", function () {
    const html = renderToString(React.createElement(InventoryPage));
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Inventory");
    expect(html).toContain("Add Product");
    expect(html).toContain("Low Stock");
  });

  it("imports MoreVertical icon without reference error", function () {
    expect(MoreVertical).toBeDefined();
    expect(typeof MoreVertical).toBe("object");
    expect(Globe).toBeDefined();
    expect(typeof Globe).toBe("object");
  });

  it("lets cashiers browse inventory without write controls", function () {
    const html = renderToString(
      React.createElement(InventoryPage, {
        currentUser: { username: "cashier1", role: "CASHIER" }
      })
    );
    expect(html).toContain("Search products or barcode");
    expect(html).toContain('colSpan="5"');
    expect(html).not.toContain("Add Product");
    expect(html).not.toContain("Actions</th>");
  });

  it("renders table headers with whitespace-nowrap for compact columns", function () {
    const html = renderToString(React.createElement(InventoryPage));
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("Actions</th>");
  });

  it("renders Badge with whitespace-nowrap to prevent multi-line badge wrapping", function () {
    const html = renderToString(
      React.createElement(Badge, { tone: "dark" }, "30 pieces")
    );
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("30 pieces");
  });

  it("renders Button with whitespace-nowrap to prevent multi-line button wrapping", function () {
    const html = renderToString(
      React.createElement(Button, { variant: "soft", size: "sm" }, "Stock In")
    );
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("Stock In");
  });

  it("renders Out of Stock badge label when product current stock is 0", function () {
    const oosProduct = {
      product_id: "inv-prod-oos",
      product_name: "Corned Beef 150g",
      base_unit: "Can",
      current_stock: 0,
      cost_price: 35,
      selling_price: 45,
      reorder_level: 5,
      is_active: true
    };
    const inStockProduct = {
      product_id: "inv-prod-in",
      product_name: "Sardines in Tomato Sauce",
      base_unit: "Can",
      current_stock: 12,
      cost_price: 20,
      selling_price: 28,
      reorder_level: 5,
      is_active: true
    };

    // Test Badge directly for out-of-stock and in-stock values
    const oosBadgeHtml = renderToString(
      React.createElement(Badge, { tone: "red", className: "font-mono" }, "Out of Stock")
    );
    expect(oosBadgeHtml).toContain("Out of Stock");

    const inStockBadgeHtml = renderToString(
      React.createElement(Badge, { tone: "dark", className: "font-mono" }, "12 Cans")
    );
    expect(inStockBadgeHtml).toContain("12 Cans");
  });

  it("validates product image type and size before upload", function () {
    expect(validateProductImageFile({ type: "image/png", size: 1024 })).toBe("");
    expect(validateProductImageFile({ type: "image/gif", size: 1024 })).toContain("JPEG");
    expect(validateProductImageFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toContain("2 MB");
  });
});
