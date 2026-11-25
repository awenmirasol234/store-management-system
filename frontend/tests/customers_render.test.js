import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { CustomersPage } from "../src/pages/CustomersPage.jsx";
import { CustomerModal } from "../src/components/CustomerModal.jsx";
import { RecordPaymentModal } from "../src/components/RecordPaymentModal.jsx";
import { CustomerLedgerModal } from "../src/components/CustomerLedgerModal.jsx";
import { getFilteredNavItems, NAV_ITEMS } from "../src/navigation.js";

describe("Customers & Utang UI components", function () {
  it("renders CustomersPage with summary stat cards and table header", function () {
    const html = renderToString(
      React.createElement(CustomersPage, {
        currentUser: { username: "owner", role: "OWNER" }
      })
    );
    expect(html).toContain("Customer Credit &amp; Utang");
    expect(html).toContain("Total Outstanding Utang");
    expect(html).toContain("Customers with Utang");
    expect(html).toContain("Active Customers");
    expect(html).toContain("Over Credit Limit");
    expect(html).toContain("New Customer");
    expect(html).toContain("Search name, phone, address...");
    expect(html).toContain("md:hidden");
    expect(html).toContain('aria-pressed="true"');
  });

  it("renders CustomerModal in create mode", function () {
    const html = renderToString(
      React.createElement(CustomerModal, {
        open: true,
        customer: null,
        onClose: function () {},
        onSaved: function () {}
      })
    );
    expect(html).toContain("New Customer");
    expect(html).toContain("Full Name");
    expect(html).toContain('class="text-rose-500">*</span>');
    expect(html).toContain("Phone Number");
    expect(html).toContain("Credit Limit (₱)");
    expect(html).toContain("Address / Landmark");
    expect(html).toContain("Create Customer");
  });

  it("renders CustomerModal in edit mode with active toggle", function () {
    const html = renderToString(
      React.createElement(CustomerModal, {
        open: true,
        customer: {
          customer_id: "cust-1",
          full_name: "Aling Nena",
          phone: "0918-111-2222",
          address: "Corner St.",
          credit_limit: 1500,
          current_balance: 350,
          is_active: true
        },
        onClose: function () {},
        onSaved: function () {}
      })
    );
    expect(html).toContain("Edit Customer");
    expect(html).toContain("Save Changes");
    expect(html).toContain("Active Customer");
    expect(html).toContain("Aling Nena");
  });

  it("renders RecordPaymentModal with customer balance and quick amount presets", function () {
    const html = renderToString(
      React.createElement(RecordPaymentModal, {
        open: true,
        customer: {
          customer_id: "cust-1",
          full_name: "Mang Jose",
          current_balance: 450,
          credit_limit: 1000,
          is_active: true
        },
        currentUser: { username: "cashier1", role: "CASHIER" },
        onClose: function () {},
        onPaymentRecorded: function () {}
      })
    );
    expect(html).toContain("Record Utang Payment");
    expect(html).toContain("Mang Jose");
    expect(html).toContain("Current Utang Balance:");
    expect(html).toContain("₱450.00");
    expect(html).toContain("Full Balance");
    expect(html).toContain("₱50");
    expect(html).toContain("₱100");
    expect(html).toContain("₱200");
    expect(html).toContain("Balance After Payment:");
    expect(html).toContain("Remarks / Notes");
  });

  it("renders CustomerLedgerModal with customer details and empty transactions placeholder", function () {
    const html = renderToString(
      React.createElement(CustomerLedgerModal, {
        open: true,
        customer: {
          customer_id: "cust-1",
          full_name: "Maria Dela Cruz",
          current_balance: 120,
          credit_limit: 500,
          is_active: true
        },
        onClose: function () {}
      })
    );
    expect(html).toContain("Customer Credit Ledger");
    expect(html).toContain("Maria Dela Cruz");
    expect(html).toContain("₱120.00");
    expect(html).toContain("₱500.00");
    expect(html).toContain("No charges or payments have been recorded for this customer.");
    expect(html).toContain("Close");
  });

  it("includes Customers page in navigation for both OWNER and CASHIER roles", function () {
    const ownerNav = getFilteredNavItems("OWNER");
    const cashierNav = getFilteredNavItems("CASHIER");

    let ownerHasCustomers = false;
    for (let index = 0; index < ownerNav.length; index++) {
      if (ownerNav[index].key === "customers") {
        ownerHasCustomers = true;
        expect(ownerNav[index].shortLabel).toBe("Utang");
        expect(ownerNav[index].pageTitle).toBe("Customer Credit & Utang");
      }
    }
    expect(ownerHasCustomers).toBe(true);

    let cashierHasCustomers = false;
    for (let index = 0; index < cashierNav.length; index++) {
      if (cashierNav[index].key === "customers") {
        cashierHasCustomers = true;
        expect(cashierNav[index].shortLabel).toBe("Utang");
      }
    }
    expect(cashierHasCustomers).toBe(true);
  });
});
