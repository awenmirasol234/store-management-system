// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useFullscreen } from "../src/fullscreen.js";
import { Sidebar } from "../src/components/Sidebar.jsx";
import { App } from "../src/App.jsx";
import { api, clearAuthToken, setAuthToken } from "../src/api.js";

function FullscreenTestConsumer() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  return (
    <div>
      <span data-testid="status">{isFullscreen ? "FULL" : "WINDOWED"}</span>
      <button data-testid="toggle-btn" type="button" onClick={toggleFullscreen}>
        Toggle
      </button>
    </div>
  );
}

describe("Fullscreen functionality & useFullscreen hook", function () {
  let container = null;
  let root = null;
  let originalFullscreenElement = null;
  let originalRequestFullscreen = null;
  let originalExitFullscreen = null;

  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    originalFullscreenElement = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
    originalRequestFullscreen = document.documentElement.requestFullscreen;
    originalExitFullscreen = document.exitFullscreen;
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

    clearAuthToken();
    try {
      window.localStorage.clear();
    } catch (e) {}

    if (originalFullscreenElement) {
      Object.defineProperty(document, "fullscreenElement", originalFullscreenElement);
    } else {
      delete document.fullscreenElement;
    }
    document.documentElement.requestFullscreen = originalRequestFullscreen;
    document.exitFullscreen = originalExitFullscreen;

    vi.restoreAllMocks();
  });

  it("initializes with isFullscreen false when no fullscreenElement exists", async function () {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null
    });

    await act(async function () {
      root.render(React.createElement(FullscreenTestConsumer));
    });

    const statusEl = container.querySelector('[data-testid="status"]');
    expect(statusEl.textContent).toBe("WINDOWED");
  });

  it("calls requestFullscreen when windowed and toggleFullscreen is invoked", async function () {
    let requestFullscreenCalled = false;
    document.documentElement.requestFullscreen = function () {
      requestFullscreenCalled = true;
      return Promise.resolve();
    };

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null
    });

    await act(async function () {
      root.render(React.createElement(FullscreenTestConsumer));
    });

    const button = container.querySelector('[data-testid="toggle-btn"]');
    await act(async function () {
      button.click();
    });

    expect(requestFullscreenCalled).toBe(true);
  });

  it("calls exitFullscreen when fullscreen and toggleFullscreen is invoked", async function () {
    let exitFullscreenCalled = false;
    document.exitFullscreen = function () {
      exitFullscreenCalled = true;
      return Promise.resolve();
    };

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: document.documentElement
    });

    await act(async function () {
      root.render(React.createElement(FullscreenTestConsumer));
    });

    const statusEl = container.querySelector('[data-testid="status"]');
    expect(statusEl.textContent).toBe("FULL");

    const button = container.querySelector('[data-testid="toggle-btn"]');
    await act(async function () {
      button.click();
    });

    expect(exitFullscreenCalled).toBe(true);
  });

  it("updates isFullscreen state on fullscreenchange event", async function () {
    let currentElement = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: function () {
        return currentElement;
      }
    });

    await act(async function () {
      root.render(React.createElement(FullscreenTestConsumer));
    });

    const statusEl = container.querySelector('[data-testid="status"]');
    expect(statusEl.textContent).toBe("WINDOWED");

    await act(async function () {
      currentElement = document.documentElement;
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(statusEl.textContent).toBe("FULL");

    await act(async function () {
      currentElement = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(statusEl.textContent).toBe("WINDOWED");
  });

  it("handles requestFullscreen rejection gracefully", async function () {
    document.documentElement.requestFullscreen = function () {
      return Promise.reject(new Error("Fullscreen denied by permissions policy"));
    };

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null
    });

    await act(async function () {
      root.render(React.createElement(FullscreenTestConsumer));
    });

    const button = container.querySelector('[data-testid="toggle-btn"]');
    await expect(
      act(async function () {
        button.click();
      })
    ).resolves.not.toThrow();
  });

  it("renders Fullscreen button in Sidebar expanded and collapsed (SSR)", function () {
    const htmlExpanded = renderToString(React.createElement(Sidebar, { activePage: "dashboard" }));
    expect(htmlExpanded).toContain('title="Fullscreen"');
    expect(htmlExpanded).toContain('aria-label="Fullscreen"');

    try {
      window.localStorage.setItem("storeflow_sidebar_collapsed", "true");
    } catch (e) {}
    const htmlCollapsed = renderToString(React.createElement(Sidebar, { activePage: "dashboard" }));
    expect(htmlCollapsed).toContain('title="Fullscreen"');
    expect(htmlCollapsed).toContain('aria-label="Fullscreen"');
  });


  it("renders Fullscreen button in App header when authenticated", async function () {
    setAuthToken("test-token");
    vi.spyOn(api, "getAuthStatus").mockResolvedValue({ is_setup_required: false });
    vi.spyOn(api, "getCapabilities").mockResolvedValue({ cash_drawer: false });
    vi.spyOn(api, "getMe").mockResolvedValue({
      user_id: "user-1",
      username: "cashier",
      full_name: "Cashier One",
      role: "CASHIER"
    });
    vi.spyOn(api, "getSettings").mockResolvedValue({
      store_name: "Duane Store",
      capabilities: {}
    });

    await act(async function () {
      root.render(React.createElement(App, { initialPage: "pos" }));
    });

    const fullscreenButton = container.querySelector('header button[aria-label="Fullscreen"]');
    expect(fullscreenButton).not.toBeNull();
  });
});
