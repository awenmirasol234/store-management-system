// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { exportToCsv } from "../src/export.js";

describe("CSV export", function () {
  afterEach(function cleanup() {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("exports headers when there are no rows and preserves a CSV extension", function () {
    let clickedLink;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clickedLink = this;
    });

    const result = exportToCsv("report.CSV", [{ key: "name", label: "Name" }], []);

    expect(result).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
    expect(clickedLink.download).toBe("report.CSV");
    expect(decodeURIComponent(clickedLink.href)).toContain('"Name"');
  });

  it("protects formula-like text and preserves carriage returns as CSV fields", function () {
    let clickedLink;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clickedLink = this;
    });

    exportToCsv("report", [
      { key: "formula", label: "Formula" },
      { key: "notes", label: "Notes" }
    ], [
      { formula: "=2+2", notes: "line one\rline two" },
      { formula: " +cmd", notes: "plain" }
    ]);

    const csv = decodeURIComponent(clickedLink.href);
    expect(csv).toContain('"\'' + '=2+2"');
    expect(csv).toContain('"\'' + ' +cmd"');
    expect(csv).toContain('"line one\rline two"');
  });
});
