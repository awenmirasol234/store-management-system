import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ShoppingBag } from "lucide-react";
import { PosPage } from "../src/pages/PosPage.jsx";
import { ProductThumb } from "../src/components/ProductThumb.jsx";

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

  it("renders Clear Cart action in cart header and quick actions bar", function () {
    const html = renderToString(React.createElement(PosPage));
    expect(html).toContain("Clear");
    expect(html).toContain("Clear Sale");
    expect(html).toContain("Clear all items in cart");
  });

  it("renders ProductThumb in fullBleed mode with edge-to-edge styling", function () {
    const thumbHtml = renderToString(
      React.createElement(ProductThumb, {
        imageUrl: "http://example.com/test.jpg",
        name: "Test Item",
        fullBleed: true
      })
    );
    expect(thumbHtml).toContain("object-cover");
    expect(thumbHtml).toContain("h-full");
    expect(thumbHtml).toContain("w-full");
  });

  it("renders ProductThumb initials fallback in fullBleed mode", function () {
    const thumbHtml = renderToString(
      React.createElement(ProductThumb, {
        imageUrl: null,
        name: "Coke Can",
        fullBleed: true
      })
    );
    expect(thumbHtml).toContain("CO");
    expect(thumbHtml).toContain("bg-[#EEEEED]");
  });

  it("renders Subtotal row without redundant border-t divider wrapper", function () {
    const html = renderToString(React.createElement(PosPage));
    expect(html).toContain("Subtotal");
    expect(html).not.toContain('space-y-2 border-t border-[#E9E9E9] pt-4');
  });
});
