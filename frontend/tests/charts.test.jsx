import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  buildDailySeries,
  groupTopItems,
  pickTickIndexes
} from "../src/chart-data.js";
import { LineChart } from "../src/components/LineChart.jsx";
import { PieChart } from "../src/components/PieChart.jsx";
import { DashboardPage } from "../src/pages/DashboardPage.jsx";

describe("chart-data helpers", function () {
  describe("buildDailySeries", function () {
    it("fills missing calendar days with zero-value points in oldest-first order", function () {
      const rows = [
        { date: "2026-11-20", gross_sales: 300, profit: 120, sale_count: 2 },
        { date: "2026-11-18", gross_sales: 150, profit: 50, sale_count: 1 }
      ];

      const series = buildDailySeries({
        rows: rows,
        startDate: "2026-11-18",
        endDate: "2026-11-20"
      });

      expect(series).toHaveLength(3);
      // Day 1: Nov 18 (has row)
      expect(series[0].date).toBe("2026-11-18");
      expect(series[0].sales).toBe(150);
      expect(series[0].profit).toBe(50);
      expect(series[0].saleCount).toBe(1);

      // Day 2: Nov 19 (missing in rows, filled with 0)
      expect(series[1].date).toBe("2026-11-19");
      expect(series[1].sales).toBe(0);
      expect(series[1].profit).toBe(0);
      expect(series[1].saleCount).toBe(0);

      // Day 3: Nov 20 (has row)
      expect(series[2].date).toBe("2026-11-20");
      expect(series[2].sales).toBe(300);
      expect(series[2].profit).toBe(120);
      expect(series[2].saleCount).toBe(2);
    });

    it("handles an empty rows list by filling all dates with zeros", function () {
      const series = buildDailySeries({
        rows: [],
        startDate: "2026-11-01",
        endDate: "2026-11-03"
      });

      expect(series).toHaveLength(3);
      expect(series[0].date).toBe("2026-11-01");
      expect(series[0].sales).toBe(0);
      expect(series[1].date).toBe("2026-11-02");
      expect(series[1].sales).toBe(0);
      expect(series[2].date).toBe("2026-11-03");
      expect(series[2].sales).toBe(0);
    });

    it("handles single-day ranges correctly", function () {
      const series = buildDailySeries({
        rows: [{ date: "2026-11-20", gross_sales: 500, profit: 200, sale_count: 5 }],
        startDate: "2026-11-20",
        endDate: "2026-11-20"
      });

      expect(series).toHaveLength(1);
      expect(series[0].date).toBe("2026-11-20");
      expect(series[0].sales).toBe(500);
    });

    it("returns an empty array when startDate is greater than endDate or invalid", function () {
      expect(
        buildDailySeries({
          rows: [],
          startDate: "2026-11-25",
          endDate: "2026-11-20"
        })
      ).toEqual([]);

      expect(buildDailySeries(null)).toEqual([]);
    });
  });

  describe("pickTickIndexes", function () {
    it("handles 0, 1, and fewer items than maxTicks", function () {
      expect(pickTickIndexes({ count: 0, maxTicks: 5 })).toEqual([]);
      expect(pickTickIndexes({ count: 1, maxTicks: 5 })).toEqual([0]);
      expect(pickTickIndexes({ count: 3, maxTicks: 5 })).toEqual([0, 1, 2]);
    });

    it("always includes first (0) and last index, respecting maxTicks limit", function () {
      const ticks = pickTickIndexes({ count: 30, maxTicks: 6 });
      expect(ticks.length).toBeLessThanOrEqual(6);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBe(29);

      // Strictly increasing order
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
      }
    });

    it("handles 7 days with maxTicks 6", function () {
      const ticks = pickTickIndexes({ count: 7, maxTicks: 6 });
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBe(6);
    });
  });

  describe("groupTopItems", function () {
    it("does not create an Other item when items count is within limit", function () {
      const items = [
        { label: "Beverages", value: 500 },
        { label: "Snacks", value: 300 }
      ];
      const grouped = groupTopItems({ items: items, limit: 5 });
      expect(grouped).toHaveLength(2);
      expect(grouped[0].label).toBe("Beverages");
      expect(grouped[1].label).toBe("Snacks");
    });

    it("groups excess items into one Other item and drops zero values", function () {
      const items = [
        { label: "Item A", value: 100 },
        { label: "Item B", value: 90 },
        { label: "Item C", value: 80 },
        { label: "Item D", value: 70 },
        { label: "Item E", value: 60 },
        { label: "Item F", value: 50 },
        { label: "Item G", value: 40 },
        { label: "Item Zero", value: 0 }
      ];

      const grouped = groupTopItems({ items: items, limit: 5, otherLabel: "Other" });
      expect(grouped).toHaveLength(6); // 5 top + 1 Other
      expect(grouped[0].label).toBe("Item A");
      expect(grouped[4].label).toBe("Item E");

      const otherItem = grouped[5];
      expect(otherItem.label).toBe("Other");
      expect(otherItem.value).toBe(90); // 50 + 40
      expect(otherItem.color).toBe("#777777");
    });
  });
});

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

  it("renders responsive SVG shapes, non-scaling stroke, and HTML labels", function () {
    const mockData = [
      {
        date: "2026-11-19",
        label: "Nov 19",
        shortLabel: "11-19",
        tickLabel: "11-19",
        sales: 1500,
        profit: 600,
        meta: "10 orders"
      },
      {
        date: "2026-11-20",
        label: "Nov 20",
        shortLabel: "11-20",
        tickLabel: "11-20",
        sales: 2400,
        profit: 950,
        meta: "18 orders"
      },
      {
        date: "2026-11-21",
        label: "Nov 21",
        shortLabel: "11-21",
        tickLabel: "11-21",
        sales: 1800,
        profit: 720,
        meta: "14 orders"
      }
    ];

    const html = renderToString(React.createElement(LineChart, { data: mockData }));

    // Legend & summary totals
    expect(html).toContain("Gross Sales");
    expect(html).toContain("Net Profit");
    expect(html).toContain("Sales:");
    expect(html).toContain("Profit:");
    expect(html).toContain("₱5,700.00"); // 1500 + 2400 + 1800
    expect(html).toContain("₱2,270.00"); // 600 + 950 + 720

    // SVG non-scaling shapes
    expect(html).toContain("<svg");
    expect(html).toContain('preserveAspectRatio="none"');
    expect(html).toContain('vector-effect="non-scaling-stroke"');
    expect(html).toContain('stroke="#171717"');
    expect(html).toContain('stroke="#B9F36B"');
    expect(html).toContain("profit-gradient");

    // X-axis HTML labels
    expect(html).toContain("11-19");
    expect(html).toContain("11-20");
    expect(html).toContain("11-21");

    // Y-axis compact labels
    expect(html).toContain("₱2.4K"); // maxVal = 2400
    expect(html).toContain("₱1.2K"); // maxVal / 2 = 1200
    expect(html).toContain("₱0");
  });

  it("handles single-point data gracefully without dividing by zero", function () {
    const singlePoint = [
      {
        date: "2026-11-20",
        label: "Today",
        tickLabel: "Today",
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

  it("renders container query wrapper, center caption, percentages, and legend buttons", function () {
    const mockData = [
      { label: "Beverages", value: 3000, count: 50 },
      { label: "Snacks", value: 1500, count: 35 },
      { label: "Other", value: 500, count: 12, color: "#777777" }
    ];

    const html = renderToString(
      React.createElement(PieChart, {
        data: mockData,
        centerCaption: "3 categories"
      })
    );

    // Container query class
    expect(html).toContain("@container");

    // Center total badge (total = 5000)
    expect(html).toContain("Total");
    expect(html).toContain("₱5,000.00");
    expect(html).toContain("3 categories");

    // Legend buttons and percentages
    expect(html).toContain("Beverages");
    expect(html).toContain("₱3,000.00");
    expect(html).toContain("60%"); // 3000 / 5000

    expect(html).toContain("Snacks");
    expect(html).toContain("₱1,500.00");
    expect(html).toContain("30%"); // 1500 / 5000

    expect(html).toContain("Other");
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

describe("DashboardPage integration with redesigned charts", function () {
  it("renders shared range toggle and both charts for OWNER while preserving stat cards", function () {
    const html = renderToString(
      React.createElement(DashboardPage, {
        currentUser: { username: "owner", role: "OWNER" },
        onNavigate: function () {}
      })
    );

    // Page & KPI Cards (Unchanged)
    expect(html).toContain("Dashboard");
    expect(html).toContain("Today&#x27;s Sales");
    expect(html).toContain("Today&#x27;s Profit");

    // Shared Header
    expect(html).toContain("Sales Overview");
    expect(html).toContain("Last 7 days");
    expect(html).toContain("7 Days");
    expect(html).toContain("30 Days");

    // Chart cards
    expect(html).toContain("Sales &amp; Profit Trend");
    expect(html).toContain("Daily performance over time");
    expect(html).toContain("Sales Distribution");
    expect(html).toContain("Revenue breakdown by segment");
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
    expect(html).not.toContain("Sales Overview");
    expect(html).not.toContain("Sales &amp; Profit Trend");
    expect(html).not.toContain("Sales Distribution");
    expect(html).not.toContain("Today&#x27;s Sales");
    expect(html).not.toContain("Today&#x27;s Profit");

    // Cashier sees only operational inventory alerts
    expect(html).toContain("Inventory Alerts");
    expect(html).toContain("View Inventory");
  });
});
