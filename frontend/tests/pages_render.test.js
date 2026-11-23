import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DashboardPage } from "../src/pages/DashboardPage.jsx";
import { ReportsPage } from "../src/pages/ReportsPage.jsx";
import { TransactionsPage } from "../src/pages/TransactionsPage.jsx";

describe("Refactored page rendering", function () {
  it("renders DashboardPage with stats cards using default text-[#151515] without color tones", function () {
    const html = renderToString(React.createElement(DashboardPage));
    expect(html).toContain("Dashboard");
    expect(html).toContain("Today&#x27;s Sales");
    expect(html).toContain("Today&#x27;s Profit");
    expect(html).toContain("Transactions");
    expect(html).toContain("Items Sold");
    expect(html).toContain("Top Selling Products");
    expect(html).toContain("text-[#151515]");
    expect(html).not.toContain("text-blue-600");
    expect(html).not.toContain("text-emerald-600");
    expect(html).not.toContain("text-amber-600");
    expect(html).not.toContain("Recent Transactions");
  });

  it("renders ReportsPage with shared page and table components", function () {
    const html = renderToString(React.createElement(ReportsPage));
    expect(html).toContain("Reports");
    expect(html).toContain("Daily Sales");
    expect(html).toContain("No sales in this date range.");
    expect(html).toContain("text-[#151515]");
    expect(html).not.toContain("text-blue-600");
    expect(html).not.toContain("text-emerald-600");
    expect(html).not.toContain("text-amber-600");
  });

  it("renders TransactionsPage with shared page and empty-state components", function () {
    const html = renderToString(React.createElement(TransactionsPage));
    expect(html).toContain("Transactions");
    expect(html).toContain("No completed sales yet.");
    expect(html).toContain("No transactions recorded yet.");
  });

  it("renders TransactionsPage with currentUser prop", function () {
    const html = renderToString(
      React.createElement(TransactionsPage, {
        currentUser: { username: "cashier1", role: "CASHIER" }
      })
    );
    expect(html).toContain("Transactions");
    expect(html).toContain("No completed sales yet.");
  });
});
