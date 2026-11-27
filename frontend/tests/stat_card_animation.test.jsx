// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { StatCard } from "../src/components/StatCard.jsx";
import { formatPeso } from "../src/format.js";

describe("StatCard count-up animation", function () {
  let container = null;
  let root = null;
  let animationFrames = new Map();
  let nextFrameId = 1;

  beforeEach(function () {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    animationFrames = new Map();
    nextFrameId = 1;
    vi.spyOn(performance, "now").mockReturnValue(0);
    vi.stubGlobal("requestAnimationFrame", function (callback) {
      const frameId = nextFrameId;
      nextFrameId = nextFrameId + 1;
      animationFrames.set(frameId, callback);
      return frameId;
    });
    vi.stubGlobal("cancelAnimationFrame", function (frameId) {
      animationFrames.delete(frameId);
    });
    vi.stubGlobal("matchMedia", function () {
      return { matches: false };
    });
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
    vi.unstubAllGlobals();
  });

  it("animates a formatted value smoothly to its target", async function () {
    await act(async function () {
      root.render(
        React.createElement(StatCard, {
          label: "Sales",
          value: "₱1,000.00",
          countUpValue: 1000,
          formatCountUp: formatPeso
        })
      );
    });

    const value = container.querySelector(".font-mono.text-2xl");
    expect(value.textContent).toBe("₱0.00");

    await act(async function () {
      const callback = animationFrames.values().next().value;
      animationFrames.clear();
      callback(450);
    });
    expect(value.textContent).toBe("₱875.00");

    await act(async function () {
      const callback = animationFrames.values().next().value;
      animationFrames.clear();
      callback(900);
    });
    expect(value.textContent).toBe("₱1,000.00");
  });

  it("shows the target immediately when reduced motion is preferred", async function () {
    vi.stubGlobal("matchMedia", function () {
      return { matches: true };
    });

    await act(async function () {
      root.render(
        React.createElement(StatCard, {
          label: "Sales",
          value: "₱1,000.00",
          countUpValue: 1000,
          formatCountUp: formatPeso
        })
      );
    });

    expect(container.querySelector(".font-mono.text-2xl").textContent).toBe("₱1,000.00");
    expect(animationFrames.size).toBe(0);
  });
});
