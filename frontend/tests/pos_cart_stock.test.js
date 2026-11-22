import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  canAddStockToCart,
  calculateProductCartStockUsage,
  computeItemBaseQuantity
} from "../src/cart.js";
import { ErrorBanner } from "../src/components/ErrorBanner.jsx";
import { PosPage } from "../src/pages/PosPage.jsx";

describe("POS cart stock quantity validation", function () {
  const dummyProduct = {
    product_id: "prod-100",
    product_name: "Century Tuna 180g",
    base_unit: "Can",
    current_stock: 3,
    selling_price: 45
  };

  it("allows additions until current stock is reached", function () {
    let cart = [];

    // Add 1st can
    let check = canAddStockToCart({
      cartItems: cart,
      product: dummyProduct,
      additionalBaseQuantity: 1
    });
    expect(check.allowed).toBe(true);
    cart = [
      {
        product_id: dummyProduct.product_id,
        quantity: 1,
        base_quantity_per_unit: 1
      }
    ];

    // Add 2nd can
    check = canAddStockToCart({
      cartItems: cart,
      product: dummyProduct,
      additionalBaseQuantity: 1
    });
    expect(check.allowed).toBe(true);
    cart = [
      {
        product_id: dummyProduct.product_id,
        quantity: 2,
        base_quantity_per_unit: 1
      }
    ];

    // Add 3rd can (reaches stock limit of 3)
    check = canAddStockToCart({
      cartItems: cart,
      product: dummyProduct,
      additionalBaseQuantity: 1
    });
    expect(check.allowed).toBe(true);
    cart = [
      {
        product_id: dummyProduct.product_id,
        quantity: 3,
        base_quantity_per_unit: 1
      }
    ];

    // Try to add 4th can (should be blocked)
    check = canAddStockToCart({
      cartItems: cart,
      product: dummyProduct,
      additionalBaseQuantity: 1
    });
    expect(check.allowed).toBe(false);
    expect(check.message).toBe(
      "Requested quantity exceeds available stock for Century Tuna 180g (3 Can available)."
    );
  });

  it("blocks incrementing cart quantity when at max stock", function () {
    const cart = [
      {
        key: "prod-100:base",
        product_id: dummyProduct.product_id,
        quantity: 3,
        base_quantity_per_unit: 1
      }
    ];

    // Attempting to increment by 1
    const check = canAddStockToCart({
      cartItems: cart,
      product: dummyProduct,
      additionalBaseQuantity: 1
    });
    expect(check.allowed).toBe(false);
    expect(check.message).toBe(
      "Requested quantity exceeds available stock for Century Tuna 180g (3 Can available)."
    );
  });

  it("validates combined stock usage across base units and selling options", function () {
    const noodlesProduct = {
      product_id: "prod-200",
      product_name: "Lucky Me Pancit Canton",
      base_unit: "Piece (pc)",
      current_stock: 10,
      selling_price: 15
    };
    const packOf6 = {
      option_id: "opt-pack-6",
      option_name: "Pack of 6",
      quantity: 6,
      price: 85
    };

    // Add 1 Pack of 6 (consumes 6 pcs)
    const packMultiplier = computeItemBaseQuantity({
      product: noodlesProduct,
      option: packOf6,
      quantity: 1
    });
    expect(packMultiplier).toBe(6);

    let cart = [
      {
        product_id: noodlesProduct.product_id,
        quantity: 1,
        base_quantity_per_unit: packMultiplier
      }
    ];

    // Adding 4 single pcs should succeed (6 + 4 = 10 pcs)
    let check = canAddStockToCart({
      cartItems: cart,
      product: noodlesProduct,
      additionalBaseQuantity: 4
    });
    expect(check.allowed).toBe(true);

    // Adding another Pack of 6 should be rejected (6 + 6 = 12 > 10)
    check = canAddStockToCart({
      cartItems: cart,
      product: noodlesProduct,
      additionalBaseQuantity: packMultiplier
    });
    expect(check.allowed).toBe(false);
    expect(check.message).toBe(
      "Requested quantity exceeds available stock for Lucky Me Pancit Canton (10 Piece (pc) available)."
    );
  });

  it("validates custom tingi amount against available fractional stock", function () {
    const oilProduct = {
      product_id: "prod-300",
      product_name: "Cooking Oil",
      base_unit: "Liter (L)",
      current_stock: 0.5,
      selling_price: 100,
      allow_custom_amount: true
    };

    // ₱60 worth at ₱100/L requires 0.6 L -> exceeds 0.5 L
    const excessBaseQty = computeItemBaseQuantity({
      product: oilProduct,
      customAmount: 60
    });
    expect(excessBaseQty).toBe(0.6);

    let check = canAddStockToCart({
      cartItems: [],
      product: oilProduct,
      additionalBaseQuantity: excessBaseQty
    });
    expect(check.allowed).toBe(false);
    expect(check.message).toBe(
      "Requested quantity exceeds available stock for Cooking Oil (0.5 Liter (L) available)."
    );

    // ₱40 worth at ₱100/L requires 0.4 L -> fits within 0.5 L
    const validBaseQty = computeItemBaseQuantity({
      product: oilProduct,
      customAmount: 40
    });
    expect(validBaseQty).toBe(0.4);

    check = canAddStockToCart({
      cartItems: [],
      product: oilProduct,
      additionalBaseQuantity: validBaseQty
    });
    expect(check.allowed).toBe(true);
  });

  it("renders ErrorBanner correctly with stock exceeded message", function () {
    const errorMsg =
      "Requested quantity exceeds available stock for Coke Can (5 Piece (pc) available).";
    const html = renderToString(React.createElement(ErrorBanner, { message: errorMsg }));
    expect(html).toContain("Requested quantity exceeds available stock for Coke Can (5 Piece (pc) available).");
    expect(html).toContain("text-rose-700");
  });
});
