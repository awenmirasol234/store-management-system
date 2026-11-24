import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PosPage } from "../src/pages/PosPage.jsx";
import { formatPeso, formatQuantity } from "../src/format.js";

describe("POS cart preservation across navigation", function () {
  const sampleItems = [
    {
      key: "prod-1:base",
      product_id: "prod-1",
      product_name: "Century Tuna 180g",
      option_id: null,
      option_label: "Base Unit",
      unit_price: 45,
      quantity: 3,
      base_unit: "Can",
      base_quantity_per_unit: 1,
      image_url: null,
      custom_amount: null
    },
    {
      key: "prod-2:base",
      product_id: "prod-2",
      product_name: "Bear Brand Milk 33g",
      option_id: null,
      option_label: "Base Unit",
      unit_price: 16,
      quantity: 5,
      base_unit: "Sachet",
      base_quantity_per_unit: 1,
      image_url: null,
      custom_amount: null
    }
  ];

  it("renders cart items and quantities when mounted with controlled cartItems", function () {
    const html = renderToString(
      React.createElement(PosPage, {
        cartItems: sampleItems,
        orderDiscount: 10
      })
    );

    // Both items must be present
    expect(html).toContain("Century Tuna 180g");
    expect(html).toContain("Bear Brand Milk 33g");

    // Quantities must be rendered
    expect(html).toContain('value="3"');
    expect(html).toContain('value="5"');

    // Subtotals: 3 * 45 = 135, 5 * 16 = 80
    expect(html).toContain(formatPeso(135));
    expect(html).toContain(formatPeso(80));

    // Cart total check: 135 + 80 = 215, minus 10 discount = 205
    expect(html).toContain(formatPeso(205));
  });

  it("retains all products and quantities upon remounting PosPage (simulating navigation away and back)", function () {
    // 1. Initial render on POS page
    let activeCart = sampleItems;
    const firstRender = renderToString(
      React.createElement(PosPage, {
        cartItems: activeCart,
        orderDiscount: 0
      })
    );
    expect(firstRender).toContain("Century Tuna 180g");
    expect(firstRender).toContain('value="3"');

    // 2. User navigates to another page (PosPage unmounted, activeCart retained in parent App)
    // Simulated state change in parent: cashier added another item while on POS before leaving
    const updatedCart = activeCart.concat([
      {
        key: "prod-3:base",
        product_id: "prod-3",
        product_name: "San Miguel Pale Pilsen",
        option_id: null,
        option_label: "Base Unit",
        unit_price: 65,
        quantity: 2,
        base_unit: "Bottle",
        base_quantity_per_unit: 1,
        image_url: null,
        custom_amount: null
      }
    ]);

    // 3. User navigates back to POS page (PosPage remounts with retained activeCart)
    const secondRender = renderToString(
      React.createElement(PosPage, {
        cartItems: updatedCart,
        orderDiscount: 0
      })
    );

    // All original and updated items must be rendered with their exact quantities
    expect(secondRender).toContain("Century Tuna 180g");
    expect(secondRender).toContain('value="3"');
    expect(secondRender).toContain("Bear Brand Milk 33g");
    expect(secondRender).toContain('value="5"');
    expect(secondRender).toContain("San Miguel Pale Pilsen");
    expect(secondRender).toContain('value="2"');

    // Total: 135 + 80 + 130 = 345
    expect(secondRender).toContain(formatPeso(345));
  });

  it("renders empty state only when cartItems is empty", function () {
    const html = renderToString(
      React.createElement(PosPage, {
        cartItems: [],
        orderDiscount: 0
      })
    );
    expect(html).toContain("Tap a product or scan a barcode");
    expect(html).not.toContain("Century Tuna");
  });
});
