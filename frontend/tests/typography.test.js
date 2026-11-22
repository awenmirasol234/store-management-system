import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Typography & Theme Centralization", function () {
  it("defines centralized font stacks and scale tokens in index.css", function () {
    const cssPath = path.resolve(__dirname, "../src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf8");

    // Font stacks
    expect(cssContent).toContain('--font-sans: "Inter", system-ui');
    expect(cssContent).toContain('--font-mono: "Inter", ui-monospace');

    // Centralized sub-12px and calibrated typography scale tokens
    expect(cssContent).toContain("--text-3xs: 0.625rem");
    expect(cssContent).toContain("--text-2xs: 0.6875rem");
    expect(cssContent).toContain("--text-tiny: 0.75rem");
    expect(cssContent).toContain("--text-xs: 0.8125rem");
    expect(cssContent).toContain("--text-sm: 0.875rem");
    expect(cssContent).toContain("--text-base: 1rem");
    expect(cssContent).toContain("--text-lg: 1.25rem");
    expect(cssContent).toContain("--text-xl: 1.375rem");
    expect(cssContent).toContain("--text-2xl: 1.625rem");
    expect(cssContent).toContain("--text-3xl: 1.875rem");

    // Base typography styling
    expect(cssContent).toContain("font-variant-numeric: tabular-nums");
    expect(cssContent).toContain("-webkit-font-smoothing: antialiased");
    expect(cssContent).toContain("font-size: var(--text-2xs)");
  });

  it("uses only centralized font-size utilities in component JSX", function () {
    const cssPath = path.resolve(__dirname, "../src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf8");
    const srcDir = path.resolve(__dirname, "../src");
    const violations = [];
    const sizePattern = /\b(?:sm:|md:|lg:|xl:)?text-(3xs|2xs|tiny|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)\b/g;
    const arbitraryPattern = /text-\[\d+(?:\.\d+)?(?:px|rem|em)\]/;

    function checkFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkFiles(fullPath);
        } else if (entry.name.endsWith(".jsx")) {
          const content = fs.readFileSync(fullPath, "utf8");
          if (arbitraryPattern.test(content)) {
            violations.push(entry.name + ": arbitrary font size");
          }
          for (const match of content.matchAll(sizePattern)) {
            const tokenName = match[1];
            if (!cssContent.includes("--text-" + tokenName + ":")) {
              violations.push(entry.name + ": missing --text-" + tokenName);
            }
          }
        }
      }
    }

    checkFiles(srcDir);
    expect(violations).toEqual([]);
  });
});
