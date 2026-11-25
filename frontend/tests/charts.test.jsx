import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { LineChart } from "../src/components/LineChart.jsx";
import { PieChart } from "../src/components/PieChart.jsx";
import { DashboardPage } from "../src/pages/DashboardPage.jsx";

describe("LineChart component", function () {
  it("renders empty state when data is empty", function () {
    const html = renderToString(React.createElement(LineChart, { data: [] }));
    expect(html).toContain("No trend data available for this range.");
    expect(html).not.toContain("<svg");
  });

  it("renders custom empty message when provided", function () {
    const html = renderToString(
      React.createElement(LineChart, {
        data: [],
        emptyMessage: "Custom empty message"
      })
    );
    expect(html).toContain("Custom empty message");
  });

  it("renders SVG with sales and profit lines, gridlines, and legend when data is present", function () {
    const mockData = [
      {
        label: "Nov 19",
        shortLabel: "11-19",
        fullDate: "Tue, Nov 19",
        sales: 1500,
        profit: 600,
        meta: "10 orders"
      },
      {
        label: "Nov 20",
        shortLabel: "11-20",
        fullDate: "Wed, Nov 20",
        sales: 2400,
        profit: 950,
        meta: "18 orders"
      },
      {
        label: "Nov 21",
        shortLabel: "11-21",
        fullDate: "Thu, Nov 21",
        sales: 1800,
        profit: 720,
        meta: "14 orders"
      }
    ];

    const html = renderToString(React.createElement(LineChart, { data: mockData }));

    // Legend & labels
    expect(html).toContain("Gross Sales");
    expect(html).toContain("Net Profit");
    expect(html).toContain("Sales:");
    expect(html).toContain("Profit:");

    // SVG elements
    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 500 200"');
    expect(html).toContain('stroke="#171717"');
    expect(html).toContain('stroke="#B9F36B"');
    expect(html).toContain("sales-gradient");
    expect(html).toContain("profit-gradient");

    // X-axis labels
    expect(html).toContain("11-19");
    expect(html).toContain("11-20");
    expect(html).toContain("11-21");

    // Total calculations
    expect(html).toContain("₱5,700.00"); // 1500 + 2400 + 1800
    expect(html).toContain("₱2,270.00"); // 600 + 950 + 720
  });

  it("handles single-point data gracefully without dividing by zero", function () {
    const singlePoint = [
      {
        label: "Today",
        shortLabel: "Today",
        sales: 500,
        profit: 200
      }
    ];

    const html = renderToString(React.createElement(LineChart, { data: singlePoint }));
    expect(html).toContain("<svg");
    expect(html).toContain("Today");
    expect(html).toContain("₱500.00");
  });
});

describe("PieChart component", function () {
  it("renders empty state when data is empty or all values are zero", function () {
    const emptyHtml = renderToString(React.createElement(PieChart, { data: [] }));
    expect(emptyHtml).toContain("No distribution data available.");

    const zeroHtml = renderToString(
      React.createElement(PieChart, {
        data: [{ label: "Beverages", value: 0 }]
      })
    );
    expect(zeroHtml).toContain("No distribution data available.");
  });

  it("renders donut chart with slices, center total, and legend when data is present", function () {
    const mockData = [
      { label: "Beverages", value: 3000, count: 50 },
      { label: "Snacks", value: 1500, count: 35 },
      { label: "Canned Goods", value: 500, count: 12 }
    ];

    const html = renderToString(React.createElement(PieChart, { data: mockData }));

    // Center total badge (total = 5000)
    expect(html).toContain("Total");
    expect(html).toContain("₱5,000.00");
    expect(html).toContain("3 categories");

    // Legend rows and percentages
    expect(html).toContain("Beverages");
    expect(html).toContain("₱3,000.00");
    expect(html).toContain("60%"); // 3000 / 5000

    expect(html).toContain("Snacks");
    expect(html).toContain("₱1,500.00");
    expect(html).toContain("30%"); // 1500 / 5000

    expect(html).toContain("Canned Goods");
    expect(html).toContain("₱500.00");
    expect(html).toContain("10%"); // 500 / 5000

    // SVG elements
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
  });

  it("handles single-category data without path collision", function () {
    const singleData = [{ label: "All Items", value: 1000 }];
    const html = renderToString(React.createElement(PieChart, { data: singleData }));

    expect(html).toContain("All Items");
    expect(html).toContain("₱1,000.00");
    expect(html).toContain("100%");
    expect(html).toContain("<svg");
  });
});

describe("DashboardPage integration with charts", function () {
  it("renders chart sections and controls when viewed by an OWNER", function () {
    const html = renderToString(
      React.createElement(DashboardPage, {
        currentUser: { username: "owner", role: "OWNER" },
        onNavigate: function () {}
      })
    );

    // Page & KPI Cards
    expect(html).toContain("Dashboard");
    expect(html).toContain("Today&#x27;s Sales");
    expect(html).toContain("Today&#x27;s Profit");

    // Chart cards
    expect(html).toContain("Sales &amp; Profit Trend");
    expect(html).toContain("Daily performance over time");
    expect(html).toContain("Sales Distribution");
    expect(html).toContain("Revenue breakdown by segment");

    // Controls
    expect(html).toContain("7 Days");
    expect(html).toContain("30 Days");
    expect(html).toContain("Category");
    expect(html).toContain("Payment");

    // Operational lists
    expect(html).toContain("Top Selling Products");
    expect(html).toContain("Inventory Alerts");
  });

  it("hides financial charts and KPI cards when viewed by a CASHIER", function () {
    const html = renderToString(
      React.createElement(DashboardPage, {
        currentUser: { username: "cashier1", role: "CASHIER" },
        onNavigate: function () {}
      })
    );

    // Cashier view must NOT contain financial metrics or charts
    expect(html).not.toContain("Sales &amp; Profit Trend");
    expect(html).not.toContain("Sales Distribution");
    expect(html).not.toContain("Today&#x27;s Sales");
    expect(html).not.toContain("Today&#x27;s Profit");

    // Cashier sees only operational inventory alerts
    expect(html).toContain("Inventory Alerts");
    expect(html).toContain("View Inventory");
  });
});
