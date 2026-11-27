// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { api } from "../src/api.js";
import { CustomersPage } from "../src/pages/CustomersPage.jsx";
import { DashboardPage } from "../src/pages/DashboardPage.jsx";
import { InventoryPage } from "../src/pages/InventoryPage.jsx";
import { ReportsPage } from "../src/pages/ReportsPage.jsx";
import { SettingsPage } from "../src/pages/SettingsPage.jsx";
import { TransactionsPage } from "../src/pages/TransactionsPage.jsx";

describe("Page loading skeletons", function () {
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

  function unresolvedRequest() {
    return new Promise(function () {});
  }

  async function renderAndWait(Page, props, label) {
    await act(async function () {
      root.render(React.createElement(Page, props));
    });
    await act(async function () {
      vi.advanceTimersByTime(160);
    });
    expect(container.querySelector('[role="status"][aria-label="' + label + '"]')).not.toBeNull();
  }

  it("shows a dashboard skeleton during the initial data request", async function () {
    vi.spyOn(api, "getReportsSummary").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "listLowStockProducts").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "getTopProducts").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "getDailyReport").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "getCategorySalesReport").mockReturnValue(unresolvedRequest());

    await renderAndWait(
      DashboardPage,
      { currentUser: { role: "OWNER" } },
      "Loading dashboard"
    );
  });

  it("shows inventory skeletons during the initial data request", async function () {
    vi.spyOn(api, "listProducts").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "listUnits").mockReturnValue(unresolvedRequest());

    await renderAndWait(
      InventoryPage,
      { capabilities: { catalog_extras: false } },
      "Loading inventory"
    );
  });

  it("shows customer skeletons during the initial data request", async function () {
    vi.spyOn(api, "listCustomers").mockReturnValue(unresolvedRequest());

    await renderAndWait(
      CustomersPage,
      { currentUser: { role: "OWNER" } },
      "Loading customers"
    );
  });

  it("shows the customer empty state after a successful empty response", async function () {
    vi.spyOn(api, "listCustomers").mockResolvedValue([]);

    await act(async function () {
      root.render(
        React.createElement(CustomersPage, {
          currentUser: { role: "OWNER" }
        })
      );
    });

    expect(container.textContent).toContain("No customers match the current filter");
    expect(container.querySelector('[aria-label="Loading customers"]')).toBeNull();
  });

  it("shows transaction skeletons during the initial data request", async function () {
    vi.spyOn(api, "listSales").mockReturnValue(unresolvedRequest());

    await renderAndWait(TransactionsPage, {}, "Loading transaction list");
  });

  it("shows report skeletons while the selected range is loading", async function () {
    vi.spyOn(api, "getReportsSummary").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "getDailyReport").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "getTopProducts").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "getCategorySalesReport").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "getStockMovementsReport").mockReturnValue(unresolvedRequest());
    vi.spyOn(api, "getTransactionsReport").mockReturnValue(unresolvedRequest());

    await renderAndWait(ReportsPage, {}, "Loading reports");
  });

  it("shows settings skeletons during the initial settings request", async function () {
    vi.spyOn(api, "getSettings").mockReturnValue(unresolvedRequest());

    await renderAndWait(
      SettingsPage,
      { currentUser: { username: "owner" } },
      "Loading settings"
    );
  });

  it("does not show default settings as editable after the settings request fails", async function () {
    vi.spyOn(api, "getSettings").mockRejectedValue(new Error("Settings unavailable"));

    await act(async function () {
      root.render(
        React.createElement(SettingsPage, {
          currentUser: { username: "owner" }
        })
      );
    });

    expect(container.textContent).toContain("Settings unavailable");
    expect(container.querySelector("#settings-form")).toBeNull();
    expect(container.querySelector('[aria-label="Loading settings"]')).toBeNull();
  });
});
