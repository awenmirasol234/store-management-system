import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { CashierShiftModal } from "../src/components/CashierShiftModal.jsx";

describe("CashierShiftModal rendering & drawer math", function () {
  it("renders Open Shift form with banknote presets when no shift is active", function () {
    const html = renderToString(
      React.createElement(CashierShiftModal, {
        open: true,
        activeShift: null,
        onClose: function () {},
        currentUser: { role: "CASHIER", full_name: "Juan Cashier" }
      })
    );
    expect(html).toContain("Start Shift &amp; Open Drawer");
    expect(html).toContain("Starting Change Fund (₱)");
    expect(html).toContain("₱500.00");
    expect(html).toContain("₱1,000.00");
    expect(html).toContain("₱2,000.00");
    expect(html).toContain("Open Shift &amp; Drawer");
  });

  it("renders Active Cashier Drawer summary with expected cash when shift is open", function () {
    const html = renderToString(
      React.createElement(CashierShiftModal, {
        open: true,
        activeShift: {
          shift_id: "s-1",
          user_id: "u-1",
          opened_at: "2026-11-22T08:00:00.000Z",
          opening_cash: 1000,
          status: "OPEN",
          summary: {
            opening_cash: 1000,
            cash_sales: 2500,
            cash_utang_payments: 500,
            cash_in: 300,
            cash_out: 200,
            cash_refunds: 100,
            expected_cash: 4000
          }
        },
        onClose: function () {},
        currentUser: { role: "CASHIER", full_name: "Juan Cashier" }
      })
    );
    expect(html).toContain("Active Cashier Drawer");
    expect(html).toContain("Expected Cash in Drawer");
    expect(html).toContain("₱4,000.00");
    expect(html).toContain("Starting Fund");
    expect(html).toContain("₱1,000.00");
    expect(html).toContain("Cash Sales");
    expect(html).toContain("+₱2,500.00");
    expect(html).toContain("Utang Collected");
    expect(html).toContain("+₱500.00");
    expect(html).toContain("Add Cash In / Out");
    expect(html).toContain("End Shift &amp; Reconcile");
  });

  it("does not render modal contents when open is false", function () {
    const html = renderToString(
      React.createElement(CashierShiftModal, {
        open: false,
        activeShift: null,
        onClose: function () {}
      })
    );
    expect(html).toBe("");
  });
});
