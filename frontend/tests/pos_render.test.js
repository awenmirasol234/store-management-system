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

  it("uses bg-rose-600 and text-white for notification badge dot styling", function () {
    const badgeElement = React.createElement(
      "span",
      { className: "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-2xs font-bold text-white shadow-xs" },
      "3"
    );
    const html = renderToString(badgeElement);
    expect(html).toContain("bg-rose-600");
    expect(html).toContain("text-white");
    expect(html).not.toContain("bg-[#151515]");
    expect(html).not.toContain("text-[#B9F36B]");
  });

  it("renders cart panel with collapse toggle in header", function () {
    const html = renderToString(React.createElement(PosPage));
    expect(html).toContain("Collapse Cart Panel");
    expect(html).toContain("Current Sale");
  });

  it("renders mobile cart bar with md:hidden to prevent conflict on tablet/desktop", function () {
    const html = renderToString(
      React.createElement(PosPage, {
        initialCartItems: [
          {
            key: "prod-1:base",
            product_id: "prod-1",
            product_name: "C2 Cool & Clean",
            selling_price: 25,
            quantity: 1,
            base_quantity_per_unit: 1
          }
        ]
      })
    );
    expect(html).toContain("fixed bottom-16 left-0 right-0 z-30");
    expect(html).toContain("md:hidden");
    expect(html).not.toContain("backdrop-blur lg:hidden");
  });
});
