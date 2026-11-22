import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { COMMON_BASE_UNITS } from "../src/products.js";
import { Select } from "../src/components/Select.jsx";
import { InventoryPage } from "../src/pages/InventoryPage.jsx";

const EXPECTED_28_UNITS = [
  "Piece (pc)",
  "Pack",
  "Box",
  "Bottle",
  "Can",
  "Sachet",
  "Kilogram (kg)",
  "Gram (g)",
  "Liter (L)",
  "Milliliter (mL)",
  "Meter (m)",
  "Roll",
  "Dozen (doz)",
  "Pair",
  "Set",
  "Bundle",
  "Sack",
  "Case",
  "Carton",
  "Tray",
  "Gallon",
  "Pouch",
  "Tube",
  "Jar",
  "Bar",
  "Stick",
  "Ream",
  "Sheet"
];

describe("Common base units configuration and rendering", function () {
  it("defines exactly the 28 common retail base units in the required order", function () {
    expect(COMMON_BASE_UNITS.length).toBe(28);
    for (let index = 0; index < EXPECTED_28_UNITS.length; index = index + 1) {
      expect(COMMON_BASE_UNITS[index]).toBe(EXPECTED_28_UNITS[index]);
    }
  });

  it("renders InventoryPage with product list and unit column", function () {
    const html = renderToString(React.createElement(InventoryPage));
    expect(html).toContain("Add Product");
    expect(html).toContain("Unit");
  });

  it("renders Base Unit select dropdown with all common units", function () {
    const html = renderToString(
      React.createElement(
        Select,
        {
          label: "Base Unit",
          value: "Piece (pc)",
          onChange: function () {}
        },
        COMMON_BASE_UNITS.map(function (unitName) {
          return React.createElement("option", { key: unitName, value: unitName }, unitName);
        })
      )
    );
    expect(html).toContain("Base Unit");
    expect(html).toContain("Piece (pc)");
    expect(html).toContain("Kilogram (kg)");
    expect(html).toContain("Liter (L)");
    expect(html).toContain("Sachet");
    expect(html).toContain("Dozen (doz)");
  });
});
