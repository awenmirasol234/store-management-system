import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StatCard } from "../src/components/StatCard.jsx";
import { DashboardPage } from "../src/pages/DashboardPage.jsx";
import { PosPage } from "../src/pages/PosPage.jsx";
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
    expect(html).not.toContain("Weekly Activity");
    expect(html).not.toContain("Most Day Active");
  });

  it("renders loading feedback while awaiting the first report", function () {
    const html = renderToString(React.createElement(ReportsPage));
    expect(html).toContain("Reports");
    expect(html).toContain("Loading reports");
    expect(html).not.toContain("No sales in this date range.");
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain("text-[#151515]");
    expect(html).not.toContain("text-blue-600");
    expect(html).not.toContain("text-emerald-600");
    expect(html).not.toContain("text-amber-600");
  });

  it("shows cashiers inventory alerts without owner report cards", function () {
    const html = renderToString(React.createElement(DashboardPage, {
      currentUser: { role: "CASHIER" }
    }));
    expect(html).toContain("Inventory Alerts");
    expect(html).toContain("View Inventory");
    expect(html).not.toContain("Items Sold");
    expect(html).not.toContain("Top Selling Products");
    expect(html).not.toContain("Today&#x27;s Sales");
  });

  it("renders TransactionsPage with shared page, payment filter pills, and empty-state components", function () {
    const html = renderToString(React.createElement(TransactionsPage));
    expect(html).toContain("Transactions");
    expect(html).toContain("No completed sales yet.");
    expect(html).toContain("No transactions recorded yet.");
    expect(html).toContain("Cash");
    expect(html).toContain("Utang");
    expect(html).toContain("Split");
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

  it("uses consistent outer page padding across PageLayout pages and PosPage", function () {
    const dashboardHtml = renderToString(React.createElement(DashboardPage));
    const posHtml = renderToString(React.createElement(PosPage));
    const reportsHtml = renderToString(React.createElement(ReportsPage));

    expect(dashboardHtml).toContain("p-4 sm:p-6 lg:p-7");
    expect(posHtml).toContain("p-4 sm:p-6 lg:p-7");
    expect(reportsHtml).toContain("p-4 sm:p-6 lg:p-7");
    expect(reportsHtml).not.toContain("space-y-4 p-5");
  });

  it("renders StatCard value strictly with text-[#151515] and no color tone classes", function () {
    const defaultHtml = renderToString(
      React.createElement(StatCard, { label: "Sales", value: "₱1,000.00" })
    );
    expect(defaultHtml).toContain("text-[#151515]");
    expect(defaultHtml).not.toContain("text-blue-600");
    expect(defaultHtml).not.toContain("text-emerald-600");
    expect(defaultHtml).not.toContain("text-amber-600");

    const toneHtml = renderToString(
      React.createElement(StatCard, { label: "Profit", value: "₱500.00", tone: "green" })
    );
    expect(toneHtml).toContain("text-[#151515]");
    expect(toneHtml).not.toContain("text-emerald-600");
  });
});
