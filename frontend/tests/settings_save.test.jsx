// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SettingsPage } from "../src/pages/SettingsPage.jsx";
import { api } from "../src/api.js";

describe("SettingsPage save flow", function () {
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
    vi.restoreAllMocks();
  });

  it("loads settings and saves the edited store name", async function () {
    const getSettings = vi.spyOn(api, "getSettings").mockResolvedValue({
      store_name: "Old Store",
      default_low_stock_threshold: 5,
      sound_enabled: 1,
      show_cashier_on_receipt: 1
    });
    const updateSettings = vi.spyOn(api, "updateSettings").mockResolvedValue({
      store_name: "New Store",
      default_low_stock_threshold: 5,
      sound_enabled: 1,
      show_cashier_on_receipt: 1
    });

    await act(async function () {
      root.render(
        React.createElement(SettingsPage, {
          currentUser: { full_name: "Owner", role: "OWNER" }
        })
      );
    });

    expect(getSettings).toHaveBeenCalledTimes(1);
    const storeNameInput = container.querySelector('input[value="Old Store"]');
    expect(storeNameInput).not.toBeNull();
    const setInputValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    ).set;
    setInputValue.call(storeNameInput, "New Store");
    await act(async function () {
      storeNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async function () {
      container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true }));
    });

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings.mock.calls[0][0].store_name).toBe("New Store");
    expect(container.textContent).toContain("Settings saved successfully");
  });
});
