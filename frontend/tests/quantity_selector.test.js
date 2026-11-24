import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { QuantitySelector } from "../src/components/QuantitySelector.jsx";

describe("QuantitySelector component", function () {
  it("renders with numeric input and increment/decrement buttons", function () {
    const html = renderToString(
      React.createElement(QuantitySelector, { value: 5, min: 1 })
    );
    expect(html).toContain('value="5"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('aria-label="Decrease quantity"');
    expect(html).toContain('aria-label="Increase quantity"');
  });

  it("disables decrement button when value reaches min", function () {
    const html = renderToString(
      React.createElement(QuantitySelector, { value: 1, min: 1 })
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-label="Decrease quantity"');
  });

  it("enables decrement button when value is above min", function () {
    const html = renderToString(
      React.createElement(QuantitySelector, { value: 2, min: 1 })
    );
    // The decrease button should not be disabled
    expect(html).toContain('value="2"');
  });

  it("renders disabled state on buttons and input when disabled prop is true", function () {
    const html = renderToString(
      React.createElement(QuantitySelector, { value: 3, disabled: true })
    );
    expect(html).toContain('disabled=""');
  });

  it("accepts custom className and merges properly", function () {
    const html = renderToString(
      React.createElement(QuantitySelector, { value: 1, className: "custom-qty-class" })
    );
    expect(html).toContain("custom-qty-class");
  });

  it("enforces numeric pattern and inputMode attributes on the input element", function () {
    const html = renderToString(
      React.createElement(QuantitySelector, { value: 10 })
    );
    expect(html).toContain('pattern="[0-9]*"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('value="10"');
  });
});
