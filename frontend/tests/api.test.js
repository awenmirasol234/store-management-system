import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  clearAuthToken,
  getAuthToken,
  resolveImageUrl,
  setAuthToken
} from "../src/api.js";

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

  it("attaches auth token when present and handles auth endpoints", async function () {
    clearAuthToken();
    expect(getAuthToken()).toBeNull();

    setAuthToken("test_token_123");
    expect(getAuthToken()).toBe("test_token_123");

    const fetchMock = stubFetchSuccess({ username: "owner" });
    const me = await api.getMe();
    expect(me).toEqual({ username: "owner" });

    const callHeaders = fetchMock.mock.calls[0][1].headers;
    expect(callHeaders.Authorization).toBe("Bearer test_token_123");

    await api.getAuthStatus();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/status");

    await api.setupInitialOwner({ username: "owner", pin: "1234" });
    expect(fetchMock.mock.calls[2][0]).toBe("/api/auth/setup");
    expect(fetchMock.mock.calls[2][1].method).toBe("POST");

    await api.login({ username: "owner", pin: "1234" });
    expect(fetchMock.mock.calls[3][0]).toBe("/api/auth/login");

    await api.logout();
    expect(fetchMock.mock.calls[4][0]).toBe("/api/auth/logout");

    await api.listUsers();
    expect(fetchMock.mock.calls[5][0]).toBe("/api/users");

    await api.createUser({ username: "cashier1", pin: "5678" });
    expect(fetchMock.mock.calls[6][0]).toBe("/api/users");
    expect(fetchMock.mock.calls[6][1].method).toBe("POST");

    await api.updateUser("u1", { is_active: false });
    expect(fetchMock.mock.calls[7][0]).toBe("/api/users/u1");
    expect(fetchMock.mock.calls[7][1].method).toBe("PATCH");

    await api.changePin({ current_pin: "1234", new_pin: "5678" });
    expect(fetchMock.mock.calls[8][0]).toBe("/api/auth/change-pin");
    expect(fetchMock.mock.calls[8][1].method).toBe("POST");

    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it("automatically clears stored auth token when receiving 401 Unauthorized", async function () {
    setAuthToken("stale_token_999");
    expect(getAuthToken()).toBe("stale_token_999");

    vi.stubGlobal(
      "fetch",
      vi.fn(function mockFetch() {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: function readJson() {
            return Promise.resolve({
              error: { code: "UNAUTHORIZED", message: "Session expired" }
            });
          }
        });
      })
    );

    await expect(api.listProducts()).rejects.toThrow("Session expired");
    expect(getAuthToken()).toBeNull();
  });
});
