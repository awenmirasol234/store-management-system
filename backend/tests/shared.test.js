import { describe, expect, it } from "vitest";
import {
  divideMoneyToQuantityInt,
  fromMoneyInt,
  fromQuantityInt,
  multiplyMoneyByQuantityInt,
  multiplyQuantitiesInt,
  toMoneyInt,
  toQuantityInt
} from "../src/shared/decimal.js";
import { formatManilaDateParts } from "../src/shared/ports.js";
import {
  normalizeBoolean,
  normalizeOptionalEnum,
  normalizeOptionalQueryText,
  normalizeOptionalText,
  parseNonNegativeOffset,
  parsePositiveLimit,
  requireObjectBody,
  requireRouteParam,
  requireNonEmptyText
} from "../src/shared/validation.js";
import { ValidationError } from "../src/shared/errors.js";

describe("shared decimal and clock helpers", function () {
  it("converts exact DECIMAL(12,2) money and DECIMAL(12,4) quantities", function () {
    expect(toMoneyInt("15.50", "price")).toBe(1550);
    expect(fromMoneyInt(1550)).toBe(15.5);

    expect(toQuantityInt("0.25", "quantity")).toBe(2500);
    expect(fromQuantityInt(2500)).toBe(0.25);

    expect(toQuantityInt("-12.3456", "adjustment")).toBe(-123456);
    expect(fromQuantityInt(-123456)).toBe(-12.3456);
  });

  it("rejects excessive decimal places and out-of-range precision", function () {
    expect(function () {
      toMoneyInt("10.123", "price");
    }).toThrow(ValidationError);

    expect(function () {
      toQuantityInt("1.12345", "quantity");
    }).toThrow(ValidationError);

    expect(function () {
      toMoneyInt("10000000000.00", "price");
    }).toThrow(ValidationError);
  });

  it("multiplies quantities and money without floating-point drift", function () {
    const subtotalInt = multiplyMoneyByQuantityInt(toMoneyInt("0.10"), toQuantityInt("3"));
    expect(fromMoneyInt(subtotalInt)).toBe(0.3);

    const boxBaseQty = multiplyQuantitiesInt(toQuantityInt("2"), toQuantityInt("40"));
    expect(fromQuantityInt(boxBaseQty)).toBe(80);
  });

  it("rounds custom peso amount division half-up to 4 decimal places", function () {
    // ₱10 worth of ₱60/kg rice = 0.166666... -> 0.1667 kg
    const baseQtyInt = divideMoneyToQuantityInt(toMoneyInt("10"), toMoneyInt("60"));
    expect(fromQuantityInt(baseQtyInt)).toBe(0.1667);

    // ₱7 worth of ₱0.20/ml cooking oil = 35 ml
    const oilMlInt = divideMoneyToQuantityInt(toMoneyInt("7"), toMoneyInt("0.20"));
    expect(fromQuantityInt(oilMlInt)).toBe(35);
  });

  it("computes Asia/Manila (UTC+8) business date across UTC midnight", function () {
    // 2026-11-20T16:30:00Z is 2026-11-21 00:30 in Asia/Manila
    const parts = formatManilaDateParts(new Date("2026-11-20T16:30:00.000Z"));
    expect(parts.compact).toBe("20261121");
    expect(parts.isoDate).toBe("2026-11-21");
  });

  it("parses positive integer limits and rejects invalid or negative inputs", function () {
    expect(parsePositiveLimit("15", 50, "limit")).toBe(15);
    expect(parsePositiveLimit(undefined, 50, "limit")).toBe(50);
    expect(parsePositiveLimit(null, 50, "limit")).toBe(50);
    expect(parsePositiveLimit("   ", 50, "limit")).toBe(50);

    expect(function () {
      parsePositiveLimit("0", 50, "limit");
    }).toThrow(ValidationError);

    expect(function () {
      parsePositiveLimit("-5", 50, "limit");
    }).toThrow(ValidationError);

    expect(function () {
      parsePositiveLimit("abc", 50, "limit");
    }).toThrow(ValidationError);

    expect(function () {
      parsePositiveLimit("1.5", 50, "limit");
    }).toThrow(ValidationError);
  });

  it("validates and normalizes text and boolean primitives", function () {
    expect(requireNonEmptyText("  hello world  ", "name")).toBe("hello world");
    expect(function () {
      requireNonEmptyText("   ", "name");
    }).toThrow(ValidationError);
    expect(function () {
      requireNonEmptyText(123, "name");
    }).toThrow(ValidationError);

    expect(normalizeOptionalText("  trimmed  ", "desc")).toBe("trimmed");
    expect(normalizeOptionalText("   ", "desc")).toBeNull();
    expect(normalizeOptionalText(undefined, "desc")).toBeNull();
    expect(normalizeOptionalText(null, "desc")).toBeNull();
    expect(function () {
      normalizeOptionalText(123, "desc");
    }).toThrow(ValidationError);

    expect(normalizeBoolean(true, false, "active")).toBe(true);
    expect(normalizeBoolean(false, true, "active")).toBe(false);
    expect(normalizeBoolean(undefined, true, "active")).toBe(true);
    expect(normalizeBoolean(null, true, "active")).toBe(true);
    expect(function () {
      normalizeBoolean("true", true, "active");
    }).toThrow(ValidationError);
  });

  it("validates HTTP boundary primitives", function () {
    const body = { name: "value" };
    expect(requireObjectBody(body)).toBe(body);
    expect(requireRouteParam({ itemId: "abc" }, "itemId")).toBe("abc");
    expect(normalizeOptionalQueryText("  search  ", "q")).toBe("search");
    expect(parseNonNegativeOffset("4", 0, "offset")).toBe(4);

    expect(function () {
      requireObjectBody([]);
    }).toThrow(ValidationError);
    expect(function () {
      requireObjectBody(null);
    }).toThrow(ValidationError);
    expect(function () {
      requireRouteParam({ itemId: " " }, "itemId");
    }).toThrow(ValidationError);
    expect(function () {
      normalizeOptionalQueryText(["a", "b"], "q");
    }).toThrow(ValidationError);
    expect(function () {
      parseNonNegativeOffset("-1", 0, "offset");
    }).toThrow(ValidationError);
    expect(function () {
      normalizeOptionalEnum("UNKNOWN", new Set(["OPEN", "CLOSED"]), "status");
    }).toThrow(ValidationError);
  });
});
