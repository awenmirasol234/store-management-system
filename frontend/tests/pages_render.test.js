import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StatCard } from "../src/components/StatCard.jsx";
import { calculatePercentageTrend } from "../src/format.js";
import { DashboardPage } from "../src/pages/DashboardPage.jsx";
import { PosPage } from "../src/pages/PosPage.jsx";
import { ReportsPage } from "../src/pages/ReportsPage.jsx";
import { TransactionsPage } from "../src/pages/TransactionsPage.jsx";

describe("Refactored page rendering", function () {
  it("renders DashboardPage with stats cards using default text-[#171717] without color tones", function () {
    const html = renderToString(React.createElement(DashboardPage));
    expect(html).toContain("Dashboard");
    expect(html).toContain("Today&#x27;s Sales");
    expect(html).toContain("Today&#x27;s Profit");
    expect(html).toContain("Transactions");
    expect(html).toContain("Items Sold");
    expect(html).toContain("Top Selling Products");
    expect(html).toContain("text-[#171717]");
    expect(html).not.toContain("text-blue-600");
    expect(html).not.toContain("text-emerald-600");
    expect(html).not.toContain("text-amber-600");
    expect(html).not.toContain("Recent Transactions");
    expect(html).not.toContain("Weekly Activity");
    expect(html).not.toContain("Most Day Active");
  });

  it("does not render a reports button in the top selling products section", function () {
    const html = renderToString(React.createElement(DashboardPage, {
      currentUser: { role: "OWNER" },
      onNavigate: function () {}
    }));
    expect(html).toContain("Top Selling Products");
    expect(html).toContain("Top 5");
    expect(html).not.toContain("Reports");
  });

  it("renders loading feedback while awaiting the first report", function () {
    const html = renderToString(React.createElement(ReportsPage));
    expect(html).toContain("Reports");
    expect(html).toContain("Loading reports");
    expect(html).not.toContain("No sales in this date range.");
    expect(html).toContain('role="tablist"');
    expect(html).toContain('shrink-0 items-center overflow-x-auto');
    expect(html).toContain('role="tab"');
    expect(html).toContain("text-[#171717]");
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

  it("renders StatCard value strictly with text-[#171717] and no color tone classes", function () {
    const defaultHtml = renderToString(
      React.createElement(StatCard, { label: "Sales", value: "₱1,000.00" })
    );
    expect(defaultHtml).toContain("text-[#171717]");
    expect(defaultHtml).not.toContain("text-blue-600");
    expect(defaultHtml).not.toContain("text-emerald-600");
    expect(defaultHtml).not.toContain("text-amber-600");

    const toneHtml = renderToString(
      React.createElement(StatCard, { label: "Profit", value: "₱500.00", tone: "green" })
    );
    expect(toneHtml).toContain("text-[#171717]");
    expect(toneHtml).not.toContain("text-emerald-600");
  });

  it("calculates percentage trend accurately across positive, negative, zero, and boundary cases", function () {
    expect(calculatePercentageTrend(125, 100)).toEqual({
      direction: "up",
      percentage: 25,
      label: "+25%"
    });
    expect(calculatePercentageTrend(80, 100)).toEqual({
      direction: "down",
      percentage: 20,
      label: "−20%"
    });
    expect(calculatePercentageTrend(112.5, 100)).toEqual({
      direction: "up",
      percentage: 12.5,
      label: "+12.5%"
    });
    expect(calculatePercentageTrend(50, 50)).toEqual({
      direction: "neutral",
      percentage: 0,
      label: "0%"
    });
    expect(calculatePercentageTrend(0, 0)).toEqual({
      direction: "neutral",
      percentage: 0,
      label: "0%"
    });
    expect(calculatePercentageTrend(250, 0)).toEqual({
      direction: "up",
      percentage: 100,
      label: "+100%"
    });
    expect(calculatePercentageTrend(-50, -100)).toEqual({
      direction: "up",
      percentage: 50,
      label: "+50%"
    });
    expect(calculatePercentageTrend(null, 100)).toBeNull();
    expect(calculatePercentageTrend(100, undefined)).toBeNull();
  });

  it("renders StatCard Trend Indicator Pill for positive, negative, and zero trends", function () {
    const upHtml = renderToString(
      React.createElement(StatCard, {
        label: "Today's Sales",
        value: "₱1,250.00",
        trend: { direction: "up", percentage: 25, label: "+25%" },
        trendLabel: "Compared to yesterday"
      })
    );
    expect(upHtml).toContain("+25%");
    expect(upHtml).toContain("bg-emerald-50 text-emerald-700 border-emerald-200");
    expect(upHtml).toContain('aria-label="Compared to yesterday: +25%"');
    expect(upHtml).toContain("<svg");

    const downHtml = renderToString(
      React.createElement(StatCard, {
        label: "Transactions",
        value: "8",
        trend: { direction: "down", percentage: 20, label: "−20%" }
      })
    );
    expect(downHtml).toContain("−20%");
    expect(downHtml).toContain("bg-rose-50 text-rose-700 border-rose-200");

    const neutralHtml = renderToString(
      React.createElement(StatCard, {
        label: "Items Sold",
        value: "0",
        trend: { direction: "neutral", percentage: 0, label: "0%" }
      })
    );
    expect(neutralHtml).toContain("0%");
    expect(neutralHtml).toContain("bg-[#EEEEED] text-[#777777] border-[#E9E9E9]");
  });
});
