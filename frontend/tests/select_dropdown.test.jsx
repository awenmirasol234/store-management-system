// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Select } from "../src/components/Select.jsx";

describe("Custom styled Select dropdown interactions and styling", function () {
  let container = null;
  let root = null;

  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async function () {
    if (root) {
      await act(async function () {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
      container = null;
    }
  });

  it("renders trigger button with current selection label and chevron icon", async function () {
    await act(async function () {
      root.render(
        React.createElement(
          Select,
          {
            id: "test-category",
            label: "Category",
            value: "cat_beverages",
            onChange: function () {}
          },
          React.createElement("option", { value: "" }, "Uncategorized"),
          React.createElement("option", { value: "cat_beverages" }, "Beverages"),
          React.createElement("option", { value: "cat_snacks" }, "Snacks")
        )
      );
    });

    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).not.toBeNull();
    expect(trigger.id).toBe("test-category");
    expect(trigger.textContent).toContain("Beverages");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("toggles the styled options row list when clicking trigger", async function () {
    await act(async function () {
      root.render(
        React.createElement(
          Select,
          {
            id: "unit-select",
            label: "Base Unit",
            value: "Pack",
            onChange: function () {}
          },
          React.createElement("option", { value: "Piece (pc)" }, "Piece (pc)"),
          React.createElement("option", { value: "Pack" }, "Pack"),
          React.createElement("option", { value: "Box" }, "Box")
        )
      );
    });

    const trigger = container.querySelector('button[role="combobox"]');

    // Click to open
    await act(async function () {
      trigger.click();
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-activedescendant")).toBe("unit-select-option-1");
    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    expect(listbox.className).toContain("rounded-xl");
    expect(listbox.className).toContain("border-[#E9E9E9]");
    expect(listbox.className).toContain("bg-white");
    expect(listbox.className).toContain("shadow-xl");

    const options = listbox.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);

    // Selected option styling
    const packOption = options[1];
    expect(packOption.textContent).toContain("Pack");
    expect(packOption.getAttribute("aria-selected")).toBe("true");
    expect(packOption.className).toContain("bg-[#EEEEED]");
    expect(packOption.className).toContain("font-semibold");
    expect(packOption.querySelector("svg")).not.toBeNull(); // Checkmark icon

    // Non-selected option styling
    const pieceOption = options[0];
    expect(pieceOption.textContent).toContain("Piece (pc)");
    expect(pieceOption.getAttribute("aria-selected")).toBe("false");
    expect(pieceOption.className).toContain("hover:bg-[#EEEEED]");
    expect(pieceOption.querySelector("svg")).toBeNull();

    // Click trigger again to close
    await act(async function () {
      trigger.click();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-activedescendant")).toBeNull();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("fires onChange with standard event target when an option is selected and closes", async function () {
    let capturedEvent = null;
    function handleChange(e) {
      capturedEvent = e;
    }

    await act(async function () {
      root.render(
        React.createElement(
          Select,
          {
            id: "fruit-select",
            label: "Fruit",
            value: "apple",
            onChange: handleChange
          },
          React.createElement("option", { value: "apple" }, "Apple"),
          React.createElement("option", { value: "banana" }, "Banana"),
          React.createElement("option", { value: "orange" }, "Orange")
        )
      );
    });

    const trigger = container.querySelector('button[role="combobox"]');
    await act(async function () {
      trigger.click();
    });

    const listbox = container.querySelector('[role="listbox"]');
    const bananaOption = listbox.querySelectorAll('[role="option"]')[1];

    await act(async function () {
      bananaOption.click();
    });

    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent.target.value).toBe("banana");
    expect(capturedEvent.target.id).toBe("fruit-select");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("supports keyboard navigation with Arrow keys, Enter, and Escape", async function () {
    let selectedValue = "1";
    function handleChange(e) {
      selectedValue = e.target.value;
    }

    await act(async function () {
      root.render(
        React.createElement(
          Select,
          {
            id: "num-select",
            label: "Number",
            value: selectedValue,
            onChange: handleChange
          },
          React.createElement("option", { value: "1" }, "One"),
          React.createElement("option", { value: "2" }, "Two"),
          React.createElement("option", { value: "3" }, "Three")
        )
      );
    });

    const trigger = container.querySelector('button[role="combobox"]');

    // Press ArrowDown on closed trigger opens menu
    await act(async function () {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();

    // Press ArrowDown again to move highlight to option 2 ("Two")
    await act(async function () {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });

    // Press Enter to select option 2
    await act(async function () {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(selectedValue).toBe("2");
    expect(container.querySelector('[role="listbox"]')).toBeNull();

    // Open again and close with Escape
    await act(async function () {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();

    await act(async function () {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("closes the dropdown when clicking outside", async function () {
    await act(async function () {
      root.render(
        React.createElement(
          Select,
          {
            id: "outside-select",
            label: "Outside Test",
            value: "a",
            onChange: function () {}
          },
          React.createElement("option", { value: "a" }, "A"),
          React.createElement("option", { value: "b" }, "B")
        )
      );
    });

    const trigger = container.querySelector('button[role="combobox"]');
    await act(async function () {
      trigger.click();
    });
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();

    // Click outside on document body
    await act(async function () {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("applies small size styling when size is sm", async function () {
    await act(async function () {
      root.render(
        React.createElement(
          Select,
          {
            id: "sm-select",
            label: "Small Filter",
            size: "sm",
            value: "x",
            onChange: function () {}
          },
          React.createElement("option", { value: "x" }, "Option X"),
          React.createElement("option", { value: "y" }, "Option Y")
        )
      );
    });

    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger.className).toContain("text-xs");
    expect(trigger.className).toContain("py-1.5");

    await act(async function () {
      trigger.click();
    });

    const listbox = container.querySelector('[role="listbox"]');
    const option = listbox.querySelector('[role="option"]');
    expect(option.className).toContain("text-xs");
    expect(option.className).toContain("py-1.5");
  });
});
