import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ShoppingBag } from "lucide-react";
import { PosPage } from "../src/pages/PosPage.jsx";

describe("PosPage SSR test", function () {
  it("renders without throwing an error", function () {
    const html = renderToString(React.createElement(PosPage));
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });

  it("imports ShoppingBag icon without reference error", function () {
    expect(ShoppingBag).toBeDefined();
    expect(typeof ShoppingBag).toBe("object");
  });

  it("renders Cash and Utang payment options", function () {
    const html = renderToString(React.createElement(PosPage));
    expect(html).toContain("Cash");
    expect(html).toContain("Utang");
  });
});
