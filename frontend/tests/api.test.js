import { afterEach, describe, expect, it, vi } from "vitest";
import { api, resolveImageUrl } from "../src/api.js";

function stubFetchSuccess(data) {
  const fetchMock = vi.fn(function mockFetch() {
    return Promise.resolve({
      ok: true,
      json: function readJson() {
        return Promise.resolve({ data: data });
      }
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(function cleanup() {
  vi.unstubAllGlobals();
});

describe("api client", function () {
  it("returns response data and encodes path parameters", async function () {
    const fetchMock = stubFetchSuccess({ product_id: "p1" });

    const product = await api.getProduct("p 1");
    expect(product).toEqual({ product_id: "p1" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/products/p%201");
    expect(fetchMock.mock.calls[0][1]).toEqual({ method: "GET", headers: {} });

    await api.lookupBarcode("ABC/123");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/products/barcode/ABC%2F123");
  });

  it("uses server error messages and a safe fallback", async function () {
    vi.stubGlobal(
      "fetch",
      vi.fn(function mockFetch() {
        return Promise.resolve({
          ok: false,
          json: function readJson() {
            return Promise.resolve({ error: { message: "Bad input" } });
          }
        });
      })
    );
    await expect(api.listProducts()).rejects.toThrow("Bad input");

    vi.stubGlobal(
      "fetch",
      vi.fn(function mockFetch() {
        return Promise.resolve({
          ok: false,
          json: function readJson() {
            return Promise.resolve({});
          }
        });
      })
    );
    await expect(api.listProducts()).rejects.toThrow("Request failed");
  });

  it("sends FormData without a JSON content type", async function () {
    const fetchMock = stubFetchSuccess({ uploaded: true });

    const response = await api.uploadProductImage("p1", new Blob(["image"]));

    expect(response).toEqual({ uploaded: true });
    const options = fetchMock.mock.calls[0][1];
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({});
    expect(options.body instanceof FormData).toBe(true);
  });

  it("builds list and report query strings", async function () {
    const fetchMock = stubFetchSuccess([]);

    await api.listSales(25);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/sales?limit=25");

    await api.getReportsSummary("2026-11-01", "2026-11-22");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/reports/summary?from=2026-11-01&to=2026-11-22"
    );

    await api.getTopProducts("2026-11-01", "2026-11-22", 5);
    expect(fetchMock.mock.calls[2][0]).toBe(
      "/api/reports/top-products?from=2026-11-01&to=2026-11-22&limit=5"
    );

    await api.listCustomers(" Ana ");
    const customerUrl = new URL(fetchMock.mock.calls[3][0], "http://localhost");
    expect(customerUrl.pathname).toBe("/api/customers");
    expect(customerUrl.searchParams.get("q")).toBe(" Ana ");

    await api.listCreditTransactions("cust 1", 10);
    const transactionUrl = new URL(fetchMock.mock.calls[4][0], "http://localhost");
    expect(transactionUrl.pathname).toBe("/api/customers/cust%201/transactions");
    expect(transactionUrl.searchParams.get("limit")).toBe("10");
  });

  it("resolves absolute and relative image URLs", function () {
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl("")).toBeNull();
    expect(resolveImageUrl("https://example.com/photo.png")).toBe(
      "https://example.com/photo.png"
    );
    expect(resolveImageUrl("http://example.com/photo.png")).toBe(
      "http://example.com/photo.png"
    );
    expect(resolveImageUrl("/uploads/photo.png")).toBe("/uploads/photo.png");
  });
});
