// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { PosPage } from "../src/pages/PosPage.jsx";

describe("POS Add to Cart button micro-interactions", function () {
  let container = null;
  let root = null;

  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    if (typeof HTMLDialogElement !== "undefined") {
      HTMLDialogElement.prototype.showModal = function () {
        this.open = true;
      };
      HTMLDialogElement.prototype.close = function () {
        this.open = false;
      };
    }
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

  function findAddToCartButton(containerElement) {
    const buttons = containerElement.querySelectorAll("button");
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].textContent.includes("Add to Cart")) {
        return buttons[i];
      }
    }
    return null;
  }

  function findProductButton(containerElement) {
    const buttons = containerElement.querySelectorAll("button");
    for (let i = 0; i < buttons.length; i++) {
      const text = buttons[i].textContent;
      if (text.includes("Add to Cart") || text.includes("Adding...") || text.includes("Added") || text.includes("Failed")) {
        return buttons[i];
      }
    }
    return null;
  }

  it("transitions button to success state on click and auto-resets after 900ms", async function () {
    const product = {
      product_id: "prod-auto-1",
      product_name: "Bear Brand Powdered Milk 33g",
      base_unit: "Sachet",
      current_stock: 5,
      selling_price: 18,
      is_active: true
    };

    let latestCart = [];
    await act(async function () {
      root.render(
        React.createElement(PosPage, {
          initialProducts: [product],
          capabilities: {
            selling_options: false,
            custom_amount_sales: false
          },
          onCartChange: function (nextCart) {
            latestCart = nextCart;
          }
        })
      );
    });

    const addBtn = findAddToCartButton(container);
    expect(addBtn).not.toBeNull();
    expect(addBtn.textContent).toContain("Add to Cart");

    // Click Add to Cart
    await act(async function () {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Successfully added to cart
    expect(latestCart.length).toBe(1);
    const successBtn = findProductButton(container);
    expect(successBtn.textContent).toContain("Added");

    // Advance by 890ms - still in success state
    await act(async function () {
      vi.advanceTimersByTime(890);
    });
    expect(findProductButton(container).textContent).toContain("Added");

    // Advance another 20ms to pass 900ms threshold - should auto-revert to Add to Cart
    await act(async function () {
      vi.advanceTimersByTime(20);
    });
    expect(findProductButton(container).textContent).toContain("Add to Cart");
  });

  it("prevents duplicate additions when card/button is clicked while busy", async function () {
    const product = {
      product_id: "prod-dupe-1",
      product_name: "Lucky Me Pancit Canton",
      base_unit: "Pack",
      current_stock: 10,
      selling_price: 16,
      is_active: true
    };

    let latestCart = [];
    await act(async function () {
      root.render(
        React.createElement(PosPage, {
          initialProducts: [product],
          capabilities: {
            selling_options: false,
            custom_amount_sales: false
          },
          onCartChange: function (nextCart) {
            latestCart = nextCart;
          }
        })
      );
    });

    const addBtn = findAddToCartButton(container);
    expect(addBtn).not.toBeNull();

    // First click adds the item
    await act(async function () {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(latestCart.length).toBe(1);
    expect(latestCart[0].quantity).toBe(1);

    const busyBtn = findProductButton(container);
    expect(busyBtn.textContent).toContain("Added");

    // Immediate second click while in success state should be blocked
    await act(async function () {
      busyBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(latestCart[0].quantity).toBe(1);

    // After reset, click is allowed again
    await act(async function () {
      vi.advanceTimersByTime(910);
    });
    const resetBtn = findProductButton(container);
    expect(resetBtn.textContent).toContain("Add to Cart");

    await act(async function () {
      resetBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(latestCart[0].quantity).toBe(2);
  });

  it("starts multiple fly-to-cart animations without waiting for earlier flyers", async function () {
    const products = [
      {
        product_id: "prod-fast-1",
        product_name: "Fast Product One",
        base_unit: "Piece",
        current_stock: 10,
        selling_price: 10,
        is_active: true
      },
      {
        product_id: "prod-fast-2",
        product_name: "Fast Product Two",
        base_unit: "Piece",
        current_stock: 10,
        selling_price: 20,
        is_active: true
      }
    ];

    await act(async function () {
      root.render(
        React.createElement(PosPage, {
          initialProducts: products,
          capabilities: {
            selling_options: false,
            custom_amount_sales: false
          }
        })
      );
    });

    const addButtons = [];
    const buttons = container.querySelectorAll("button");
    for (let index = 0; index < buttons.length; index++) {
      if (buttons[index].textContent.includes("Add to Cart")) {
        addButtons.push(buttons[index]);
      }
    }
    expect(addButtons.length).toBe(2);

    await act(async function () {
      addButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async function () {
      addButtons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const flyers = container.querySelectorAll("div.pointer-events-none.fixed.inset-0.z-50");
    expect(flyers.length).toBe(2);

    await act(async function () {
      vi.advanceTimersByTime(700);
    });
    expect(container.querySelectorAll("div.pointer-events-none.fixed.inset-0.z-50").length).toBe(0);
  });

  it("transitions button to error state when adding exceeds available stock", async function () {
    const product = {
      product_id: "prod-stock-limited",
      product_name: "Canned Sardines 155g",
      base_unit: "Can",
      current_stock: 1,
      selling_price: 24,
      is_active: true
    };

    let latestCart = [
      {
        key: "prod-stock-limited:base",
        product_id: "prod-stock-limited",
        product_name: "Canned Sardines 155g",
        unit_price: 24,
        selling_price: 24,
        quantity: 1,
        base_quantity_per_unit: 1
      }
    ];

    await act(async function () {
      root.render(
        React.createElement(PosPage, {
          initialProducts: [product],
          initialCartItems: latestCart,
          capabilities: {
            selling_options: false,
            custom_amount_sales: false
          },
          onCartChange: function (nextCart) {
            latestCart = nextCart;
          }
        })
      );
    });

    const addBtn = findAddToCartButton(container);
    expect(addBtn).not.toBeNull();

    // Attempting to add beyond current_stock of 1
    await act(async function () {
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Should transition to Failed and display error message
    const errorBtn = findProductButton(container);
    expect(errorBtn.textContent).toContain("Failed");
    expect(container.textContent).toContain("Requested quantity exceeds available stock");
    expect(latestCart[0].quantity).toBe(1);

    // Auto-resets after 900ms
    await act(async function () {
      vi.advanceTimersByTime(910);
    });
    const resetBtn = findProductButton(container);
    expect(resetBtn.textContent).toContain("Add to Cart");
  });
});
