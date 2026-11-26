import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { CategoryFilterChips } from "../src/components/CategoryFilterChips.jsx";
import { PRODUCT_CATEGORIES } from "../src/products.js";

describe("CategoryFilterChips component", function () {
  const sampleCategories = [
    { category_id: "cat_beverages", category_name: "Beverages" },
    { category_id: "cat_snacks", category_name: "Snacks" },
    { category_id: "cat_canned", category_name: "Canned Goods" }
  ];

  it("renders without crashing with default props", function () {
    const html = renderToString(React.createElement(CategoryFilterChips));
    expect(html).toContain("All");
  });

  it("renders 'All' chip and provided category objects", function () {
    const html = renderToString(
      React.createElement(CategoryFilterChips, {
        categories: sampleCategories,
        selectedCategoryId: "ALL"
      })
    );
    expect(html).toContain("All");
    expect(html).toContain("Beverages");
    expect(html).toContain("Snacks");
    expect(html).toContain("Canned Goods");
  });

  it("applies active styling to the selected category", function () {
    const html = renderToString(
      React.createElement(CategoryFilterChips, {
        categories: sampleCategories,
        selectedCategoryId: "cat_snacks"
      })
    );
    expect(html).toContain("bg-[#171717]");
    expect(html).toContain("Snacks");
  });

  it("renders with PRODUCT_CATEGORIES string array", function () {
    const html = renderToString(
      React.createElement(CategoryFilterChips, {
        categories: PRODUCT_CATEGORIES,
        selectedCategoryId: "Beverages"
      })
    );
    expect(html).toContain("All");
    expect(html).toContain("Beverages");
    expect(html).toContain("Biscuits &amp; Crackers");
    expect(html).toContain("Instant Food");
    expect(html).toContain("Cigarettes &amp; Tobacco");
    expect(html).not.toContain("Agricultural Supplies");
  });

  it("renders count badges when counts prop is provided", function () {
    const html = renderToString(
      React.createElement(CategoryFilterChips, {
        categories: sampleCategories,
        selectedCategoryId: "cat_beverages",
        counts: {
          ALL: 24,
          cat_beverages: 7,
          cat_snacks: 5
        }
      })
    );
    expect(html).toContain("24");
    expect(html).toContain("7");
    expect(html).toContain("5");
    expect(html).toContain("bg-[#B9F36B]");
  });

  it("can hide the 'All' option when showAll is false", function () {
    const html = renderToString(
      React.createElement(CategoryFilterChips, {
        categories: sampleCategories,
        selectedCategoryId: "cat_beverages",
        showAll: false
      })
    );
    expect(html).not.toContain(">All<");
    expect(html).toContain("Beverages");
  });
});
