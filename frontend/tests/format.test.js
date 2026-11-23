import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatManilaDateTime,
  formatManilaTime,
  formatPeso,
  formatQuantity,
  formatQuantityWithUnit,
  formatSmartDate,
  formatSmartDateTime,
  formatUnit,
  getManilaIsoDateOffset
} from "../src/format.js";

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

  describe("smart date labels", function () {
    // Reference: Friday, Nov 20, 2026 at 19:45 Manila time (11:45 UTC)
    const baseNow = new Date("2026-11-20T11:45:00.000Z");

    it("labels dates from earlier today as Today", function () {
      const todayEarlier = "2026-11-20T02:00:00.000Z"; // 10:00 AM Manila
      expect(formatSmartDate(todayEarlier, baseNow)).toBe("Today");
      expect(formatSmartDate("2026-11-20", baseNow)).toBe("Today");
    });

    it("labels dates from yesterday as Yesterday", function () {
      const yesterday = "2026-11-19T06:00:00.000Z"; // 2:00 PM Manila
      expect(formatSmartDate(yesterday, baseNow)).toBe("Yesterday");
    });

    it("labels dates earlier in the current Monday-Sunday week by weekday name", function () {
      // Nov 20 is Friday. Earlier in the week: Tuesday Nov 17, Wednesday Nov 18
      const wednesday = "2026-11-18T05:00:00.000Z";
      const tuesday = "2026-11-17T05:00:00.000Z";
      const monday = "2026-11-16T05:00:00.000Z";
      expect(formatSmartDate(wednesday, baseNow)).toBe("Wednesday");
      expect(formatSmartDate(tuesday, baseNow)).toBe("Tuesday");
      expect(formatSmartDate(monday, baseNow)).toBe("Monday");
    });

    it("labels dates before the current week as Month Day for this year", function () {
      // Prior week: Sunday Nov 15, Saturday Nov 14, or older months
      const lastSunday = "2026-11-15T05:00:00.000Z";
      const lastSaturday = "2026-11-14T05:00:00.000Z";
      const octoberDate = "2026-10-05T05:00:00.000Z";
      expect(formatSmartDate(lastSunday, baseNow)).toBe("Nov 15");
      expect(formatSmartDate(lastSaturday, baseNow)).toBe("Nov 14");
      expect(formatSmartDate(octoberDate, baseNow)).toBe("Oct 5");
    });

    it("labels dates from previous years as Month Day, Year", function () {
      const lastYear = "2025-12-24T05:00:00.000Z";
      const olderYear = "2024-05-10T05:00:00.000Z";
      expect(formatSmartDate(lastYear, baseNow)).toBe("Dec 24, 2025");
      expect(formatSmartDate(olderYear, baseNow)).toBe("May 10, 2024");
    });

    it("formats smart date and time correctly with formatSmartDateTime", function () {
      const saleDate = "2026-11-20T11:42:00.000Z"; // 7:42 PM Manila
      expect(formatSmartDateTime(saleDate, baseNow)).toBe("Today, 7:42 PM");

      const yesterdaySale = "2026-11-19T06:15:00.000Z"; // 2:15 PM Manila
      expect(formatSmartDateTime(yesterdaySale, baseNow)).toBe("Yesterday, 2:15 PM");
    });

    it("handles null, empty, and invalid inputs gracefully", function () {
      expect(formatSmartDate(null)).toBe("");
      expect(formatSmartDate("")).toBe("");
      expect(formatSmartDate("invalid-date")).toBe("invalid-date");
      expect(formatSmartDateTime(null)).toBe("");
      expect(formatManilaTime(null)).toBe("");
    });
  });

  describe("unit formatting & pluralization", function () {
    it("keeps unit singular when quantity is 1 or -1", function () {
      expect(formatUnit("Piece (pc)", 1)).toBe("Piece (pc)");
      expect(formatUnit("Piece (pc)", -1)).toBe("Piece (pc)");
      expect(formatUnit("Bottle", 1)).toBe("Bottle");
      expect(formatUnit("Box", 1)).toBe("Box");
      expect(formatQuantityWithUnit(1, "Piece (pc)")).toBe("1 Piece (pc)");
      expect(formatQuantityWithUnit(-1, "Bottle")).toBe("-1 Bottle");
    });

    it("pluralizes units when quantity is plural (0, >1, or fractional)", function () {
      expect(formatUnit("Piece (pc)", 0)).toBe("Pieces (pcs)");
      expect(formatUnit("Piece (pc)", 5)).toBe("Pieces (pcs)");
      expect(formatUnit("Piece (pc)", 0.5)).toBe("Pieces (pcs)");
      expect(formatUnit("Box", 2)).toBe("Boxes");
      expect(formatUnit("Pouch", 3)).toBe("Pouches");
      expect(formatUnit("Can", 3)).toBe("Cans");
      expect(formatUnit("Bottle", 10)).toBe("Bottles");
      expect(formatUnit("Kilogram (kg)", 2.5)).toBe("Kilograms (kg)");
      expect(formatUnit("Liter (L)", 0.5)).toBe("Liters (L)");
      expect(formatUnit("Tray", 4)).toBe("Trays");
      expect(formatQuantityWithUnit(5, "Piece (pc)")).toBe("5 Pieces (pcs)");
      expect(formatQuantityWithUnit(0, "Can")).toBe("0 Cans");
      expect(formatQuantityWithUnit(2.5, "Kilogram (kg)")).toBe("2.5 Kilograms (kg)");
    });

    it("supports lowercase and plain units", function () {
      expect(formatUnit("piece", 3)).toBe("pieces");
      expect(formatUnit("box", 2)).toBe("boxes");
      expect(formatUnit("pouch", 4)).toBe("pouches");
      expect(formatUnit("kg", 5)).toBe("kg");
      expect(formatUnit("pieces", 5)).toBe("pieces");
    });

    it("handles empty or missing units gracefully", function () {
      expect(formatUnit("", 5)).toBe("");
      expect(formatUnit(null, 5)).toBe("");
      expect(formatQuantityWithUnit(5, "")).toBe("5");
      expect(formatQuantityWithUnit(5, null)).toBe("5");
    });
  });
});
