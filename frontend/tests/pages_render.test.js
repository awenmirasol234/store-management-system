import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ReportsPage } from "../src/pages/ReportsPage.jsx";
import { TransactionsPage } from "../src/pages/TransactionsPage.jsx";

describe("Refactored page rendering", function () {
  it("renders ReportsPage with shared page and table components", function () {
    const html = renderToString(React.createElement(ReportsPage));
    expect(html).toContain("Reports");
    expect(html).toContain("Daily Sales");
    expect(html).toContain("No sales in this date range.");
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
