import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { FlyToCartOverlay } from "../src/components/FlyToCartOverlay.jsx";
import { PosPage } from "../src/pages/PosPage.jsx";

describe("FlyToCartOverlay", function () {
  it("renders null when activeFlyer is null", function () {
    const html = renderToString(
      React.createElement(FlyToCartOverlay, {
        activeFlyer: null,
        onComplete: function () {}
      })
    );
    expect(html).toBe("");
  });

  it("renders flyer with fixed position and thumbnail when activeFlyer is provided", function () {
    const dummyFlyer = {
      id: "flyer-1",
      product: {
        product_id: "p-1",
        product_name: "Century Tuna 180g",
        image_url: null
      },
      fromRect: { left: 120, top: 250, width: 44, height: 44 },
      toRect: { left: 950, top: 80, width: 44, height: 44 },
      duration: 260
    };

    const html = renderToString(
      React.createElement(FlyToCartOverlay, {
        activeFlyer: dummyFlyer,
        onComplete: function () {}
      })
    );

    expect(html).toContain("pointer-events-none fixed inset-0 z-50");
    expect(html).toContain("translate3d(120px, 250px, 0px) scale(1)");
    expect(html).toContain("CE"); // Product initials
    expect(html).toContain("cubic-bezier(0.2, 0.8, 0.2, 1)");
  });

  it("renders flyer with image when product has image_url", function () {
    const dummyFlyer = {
      id: "flyer-2",
      product: {
        product_id: "p-2",
        product_name: "Coke 1.5L",
        image_url: "http://example.com/coke.png"
      },
      fromRect: { left: 50, top: 100, width: 44, height: 44 },
      toRect: { left: 800, top: 40, width: 44, height: 44 },
      duration: 200
    };

    const html = renderToString(
      React.createElement(FlyToCartOverlay, {
        activeFlyer: dummyFlyer,
        onComplete: function () {}
      })
    );

    expect(html).toContain("http://example.com/coke.png");
    expect(html).toContain("translate3d(50px, 100px, 0px) scale(1)");
  });
});

describe("PosPage Cart Targets for Fly Animation", function () {
  it("renders desktop-expanded cart target anchor", function () {
    const html = renderToString(React.createElement(PosPage));
    expect(html).toContain('data-cart-target="desktop-expanded"');
  });

  it("renders desktop-collapsed cart target anchor", function () {
    const html = renderToString(
      React.createElement(PosPage, {
        initialCartCollapsed: true
      })
    );
    expect(html).toContain('data-cart-target="desktop-collapsed"');
  });

  it("renders mobile-bar cart target anchor when items are in cart", function () {
    const html = renderToString(
      React.createElement(PosPage, {
        initialCartItems: [
          {
            key: "p-1:base",
            product_id: "p-1",
            product_name: "Item 1",
            selling_price: 50,
            quantity: 1,
            base_quantity_per_unit: 1
          }
        ]
      })
    );
    expect(html).toContain('data-cart-target="mobile-bar"');
  });
});
