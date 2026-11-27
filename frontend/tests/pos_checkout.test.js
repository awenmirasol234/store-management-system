// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { PosCheckoutModal } from "../src/components/PosCheckoutModal.jsx";
import { PosPage } from "../src/pages/PosPage.jsx";

describe("PosCheckoutModal two-column redesign", function () {
  const dummyCustomers = [
    {
      customer_id: "cust-1",
      full_name: "Mang Tomas",
      phone: "09171234567",
      current_balance: 350,
      credit_limit: 1000
    },
    {
      customer_id: "cust-2",
      full_name: "Aling Nena",
      phone: "09187654321",
      current_balance: 900,
      credit_limit: 1000
    }
  ];

  const sampleItems = [
    { key: "p1:base", product_id: "p1", product_name: "Rice 1kg", quantity: 2, unit_price: 60, custom_amount: null },
    { key: "p2:base", product_id: "p2", product_name: "Sardines", quantity: 1, unit_price: 25, custom_amount: null },
    { key: "p3:base", product_id: "p3", product_name: "Coffee", quantity: 3, unit_price: 15, custom_amount: null },
    { key: "p4:base", product_id: "p4", product_name: "Sugar", quantity: 1, unit_price: 30, custom_amount: null }
  ];

  let container = null;
  let root = null;

  beforeEach(function setup() {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
    if (root) {
      await act(async function () {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
      container = null;
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders two-column 820px layout, order summary, and smart cash presets", function () {
    const html = renderToString(
      React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "CASH",
        onPaymentMethodChange: function () {},
        items: sampleItems.slice(0, 2),
        subtotal: 145,
        discount: 45,
        total: 100,
        amountPaid: "200",
        onAmountPaidChange: function () {},
        customerId: "",
        onCustomerIdChange: function () {},
        submitting: false,
        onSubmit: function () {},
        customers: dummyCustomers
      })
    );

    expect(html).toContain("Complete Checkout");
    expect(html).toContain("Order Summary");
    expect(html).toContain("Payment Details");
    expect(html).toContain("max-w-[820px]");
    expect(html).toContain("rounded-[18px]");
    expect(html).toContain("sm:h-[476px]");
    expect(html).toContain("2 × Rice 1kg");
    expect(html).toContain("Subtotal");
    expect(html).toContain("Discount");
    expect(html).toContain("Total Due");
    expect(html).toContain("Exact");
    expect(html).toContain("₱200");
    expect(html).toContain("₱500");
    expect(html).toContain("₱1,000");
    expect(html).toContain("Confirm Cash Payment");
    expect(html).not.toContain("Cash Transaction");
    expect(html).not.toContain("Total Charged to Utang");
  });

  it("shows View more items when order has more than 3 lines and expands on click", async function () {
    await act(async function () {
      root.render(
        React.createElement(PosCheckoutModal, {
          open: true,
          onClose: function () {},
          paymentMethod: "CASH",
          onPaymentMethodChange: function () {},
          items: sampleItems,
          subtotal: 220,
          discount: 0,
          total: 220,
          amountPaid: "",
          onAmountPaidChange: function () {},
          customerId: "",
          onCustomerIdChange: function () {},
          submitting: false,
          onSubmit: function () {},
          customers: dummyCustomers
        })
      );
    });

    expect(container.textContent).toContain("Rice 1kg");
    expect(container.textContent).not.toContain("Sugar");
    const viewMoreBtn = Array.from(container.querySelectorAll("button")).find(function (btn) {
      return btn.textContent.includes("View more items");
    });
    expect(viewMoreBtn).toBeDefined();

    await act(async function () {
      viewMoreBtn.click();
    });
    expect(container.textContent).toContain("Sugar");
  });

  it("updates Cash Received via Exact preset, shows Amount Short / Change, and moves focus on Enter without premature submit", async function () {
    const submitSpy = vi.fn(function (event) {
      event.preventDefault();
    });

    function CashHarness() {
      const [amountPaid, setAmountPaid] = useState("");
      return React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "CASH",
        onPaymentMethodChange: function () {},
        items: sampleItems.slice(0, 1),
        subtotal: 120,
        discount: 0,
        total: 120,
        amountPaid: amountPaid,
        onAmountPaidChange: setAmountPaid,
        customerId: "",
        onCustomerIdChange: function () {},
        submitting: false,
        onSubmit: submitSpy,
        customers: dummyCustomers
      });
    }

    await act(async function () {
      root.render(React.createElement(CashHarness));
    });

    const confirmBtn = Array.from(container.querySelectorAll("button")).find(function (btn) {
      return btn.textContent.trim() === "Confirm Cash Payment";
    });
    expect(confirmBtn.disabled).toBe(true);

    const cashInput = container.querySelector('input[placeholder="0.00"]');
    expect(cashInput).not.toBeNull();

    // Enter short amount
    await act(async function () {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(cashInput, "50");
      cashInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.textContent).toContain("Amount Short");
    expect(container.textContent).toContain("₱70.00");
    expect(confirmBtn.disabled).toBe(true);

    // Click Exact preset
    const exactBtn = Array.from(container.querySelectorAll("button")).find(function (btn) {
      return btn.textContent.trim() === "Exact";
    });
    await act(async function () {
      exactBtn.click();
    });
    expect(cashInput.value).toBe("120.00");
    expect(container.textContent).toContain("Change");
    expect(confirmBtn.disabled).toBe(false);

    // Pressing Enter inside cash input focuses Confirm Cash Payment instead of auto-submitting
    await act(async function () {
      cashInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(submitSpy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(confirmBtn);
  });

  it("supports searchable Utang combobox, inline customer creation with prefill, and credit-limit enforcement", async function () {
    vi.stubGlobal("fetch", vi.fn(async function mockFetch(url, options) {
      if (url === "/api/customers" && options && options.method === "POST") {
        const body = JSON.parse(options.body);
        return Response.json({
          data: {
            customer_id: "cust-new",
            full_name: body.full_name,
            phone: body.phone || null,
            credit_limit: body.credit_limit || null,
            current_balance: 0
          }
        }, { status: 201 });
      }
      return Response.json({ data: [] });
    }));

    function UtangHarness() {
      const [customers, setCustomers] = useState(dummyCustomers);
      const [customerId, setCustomerId] = useState("");
      return React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "CREDIT",
        onPaymentMethodChange: function () {},
        items: sampleItems.slice(0, 1),
        subtotal: 200,
        discount: 0,
        total: 200,
        amountPaid: "0",
        onAmountPaidChange: function () {},
        customerId: customerId,
        onCustomerIdChange: setCustomerId,
        submitting: false,
        onSubmit: function (e) { e.preventDefault(); },
        customers: customers,
        onCustomerCreated: function (created) {
          setCustomers([created].concat(customers));
          setCustomerId(created.customer_id);
        }
      });
    }

    await act(async function () {
      root.render(React.createElement(UtangHarness));
    });

    const confirmBtn = Array.from(container.querySelectorAll("button")).find(function (btn) {
      return btn.textContent.includes("Add ₱200.00 to Utang");
    });
    expect(confirmBtn).toBeDefined();
    expect(confirmBtn.disabled).toBe(true);

    const combobox = container.querySelector('input[role="combobox"]');
    await act(async function () {
      combobox.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(combobox, "Aling Rosa");
      combobox.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const newCustomerOption = Array.from(container.querySelectorAll('[role="option"]')).find(function (el) {
      return el.textContent.includes("+ New Customer");
    });
    expect(newCustomerOption).toBeDefined();

    await act(async function () {
      newCustomerOption.click();
    });

    const fullNameInput = Array.from(container.querySelectorAll("input")).find(function (inp) {
      return inp.value === "Aling Rosa";
    });
    expect(fullNameInput).toBeDefined();

    const createBtn = Array.from(container.querySelectorAll("button")).find(function (btn) {
      return btn.textContent.trim() === "Create Customer";
    });
    await act(async function () {
      createBtn.click();
    });

    expect(container.textContent).toContain("Current Utang Balance");
    expect(container.textContent).toContain("New Utang Balance");
    expect(container.textContent).toContain("₱200.00");
    expect(confirmBtn.disabled).toBe(false);
  });

  it("blocks Utang confirmation when credit limit would be exceeded", function () {
    const html = renderToString(
      React.createElement(PosCheckoutModal, {
        open: true,
        onClose: function () {},
        paymentMethod: "CREDIT",
        onPaymentMethodChange: function () {},
        items: sampleItems.slice(0, 1),
        subtotal: 200,
        discount: 0,
        total: 200,
        amountPaid: "0",
        onAmountPaidChange: function () {},
        customerId: "cust-2",
        onCustomerIdChange: function () {},
        submitting: false,
        onSubmit: function () {},
        customers: dummyCustomers
      })
    );

    expect(html).toContain("Exceeds Credit Limit");
    expect(html).toContain("Add ₱200.00 to Utang");
    expect(html).toContain('disabled=""');
  });

  it("prevents duplicate sale submissions in PosPage", async function () {
    let resolveSale;
    vi.stubGlobal("fetch", vi.fn(function mockFetch(url) {
      if (url === "/api/sales") {
        return new Promise(function (resolve) {
          resolveSale = resolve;
        });
      }
      if (url === "/api/products") {
        return Promise.resolve(Response.json({ data: [] }));
      }
      return Promise.resolve(Response.json({ data: [] }));
    }));

    await act(async function () {
      root.render(
        React.createElement(PosPage, {
          initialProducts: [
            { product_id: "p1", product_name: "Rice", base_unit: "Pack", current_stock: 5, selling_price: 50, is_active: true }
          ],
          initialCartItems: [
            { key: "p1:base", product_id: "p1", product_name: "Rice", base_unit: "Pack", unit_price: 50, quantity: 1, base_quantity_per_unit: 1, custom_amount: null }
          ]
        })
      );
    });

    const checkoutTrigger = Array.from(container.querySelectorAll("button")).find(function (btn) {
      return btn.textContent.includes("Checkout");
    });
    await act(async function () {
      checkoutTrigger.click();
    });

    const exactBtn = Array.from(container.querySelectorAll("button")).find(function (btn) {
      return btn.textContent.trim() === "Exact";
    });
    await act(async function () {
      exactBtn.click();
    });

    const form = container.querySelector("dialog form");
    await act(async function () {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const saleCalls = fetch.mock.calls.filter(function ([url]) {
      return url === "/api/sales";
    });
    expect(saleCalls).toHaveLength(1);

    await act(async function () {
      resolveSale(Response.json({
        data: {
          sale: { sale_id: "sale-1", receipt_number: "20261127-0001", total_amount: 50, payment_method: "CASH", amount_paid: 50, change_amount: 0 },
          items: []
        }
      }, { status: 201 }));
    });
  });
});
