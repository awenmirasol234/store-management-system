import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DataTable } from "../src/components/DataTable.jsx";
import { Button } from "../src/components/Button.jsx";
import { ErrorBanner } from "../src/components/ErrorBanner.jsx";
import { FilterPill } from "../src/components/FilterPill.jsx";
import { Input } from "../src/components/Input.jsx";
import { FormActions } from "../src/components/FormActions.jsx";
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

  it("renders PaymentMethodToggle with Cash and Utang options", function () {
    const html = renderToString(
      React.createElement(PaymentMethodToggle, {
        paymentMethod: "CREDIT",
        onChange: function () {}
      })
    );
    expect(html).toContain("Cash");
    expect(html).toContain("Utang");
    expect(html).not.toContain("Split");
    expect(html).toContain("grid-cols-2");
    expect(html).toContain('aria-pressed="true"');
  });

  it("renders Input with error styling and inline error message", function () {
    const html = renderToString(
      React.createElement(Input, {
        label: "Selling Price",
        value: "0",
        error: "Selling price must be greater than ₱0.00",
        onChange: function () {}
      })
    );
    expect(html).toContain("border-[#E0533C]");
    expect(html).toContain("Selling price must be greater than ₱0.00");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby=');
  });

  it("renders Select with error styling and inline error message", function () {
    const html = renderToString(
      React.createElement(
        Select,
        {
          label: "Base Unit",
          value: "",
          error: "Base unit is required",
          onChange: function () {}
        },
        React.createElement("option", { value: "" }, "Select unit")
      )
    );
    expect(html).toContain("border-[#E0533C]");
    expect(html).toContain("Base unit is required");
  });

  it("renders Input required field label with red asterisk when required is set", function () {
    const html = renderToString(
      React.createElement(Input, {
        label: "Store Name",
        value: "",
        required: true,
        onChange: function () {}
      })
    );
    expect(html).toContain('class="text-rose-500"');
    expect(html).toContain("Store Name");
    expect(html).toContain("*");
  });

  it("renders Input label with red asterisk when label has trailing asterisk without duplicates", function () {
    const html = renderToString(
      React.createElement(Input, {
        label: "Product Name *",
        value: "",
        required: true,
        onChange: function () {}
      })
    );
    expect(html).toContain('class="text-rose-500">*</span>');
    expect(html).toContain("Product Name");
    expect(html).not.toContain("**");
    expect(html).not.toContain("Product Name * *");
  });

  it("renders Select required field label with red asterisk", function () {
    const html = renderToString(
      React.createElement(
        Select,
        {
          label: "Base Unit *",
          value: "PCS",
          required: true,
          onChange: function () {}
        },
        React.createElement("option", { value: "PCS" }, "Pieces")
      )
    );
    expect(html).toContain('class="text-rose-500">*</span>');
    expect(html).toContain("Base Unit");
    expect(html).not.toContain("**");
  });

  it("does not render red asterisk for non-required Input and Select", function () {
    const inputHtml = renderToString(
      React.createElement(Input, {
        label: "Barcode (optional)",
        value: "",
        onChange: function () {}
      })
    );
    expect(inputHtml).not.toContain("text-rose-500");
    expect(inputHtml).not.toContain("*");

    const selectHtml = renderToString(
      React.createElement(
        Select,
        {
          label: "Category (optional)",
          value: "",
          onChange: function () {}
        },
        React.createElement("option", { value: "" }, "None")
      )
    );
    expect(selectHtml).not.toContain("text-rose-500");
    expect(selectHtml).not.toContain("*");
  });

  it("renders DataTable with sticky head and z-10 when stickyHead is true", function () {
    const html = renderToString(
      React.createElement(
        DataTable,
        {
          stickyHead: true,
          headRow: React.createElement("tr", null, React.createElement("th", null, "Stock"))
        },
        React.createElement("tr", null, React.createElement("td", null, "Item 1"))
      )
    );
    expect(html).toContain("sticky top-0 z-10");
  });

  it("renders DataTable standard head without sticky or z-10 when stickyHead is omitted", function () {
    const html = renderToString(
      React.createElement(
        DataTable,
        {
          headRow: React.createElement("tr", null, React.createElement("th", null, "Stock"))
        },
        React.createElement("tr", null, React.createElement("td", null, "Item 1"))
      )
    );
    expect(html).not.toContain("sticky top-0");
    expect(html).not.toContain("z-10");
  });

  it("renders Button with glossy danger variant using red background and white text", function () {
    const html = renderToString(
      React.createElement(
        Button,
        {
          variant: "danger"
        },
        "Clear Cart"
      )
    );
    expect(html).toContain("bg-rose-600");
    expect(html).toContain("text-white");
    expect(html).toContain("Clear Cart");
  });

  it("forwards Button form and accessibility attributes", function () {
    const html = renderToString(
      React.createElement(
        Button,
        {
          form: "checkout-form",
          title: "Submit checkout",
          ariaExpanded: false,
          ariaControls: "checkout-menu"
        },
        "Submit"
      )
    );
    expect(html).toContain('form="checkout-form"');
    expect(html).toContain('title="Submit checkout"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="checkout-menu"');
  });

  it("disables both FormActions buttons while submitting", function () {
    const html = renderToString(
      React.createElement(FormActions, {
        confirmLabel: "Save",
        submitting: true,
        onCancel: function () {},
        onConfirm: function () {}
      })
    );
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
