// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { api } from "../src/api.js";
import { PosPage } from "../src/pages/PosPage.jsx";

describe("POS product catalog loading", function () {
  let container = null;
  let root = null;

  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
  });

  afterEach(async function () {
    if (root) {
      await act(async function () {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
      container = null;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderPosPage(initialProducts) {
    const props = {
      capabilities: {
        customer_credit: false,
        catalog_extras: false,
        selling_options: false,
        custom_amount_sales: false
      }
    };
    if (initialProducts !== undefined) {
      props.initialProducts = initialProducts;
    }
    root.render(React.createElement(PosPage, props));
  }

  it("shows matching skeleton cards for a slow initial request, then replaces them with products", async function () {
    let resolveProducts;
    const productsRequest = new Promise(function (resolve) {
      resolveProducts = resolve;
    });
    vi.spyOn(api, "listProducts").mockReturnValue(productsRequest);
    vi.spyOn(api, "listLowStockProducts").mockResolvedValue([]);

    await act(async function () {
      renderPosPage();
    });
    expect(container.textContent).not.toContain("No products found");

    await act(async function () {
      vi.advanceTimersByTime(150);
    });
    expect(container.querySelector('[aria-label="Loading products"]')).not.toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"].animate-pulse').length).toBe(6);

    await act(async function () {
      resolveProducts([
        {
          product_id: "prod-load-1",
          product_name: "Canned Sardines",
          base_unit: "Can",
          current_stock: 12,
          selling_price: 25,
          is_active: true
        }
      ]);
      await productsRequest;
    });
    expect(container.querySelector('[aria-label="Loading products"]')).toBeNull();
    expect(container.textContent).toContain("Canned Sardines");
  });

  it("does not flash skeleton cards for a fast response", async function () {
    vi.spyOn(api, "listProducts").mockResolvedValue([]);
    vi.spyOn(api, "listLowStockProducts").mockResolvedValue([]);

    await act(async function () {
      renderPosPage();
    });
    await act(async function () {
      vi.advanceTimersByTime(200);
    });

    expect(container.querySelector('[aria-label="Loading products"]')).toBeNull();
    expect(container.textContent).toContain("No products found");
  });

  it("keeps previously loaded products visible during catalog refreshes", async function () {
    vi.spyOn(api, "listProducts").mockReturnValue(new Promise(function () {}));
    vi.spyOn(api, "listLowStockProducts").mockResolvedValue([]);
    const existingProduct = {
      product_id: "prod-existing",
      product_name: "Existing Product",
      base_unit: "Piece",
      current_stock: 5,
      selling_price: 10,
      is_active: true
    };

    await act(async function () {
      renderPosPage([existingProduct]);
    });
    await act(async function () {
      vi.advanceTimersByTime(200);
    });

    expect(container.textContent).toContain("Existing Product");
    expect(container.querySelector('[aria-label="Loading products"]')).toBeNull();
  });

  it("shows a catalog error instead of the empty state when the initial request fails", async function () {
    vi.spyOn(api, "listProducts").mockRejectedValue(new Error("Catalog unavailable"));
    vi.spyOn(api, "listLowStockProducts").mockResolvedValue([]);

    await act(async function () {
      renderPosPage();
    });

    expect(container.textContent).toContain("Could not load products.");
    expect(container.textContent).toContain("Catalog unavailable");
    expect(container.textContent).not.toContain("No products found");
    expect(container.querySelector('[aria-label="Loading products"]')).toBeNull();
  });
});
