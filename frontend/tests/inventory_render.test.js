import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MoreVertical } from "lucide-react";
import { InventoryPage } from "../src/pages/InventoryPage.jsx";

describe("InventoryPage SSR test", function () {
  it("renders without throwing an error", function () {
    const html = renderToString(React.createElement(InventoryPage));
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Add Product");
  });

  it("imports MoreVertical icon without reference error", function () {
    expect(MoreVertical).toBeDefined();
    expect(typeof MoreVertical).toBe("object");
  });
});
