// @vitest-environment jsdom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.jsx";
import { api, clearAuthToken, getAuthToken, setAuthToken } from "../src/api.js";
import { getManilaIsoDateOffset } from "../src/format.js";
import { DashboardPage } from "../src/pages/DashboardPage.jsx";
import { InventoryPage } from "../src/pages/InventoryPage.jsx";
import { PosPage } from "../src/pages/PosPage.jsx";
import { ReportsPage } from "../src/pages/ReportsPage.jsx";

const product = {
  product_id: "rice",
  product_name: "Rice",
  base_unit: "Pack",
  current_stock: 1,
  cost_price: 8,
  selling_price: 10,
  reorder_level: 1,
  is_active: true
};

const owner = { user_id: "owner-1", username: "owner", full_name: "Store Owner", role: "OWNER" };

let root;
let container;

beforeEach(function setup() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    }
  });
  vi.stubGlobal("fetch", vi.fn(async function listData(url) {
    if (url === "/api/products") {
      return Response.json({ data: [product] });
    }
    return Response.json({ data: [] });
  }));
  // Chrome checks cover native dialog focus. jsdom only needs the open state.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async function cleanup() {
  await act(async function () {
    root.unmount();
  });
  container.remove();
  clearAuthToken();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(element) {
  await act(async function () {
    root.render(element);
  });
}

function button(label, scope = container) {
  return Array.from(scope.querySelectorAll("button")).find(function (element) {
    return element.textContent.trim() === label || element.getAttribute("aria-label") === label;
  });
}

async function click(label, scope) {
  await act(async function () {
    button(label, scope).click();
  });
}

function openDialog() {
  return container.querySelector("dialog[open]");
}

function changeInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function submit(form) {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("frontend review regressions", function () {
  it("shows cashiers stock alerts and populated inventory without write actions", async function () {
    const cashier = { username: "cashier", role: "CASHIER" };
    await render(<DashboardPage currentUser={cashier} />);
    expect(fetch.mock.calls.map(function ([url]) { return url; })).toEqual(["/api/products/low-stock"]);
    expect(container.textContent).toContain("View Inventory");

    await render(<InventoryPage currentUser={cashier} />);
    expect(container.querySelector("tbody").textContent).toContain("Rice");
    expect(button("Stock In")).toBeUndefined();
    expect(button("More actions for Rice")).toBeUndefined();
  });

  it.each([
    { opener: "Stock In", confirm: "Add Stock", path: "/api/inventory/stock-in" },
    { opener: "Adjust Stock", confirm: "Save Adjustment", path: "/api/inventory/adjust" }
  ])("prevents duplicate $opener writes and allows retry after failure", async function (flow) {
    const inventoryFetch = fetch.getMockImplementation();
    let respond;
    fetch.mockImplementation(function (url, options) {
      if (url === flow.path) {
        return new Promise(function (resolve) {
          respond = resolve;
        });
      }
      return inventoryFetch(url, options);
    });
    await render(<InventoryPage currentUser={owner} />);
    if (flow.opener === "Adjust Stock") {
      await click("More actions for Rice");
    }
    await click(flow.opener);
    const dialog = openDialog();
    const form = dialog.querySelector("form");
    await act(async function () {
      submit(form);
      submit(form);
    });
    expect(button(flow.confirm, dialog).disabled).toBe(true);
    expect(fetch.mock.calls.filter(function ([url]) { return url === flow.path; })).toHaveLength(1);
    await act(async function () {
      respond(Response.json({ error: { message: "Write failed" } }, { status: 400 }));
    });
    expect(dialog.querySelector('[role="alert"]').textContent).toContain("Write failed");
    expect(button(flow.confirm, dialog).disabled).toBe(false);
    await act(async function () {
      submit(form);
    });
    expect(fetch.mock.calls.filter(function ([url]) { return url === flow.path; })).toHaveLength(2);
    await act(async function () {
      respond(Response.json({ data: {} }));
    });
    expect(openDialog()).toBeNull();
  });

  it("retries a failed image upload on the saved product", async function () {
    const inventoryFetch = fetch.getMockImplementation();
    const upload = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: { message: "Image service down" } }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: {} }));
    fetch.mockImplementation(async function (url, options) {
      if (url === "/api/products" && options.method === "POST") {
        return Response.json({ data: { product_id: "new-product" } });
      }
      if (url.endsWith("/image")) {
        return upload(url);
      }
      return inventoryFetch(url, options);
    });
    await render(<InventoryPage currentUser={owner} />);
    await click("Add Product");
    const dialog = openDialog();
    const imageInput = dialog.querySelector('input[type="file"]');
    const image = new File(["image"], "rice.png", { type: "image/png" });
    await act(async function () {
      changeInput(dialog.querySelector("input"), "Rice");
      Object.defineProperty(imageInput, "files", { value: [image] });
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async function () {
      submit(dialog.querySelector("form"));
    });
    expect(dialog.querySelector("h2").textContent).toBe("Edit Product");
    expect(dialog.querySelector('[role="alert"]').textContent).toContain("Product saved. Image upload failed");
    await act(async function () {
      submit(dialog.querySelector("form"));
    });
    const productWrites = fetch.mock.calls.filter(function ([url, options]) {
      return url.startsWith("/api/products") && options.method !== "GET" && !url.endsWith("/image");
    });
    expect(productWrites).toHaveLength(1);
    expect(upload.mock.calls).toEqual([["/api/products/new-product/image"], ["/api/products/new-product/image"]]);
    expect(openDialog()).toBeNull();
  });

  it.each([1, 2])("checks overlapping scans against the latest controlled cart with stock %i", async function (stock) {
    const inventoryFetch = fetch.getMockImplementation();
    const lookups = [];
    fetch.mockImplementation(function (url, options) {
      if (url.startsWith("/api/products/barcode/")) {
        return new Promise(function (resolve) {
          lookups.push(resolve);
        });
      }
      return inventoryFetch(url, options);
    });

    function ControlledPos() {
      const [cartItems, setCartItems] = useState([]);
      return <PosPage cartItems={cartItems} onCartChange={setCartItems} />;
    }

    await render(<ControlledPos />);
    const search = container.querySelector('input[aria-label*="Search"]');
    await act(async function () {
      changeInput(search, "123");
    });
    await act(async function () {
      search.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      search.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(lookups).toHaveLength(2);
    await act(async function () {
      changeInput(search, "456");
    });
    await act(async function () {
      for (const resolve of lookups) {
        resolve(Response.json({
          data: { product: Object.assign({}, product, { current_stock: stock }), option: null }
        }));
      }
    });
    const quantity = container.querySelector('input[aria-label="Quantity"]');
    expect(quantity.value).toBe(String(stock));
    expect(search.value).toBe("456");
    if (stock === 1) {
      expect(container.querySelector('[role="alert"]').textContent).toContain("exceeds available stock");
    } else {
      expect(container.querySelector('[role="alert"]')).toBeNull();
    }
  });

  it("exports only the current completed report and ignores superseded responses", async function () {
    const summaries = new Map();
    fetch.mockImplementation(async function (url) {
      const request = new URL(url, "http://localhost");
      const from = request.searchParams.get("from");
      if (request.pathname === "/api/reports/summary") {
        return new Promise(function (resolve) {
          summaries.set(from, resolve);
        });
      }
      if (request.pathname === "/api/reports/daily") {
        return Response.json({ data: [{ date: from, sale_count: 1, gross_sales: 77, profit: 50 }] });
      }
      return Response.json({ data: [] });
    });
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      expect(this.download).toContain(getManilaIsoDateOffset(-6));
      expect(decodeURIComponent(this.href)).toContain('"77"');
    });
    await render(<ReportsPage />);
    expect(button("Export CSV").disabled).toBe(true);
    await click("7 Days");
    await act(async function () {
      summaries.get(getManilaIsoDateOffset(-6))(Response.json({ data: { gross_sales: 77 } }));
    });
    expect(button("Export CSV").disabled).toBe(false);
    await act(async function () {
      summaries.get(getManilaIsoDateOffset(0))(Response.json({ data: { gross_sales: 999 } }));
    });
    expect(container.textContent).not.toContain("999");
    await click("Export CSV");
    expect(download).toHaveBeenCalledTimes(1);

    await click("30 Days");
    expect(button("Export CSV").disabled).toBe(true);
    expect(button("Print or Save as PDF").disabled).toBe(true);

    expect(container.textContent).not.toContain("Daily Sales");
    await act(async function () {
      summaries.get(getManilaIsoDateOffset(-29))(
        Response.json({ error: { message: "Report unavailable" } }, { status: 503 })
      );
    });
    expect(container.querySelector('[role="alert"]').textContent).toContain("Report unavailable");
    expect(button("Export CSV").disabled).toBe(true);
    expect(button("Print or Save as PDF").disabled).toBe(true);

    await click("30 Days");
    await click("Today");
    await act(async function () {
      summaries.get(getManilaIsoDateOffset(-29))(new Response(null, { status: 503 }));
      summaries.get(getManilaIsoDateOffset(0))(Response.json({ data: { gross_sales: 77 } }));
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(button("Export CSV").disabled).toBe(false);
  });

  it("preserves the pending cart and discount when a session expires and the user signs back in", async function () {
    const inventoryFetch = fetch.getMockImplementation();
    let respondToOldShift;
    fetch.mockImplementation(async function (url, options) {
      if (url === "/api/auth/status") {
        return Response.json({ data: { is_setup_required: false } });
      }
      if (url === "/api/auth/me") {
        return Response.json({ data: owner });
      }
      if (url === "/api/auth/login") {
        return Response.json({ data: { user: owner, token: "fresh-token" } });
      }
      if (url === "/api/settings") {
        return new Response(null, { status: 401 });
      }
      if (url.startsWith("/api/shifts/active")) {
        if (options.headers.Authorization === "Bearer expired-token") {
          return new Promise(function (resolve) {
            respondToOldShift = resolve;
          });
        }
        return Response.json({ data: { shift: null } });
      }
      return inventoryFetch(url, options);
    });
    const cart = [{
      key: "rice:base",
      product_id: "rice",
      product_name: "Bag of rice",
      base_unit: "Pack",
      unit_price: 10,
      quantity: 1,
      custom_amount: null
    }];
    setAuthToken("expired-token");
    window.localStorage.setItem("storeflow_pos_cart", JSON.stringify(cart));
    window.localStorage.setItem("storeflow_pos_discount", "2");
    await render(<App initialPage="pos" />);
    expect(container.textContent).toContain("Bag of rice");
    await act(async function () {
      await expect(api.getSettings()).rejects.toThrow("Request failed");
    });
    expect(container.textContent).not.toContain("Point of Sale");
    expect(JSON.parse(window.localStorage.getItem("storeflow_pos_cart"))).toEqual(cart);
    expect(window.localStorage.getItem("storeflow_pos_discount")).toBe("2");
    for (const digit of ["1", "2", "3", "4"]) {
      await click(digit);
    }
    await act(async function () {
      submit(container.querySelector("form"));
    });
    expect(container.textContent).toContain("Bag of rice");
    expect(container.textContent).toContain("₱8.00");
    expect(getAuthToken()).toBe("fresh-token");
    const drawer = container.querySelector("header button[title^='Cash Drawer']");
    expect(drawer.getAttribute("aria-label")).toBe("Cash Drawer (No Shift)");
    await act(async function () {
      respondToOldShift(Response.json({ data: { shift: { shift_id: "old-shift" } } }));
    });
    expect(drawer.getAttribute("aria-label")).toBe("Cash Drawer (No Shift)");
  });
});
