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

    // Centralized sub-12px typography scale tokens
    expect(cssContent).toContain("--text-2xs: 0.625rem");
    expect(cssContent).toContain("--text-tiny: 0.6875rem");

    // Base typography styling
    expect(cssContent).toContain("font-variant-numeric: tabular-nums");
    expect(cssContent).toContain("-webkit-font-smoothing: antialiased");
  });

  it("does not use arbitrary text-[10px] or text-[11px] in component JSX", function () {
    const srcDir = path.resolve(__dirname, "../src");
    const violations = [];

    function checkFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkFiles(fullPath);
        } else if (entry.name.endsWith(".jsx")) {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.includes("text-[10px]") || content.includes("text-[11px]")) {
            violations.push(entry.name);
          }
        }
      }
    }

    checkFiles(srcDir);
    expect(violations).toEqual([]);
  });
});
