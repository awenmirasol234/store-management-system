import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ErrorBanner } from "../src/components/ErrorBanner.jsx";
import { FilterPill } from "../src/components/FilterPill.jsx";
import { Input } from "../src/components/Input.jsx";
import { Modal } from "../src/components/Modal.jsx";
import { PaymentMethodToggle } from "../src/components/PaymentMethodToggle.jsx";
import { SearchInput } from "../src/components/SearchInput.jsx";
import { Select } from "../src/components/Select.jsx";

describe("Standardized UI primitives & accessibility", function () {
  it("associates Input label with input element via explicit or auto-generated id", function () {
    const html = renderToString(
      React.createElement(Input, {
        id: "product-name-field",
        label: "Product Name",
        value: "Sardines",
        onChange: function () {}
      })
    );
    expect(html).toContain('for="product-name-field"');
    expect(html).toContain('id="product-name-field"');

    const autoIdHtml = renderToString(
      React.createElement(Input, {
        label: "Expiry Date",
        type: "date",
        value: "2026-12-01",
        onChange: function () {}
      })
    );
    const forMatch = autoIdHtml.match(/for="([^"]+)"/);
    expect(forMatch).not.toBeNull();
    expect(autoIdHtml).toContain('id="' + forMatch[1] + '"');
    expect(autoIdHtml).toContain("font-mono");
  });

  it("associates Select label with select element and supports sm size", function () {
    const html = renderToString(
      React.createElement(
        Select,
        {
          id: "category-select",
          label: "Category",
          size: "sm",
          value: "ALL",
          onChange: function () {}
        },
        React.createElement("option", { value: "ALL" }, "All")
      )
    );
    expect(html).toContain('for="category-select"');
    expect(html).toContain('id="category-select"');
    expect(html).toContain("py-1.5 pl-3 pr-8 text-xs");
  });

  it("renders SearchInput with shortcutHint when empty and clear button when populated", function () {
    const emptyHtml = renderToString(
      React.createElement(SearchInput, {
        value: "",
        onChange: function () {},
        placeholder: "Search products...",
        shortcutHint: "Ctrl K"
      })
    );
    expect(emptyHtml).toContain("Ctrl K");
    expect(emptyHtml).not.toContain('aria-label="Clear search"');

    const filledHtml = renderToString(
      React.createElement(SearchInput, {
        value: "cola",
        onChange: function () {},
        placeholder: "Search products...",
        shortcutHint: "Ctrl K"
      })
    );
    expect(filledHtml).toContain('aria-label="Clear search"');
    expect(filledHtml).not.toContain("Ctrl K");
  });

  it("renders FilterPill with aria-pressed and count badge", function () {
    const activeHtml = renderToString(
      React.createElement(FilterPill, {
        label: "With Utang",
        count: 4,
        active: true,
        onClick: function () {}
      })
    );
    expect(activeHtml).toContain('aria-pressed="true"');
    expect(activeHtml).toContain("With Utang");
    expect(activeHtml).toContain("4");
  });

  it("renders Modal with dialog ARIA attributes and accessible close button", function () {
    const html = renderToString(
      React.createElement(
        Modal,
        {
          open: true,
          title: "Confirm Action",
          onClose: function () {}
        },
        React.createElement("p", null, "Dialog body")
      )
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-label="Close modal"');
  });

  it("renders ErrorBanner with alert role, optional dismiss button, and empty-input guard", function () {
    const emptyHtml = renderToString(React.createElement(ErrorBanner, { message: "" }));
    expect(emptyHtml).toBe("");

    const html = renderToString(
      React.createElement(ErrorBanner, {
        message: "Something went wrong",
        onDismiss: function () {}
      })
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-label="Dismiss error"');
    expect(html).toContain("rounded-xl");
  });

  it("renders PaymentMethodToggle with Cash, Utang, and Split options", function () {
    const html = renderToString(
      React.createElement(PaymentMethodToggle, {
        paymentMethod: "SPLIT",
        onChange: function () {}
      })
    );
    expect(html).toContain("Cash");
    expect(html).toContain("Utang");
    expect(html).toContain("Split");
    expect(html).toContain('aria-pressed="true"');
  });
});
