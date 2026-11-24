import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MoreVertical } from "lucide-react";
import { InventoryPage } from "../src/pages/InventoryPage.jsx";
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
});
