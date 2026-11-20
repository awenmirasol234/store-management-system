import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatPeso, formatQuantity, getManilaIsoDateOffset } from "../src/format.js";

describe("format helpers", function () {
  it("formats peso amounts with two decimals and a negative sign", function () {
    expect(formatPeso("12.5")).toBe("₱12.50");
    expect(formatPeso(-3)).toBe("-₱3.00");
    expect(formatPeso("abc")).toBe("₱0.00");
  });

  it("formats quantities without trailing zeros", function () {
    expect(formatQuantity("3.0000")).toBe("3");
    expect(formatQuantity("2.5000")).toBe("2.5");
    expect(formatQuantity("abc")).toBe("0");
  });

  describe("Manila dates", function () {
    beforeEach(function () {
      vi.useFakeTimers();
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    it("shifts the date across UTC midnight", function () {
      vi.setSystemTime(new Date("2026-11-20T16:30:00.000Z"));
      expect(getManilaIsoDateOffset(0)).toBe("2026-11-21");
      expect(getManilaIsoDateOffset(-1)).toBe("2026-11-20");
    });
  });
});
