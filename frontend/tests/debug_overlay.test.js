import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DebugOverlay, getBreakpoint, SPACING_SCALE } from "../src/components/DebugOverlay.jsx";

describe("DebugOverlay Component", function () {
  it("computes standard Tailwind breakpoints accurately", function () {
    expect(getBreakpoint(375).name).toBe("xs");
    expect(getBreakpoint(640).name).toBe("sm");
    expect(getBreakpoint(768).name).toBe("md");
    expect(getBreakpoint(1024).name).toBe("lg");
    expect(getBreakpoint(1280).name).toBe("xl");
    expect(getBreakpoint(1536).name).toBe("2xl");
  });

  it("exports standard Tailwind spacing scale values", function () {
    expect(SPACING_SCALE.length).toBeGreaterThanOrEqual(10);
    const p4 = SPACING_SCALE.find(function (s) {
      return s.token === "4";
    });
    expect(p4).toBeDefined();
    expect(p4.px).toBe(16);
    expect(p4.rem).toBe("1rem");

    const p2 = SPACING_SCALE.find(function (s) {
      return s.token === "2";
    });
    expect(p2).toBeDefined();
    expect(p2.px).toBe(8);
  });

  it("renders compact debug pill when defaultVisible is true", function () {
    const html = renderToString(React.createElement(DebugOverlay, { defaultVisible: true }));
    expect(html).toContain("1024px × 768px");
    expect(html).toContain("LG");
    expect(html).toContain("Alt+D");
  });

  it("returns null when defaultVisible is false", function () {
    const html = renderToString(React.createElement(DebugOverlay, { defaultVisible: false }));
    expect(html).toBe("");
  });
});
