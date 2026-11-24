import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PageHeader } from "../src/components/PageHeader.jsx";
import { Badge } from "../src/components/Badge.jsx";
import { Button } from "../src/components/Button.jsx";

describe("PageHeader component test", function () {
  it("renders with title and default mobile-stacked classes", function () {
    const html = renderToString(React.createElement(PageHeader, { title: "Dashboard" }));
    expect(html).toContain("Dashboard");
    expect(html).toContain("flex flex-col justify-between gap-3 sm:mb-4 sm:flex-row sm:items-center sm:gap-4");
  });

  it("supports explicit stackOnMobile=false to disable mobile stacking", function () {
    const html = renderToString(
      React.createElement(PageHeader, { title: "Custom Page", stackOnMobile: false })
    );
    expect(html).toContain("Custom Page");
    expect(html).toContain("flex flex-wrap items-center justify-between");
  });

  it("renders optional subtitle when provided", function () {
    const html = renderToString(
      React.createElement(PageHeader, {
        title: "Products",
        subtitle: "Manage inventory stock and selling options"
      })
    );
    expect(html).toContain("Products");
    expect(html).toContain("Manage inventory stock and selling options");
    expect(html).toContain("text-xs text-[#777777]");
  });

  it("renders optional badge when provided", function () {
    const badge = React.createElement(Badge, { tone: "green" }, "Active");
    const html = renderToString(
      React.createElement(PageHeader, {
        title: "Customers",
        badge: badge
      })
    );
    expect(html).toContain("Customers");
    expect(html).toContain("Active");
  });

  it("renders actions slot with standard flex wrapping", function () {
    const actionBtn = React.createElement(Button, { variant: "primary", size: "sm" }, "Add Item");
    const html = renderToString(
      React.createElement(PageHeader, {
        title: "Inventory",
        actions: actionBtn
      })
    );
    expect(html).toContain("Inventory");
    expect(html).toContain("Add Item");
    expect(html).toContain("flex flex-wrap items-center gap-2 sm:gap-3 shrink-0");
  });

  it("renders children for backward compatibility", function () {
    const childElement = React.createElement("div", { className: "custom-actions" }, "Action Group");
    const html = renderToString(
      React.createElement(PageHeader, { title: "Orders" }, childElement)
    );
    expect(html).toContain("Orders");
    expect(html).toContain("custom-actions");
    expect(html).toContain("Action Group");
  });

  it("applies extra className if provided", function () {
    const html = renderToString(
      React.createElement(PageHeader, { title: "Settings", className: "custom-header-class" })
    );
    expect(html).toContain("custom-header-class");
  });
});
