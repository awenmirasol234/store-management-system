import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { BottomNav } from "../src/components/BottomNav.jsx";
import { PosCheckoutModal } from "../src/components/PosCheckoutModal.jsx";
import { App } from "../src/App.jsx";
import { getPageFromPath, getPageTitle, getPathFromPage, isValidPage } from "../src/navigation.js";

describe("Responsive navigation & components", function () {
  it("renders BottomNav with all 5 navigation tabs", function () {
    const html = renderToString(
      React.createElement(BottomNav, {
        activePage: "pos",
        onNavigate: function () {}
      })
    );
    expect(html).toContain("Dashboard");
    expect(html).toContain("POS");
    expect(html).toContain("Inventory");
    expect(html).toContain("Utang");
    expect(html).toContain("History");
    expect(html).toContain("Reports");
    expect(html).toContain("md:hidden");
  });

  it("highlights active tab in BottomNav", function () {
    const html = renderToString(
      React.createElement(BottomNav, {
        activePage: "inventory",
        onNavigate: function () {}
      })
    );
    expect(html).toContain("text-white font-semibold");
    expect(html).toContain("text-blue-400");
  });

  it("renders PosCheckoutModal with ₱1,000 banknote preset and change section", function () {
    const html = renderToString(
      React.createElement(PosCheckoutModal, {
        open: true,
        paymentMethod: "CASH",
        total: 550,
        amountPaid: "1000",
        changePreview: 450,
        customerId: "",
        cashPart: "",
        submitting: false,
        onClose: function () {},
        onSubmit: function () {},
        onAmountPaidChange: function () {}
      })
    );
    expect(html).toContain("₱1,000.00");
    expect(html).toContain("Change");
    expect(html).toContain("₱450.00");
  });

  it("keeps page titles in the shared navigation config", function () {
    expect(getPageTitle("pos")).toBe("Point of Sale");
    expect(getPageTitle("customers")).toBe("Customer Credit & Utang");
    expect(getPageTitle("transactions")).toBe("Transactions");
    expect(getPageTitle("not-found")).toBe("Page Not Found");
    expect(getPageTitle("unknown")).toBe("Dashboard");
  });

  it("resolves paths with getPageFromPath", function () {
    expect(getPageFromPath("/")).toBe(null);
    expect(getPageFromPath("")).toBe(null);
    expect(getPageFromPath("/pos")).toBe("pos");
    expect(getPageFromPath("/inventory")).toBe("inventory");
    expect(getPageFromPath("/customers")).toBe("customers");
    expect(getPageFromPath("/transactions")).toBe("transactions");
    expect(getPageFromPath("/reports")).toBe("reports");
    expect(getPageFromPath("/404")).toBe("not-found");
    expect(getPageFromPath("/not-found")).toBe("not-found");
    expect(getPageFromPath("/non-existent-route")).toBe("not-found");
    expect(getPageFromPath("/settings/nested/deep")).toBe("not-found");
  });

  it("formats URLs with getPathFromPage", function () {
    expect(getPathFromPage("dashboard")).toBe("/");
    expect(getPathFromPage("pos")).toBe("/pos");
    expect(getPathFromPage("inventory")).toBe("/inventory");
    expect(getPathFromPage("not-found")).toBe("/404");
  });

  it("validates pages with isValidPage", function () {
    expect(isValidPage("pos")).toBe(true);
    expect(isValidPage("inventory")).toBe(true);
    expect(isValidPage("reports")).toBe(true);
    expect(isValidPage("invalid")).toBe(false);
    expect(isValidPage("")).toBe(false);
  });

  it("renders App without crashing on initial mount", function () {
    const html = renderToString(React.createElement(App));
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("StoreFlow");
  });
});
