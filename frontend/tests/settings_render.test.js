import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SettingsPage } from "../src/pages/SettingsPage.jsx";
import { ReceiptView } from "../src/components/ReceiptView.jsx";
import { getFilteredNavItems, getPageFromPath, getPageTitle } from "../src/navigation.js";
import { App } from "../src/App.jsx";
import { api } from "../src/api.js";

describe("Settings Page & Navigation Integration", function () {
  it("filters settings navigation item by role", function () {
    const ownerNav = getFilteredNavItems("OWNER");
    const ownerKeys = ownerNav.map(function (item) {
      return item.key;
    });
    expect(ownerKeys).toContain("settings");

    const cashierNav = getFilteredNavItems("CASHIER");
    const cashierKeys = cashierNav.map(function (item) {
      return item.key;
    });
    expect(cashierKeys).not.toContain("settings");

    expect(getPageTitle("settings")).toBe("Store Settings");
    expect(getPageFromPath("/settings")).toBe("settings");
  });

  it("renders SettingsPage layout and all setting sections", function () {
    const html = renderToString(
      React.createElement(SettingsPage, {
        currentUser: {
          user_id: "u1",
          username: "storeowner",
          full_name: "Owner Maria",
          role: "OWNER"
        }
      })
    );

    expect(html).toContain("Store Settings");
    expect(html).toContain("Store Profile");
    expect(html).toContain("Receipt &amp; Thermal Printing");
    expect(html).toContain("POS &amp; Inventory Preferences");
    expect(html).toContain("Staff &amp; Access");
    expect(html).toContain("Manage Staff");
    expect(html).toContain("Database &amp; Disaster Recovery");
    expect(html).toContain("Download Backup");
    expect(html).toContain("Save Settings");
    const matches = html.match(/Save Settings/g) || [];
    expect(matches.length).toBe(1);
    expect(html).toContain("Thermal Receipt Preview");
  });

  it("renders ReceiptView with dynamic store profile and footer", function () {
    const mockSale = {
      sale_id: "s1",
      receipt_number: "00099",
      created_at: "2026-11-23T10:00:00Z",
      created_by: "cashier1",
      cashier_name: "Ate Lorna",
      subtotal_amount: 100,
      discount_amount: 10,
      total_amount: 90,
      payment_method: "CASH",
      amount_paid: 100,
      change_amount: 10,
      credit_amount: 0
    };

    const mockItems = [
      {
        sale_item_id: "si1",
        option_name_snapshot: "Nescafe Classic 50g",
        unit_price: 45,
        quantity: 2,
        subtotal: 90
      }
    ];

    const mockSettings = {
      store_name: "Mang Juan Superette",
      tagline: "Always Fresh & Affordable",
      address: "123 Mabini St., Pasig",
      phone: "0918-765-4321",
      tax_number: "TIN-111-222-333",
      receipt_header: "Salamat po sa pagtangkilik!",
      receipt_footer: "No return without receipt. 7 days warranty.",
      show_cashier_on_receipt: 1
    };

    const html = renderToString(
      React.createElement(ReceiptView, {
        sale: mockSale,
        items: mockItems,
        storeSettings: mockSettings
      })
    );

    expect(html).toContain("Mang Juan Superette");
    expect(html).toContain("Always Fresh &amp; Affordable");
    expect(html).toContain("123 Mabini St., Pasig");
    expect(html).toContain("Tel: 0918-765-4321");
    expect(html).toContain("TIN: TIN-111-222-333");
    expect(html).toContain("Salamat po sa pagtangkilik!");
    expect(html).toContain("Cashier: Ate Lorna");
    expect(html).toContain("No return without receipt. 7 days warranty.");
  });

  it("omits cashier on receipt when show_cashier_on_receipt is 0", function () {
    const mockSale = {
      sale_id: "s1",
      receipt_number: "00099",
      created_at: "2026-11-23T10:00:00Z",
      cashier_name: "Ate Lorna",
      subtotal_amount: 50,
      total_amount: 50,
      payment_method: "CASH",
      amount_paid: 50,
      change_amount: 0
    };

    const html = renderToString(
      React.createElement(ReceiptView, {
        sale: mockSale,
        items: [],
        storeSettings: {
          store_name: "Duane Store",
          show_cashier_on_receipt: 0
        }
      })
    );

    expect(html).not.toContain("Cashier:");
  });

  it("ReceiptView fetches settings when storeSettings prop is omitted", async function () {
    const getSettingsSpy = vi.spyOn(api, "getSettings").mockResolvedValue({
      store_name: "Tindahan Ni Aling Nena"
    });
    const mockSale = {
      sale_id: "s1",
      receipt_number: "00099",
      created_at: "2026-11-23T10:00:00Z",
      cashier_name: "Ate Lorna",
      subtotal_amount: 50,
      total_amount: 50,
      payment_method: "CASH",
      amount_paid: 50,
      change_amount: 0
    };
    const html = renderToString(
      React.createElement(ReceiptView, {
        sale: mockSale,
        items: []
      })
    );
    expect(html).toContain("DUANE STORE");
    getSettingsSpy.mockRestore();
  });
});
