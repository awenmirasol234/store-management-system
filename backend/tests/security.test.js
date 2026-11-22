import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

let activeServer = null;
let activeDatabase = null;

afterEach(async function teardown() {
  if (activeServer) {
    await new Promise(function closeServer(resolve) {
      activeServer.close(resolve);
    });
    activeServer = null;
  }
  if (activeDatabase) {
    activeDatabase.close();
    activeDatabase = null;
  }
});

async function startSecurityTestServer(options) {
  const uploadsDir = path.join(os.tmpdir(), "store-mgmt-security-uploads");
  const config = Object.assign(
    {
      databasePath: ":memory:",
      uploadsDir: uploadsDir,
      enforceAuth: true
    },
    options
  );

  const runtime = createApp(config);
  activeDatabase = runtime.database;

  await new Promise(function listen(resolve) {
    activeServer = runtime.app.listen(0, "127.0.0.1", resolve);
  });

  const address = activeServer.address();
  return {
    baseUrl: "http://127.0.0.1:" + String(address.port),
    runtime: runtime
  };
}

async function requestJson(baseUrl, method, routePath, body, token) {
  const options = {
    method: method,
    headers: {}
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  if (token) {
    options.headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(baseUrl + routePath, options);
  const payload = await response.json();
  return {
    status: response.status,
    headers: response.headers,
    body: payload
  };
}

describe("Security Features & Hardening", function () {
  it("includes security headers in HTTP responses", async function () {
    const server = await startSecurityTestServer();
    const res = await requestJson(server.baseUrl, "GET", "/api/health");

    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("handles first-time owner setup and rejects duplicate setup attempts", async function () {
    const server = await startSecurityTestServer();

    // Check status
    const statusBefore = await requestJson(server.baseUrl, "GET", "/api/auth/status");
    expect(statusBefore.status).toBe(200);
    expect(statusBefore.body.data.is_setup_required).toBe(true);

    // Initial setup
    const setupRes = await requestJson(server.baseUrl, "POST", "/api/auth/setup", {
      username: "owner",
      full_name: "Maria Santos",
      pin: "1234"
    });
    expect(setupRes.status).toBe(201);
    expect(setupRes.body.data.user.role).toBe("OWNER");
    expect(setupRes.body.data.token).toBeDefined();

    // Duplicate setup must fail
    const duplicateRes = await requestJson(server.baseUrl, "POST", "/api/auth/setup", {
      username: "owner2",
      full_name: "Second Owner",
      pin: "9999"
    });
    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe("CONFLICT");
  });

  it("enforces brute-force rate limiting on login after consecutive failures", async function () {
    const server = await startSecurityTestServer();

    // Setup initial owner
    await requestJson(server.baseUrl, "POST", "/api/auth/setup", {
      username: "owner",
      full_name: "Maria Santos",
      pin: "1234"
    });

    // 5 invalid attempts
    for (let index = 0; index < 5; index = index + 1) {
      const failRes = await requestJson(server.baseUrl, "POST", "/api/auth/login", {
        username: "owner",
        pin: "0000"
      });
      expect(failRes.status).toBe(401);
      expect(failRes.body.error.code).toBe("UNAUTHORIZED");
    }

    // 6th attempt should be blocked by rate limiter
    const blockedRes = await requestJson(server.baseUrl, "POST", "/api/auth/login", {
      username: "owner",
      pin: "1234"
    });
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("enforces Role-Based Access Control (RBAC) across endpoints", async function () {
    const server = await startSecurityTestServer({ enforceAuth: true });

    // 1. Initial owner setup
    const setupRes = await requestJson(server.baseUrl, "POST", "/api/auth/setup", {
      username: "owner",
      full_name: "Maria Santos",
      pin: "1234"
    });
    const ownerToken = setupRes.body.data.token;

    // 2. Owner creates a Cashier account
    const createCashierRes = await requestJson(
      server.baseUrl,
      "POST",
      "/api/users",
      {
        username: "cashier1",
        full_name: "Juan Cashier",
        role: "CASHIER",
        pin: "5678"
      },
      ownerToken
    );
    expect(createCashierRes.status).toBe(201);

    // 3. Cashier logs in
    const cashierLogin = await requestJson(server.baseUrl, "POST", "/api/auth/login", {
      username: "cashier1",
      pin: "5678"
    });
    const cashierToken = cashierLogin.body.data.token;

    // 4. Unauthenticated request to protected reports endpoint -> 401
    const unauthReports = await requestJson(server.baseUrl, "GET", "/api/reports/summary");
    expect(unauthReports.status).toBe(401);
    expect(unauthReports.body.error.code).toBe("UNAUTHORIZED");

    // 5. Cashier request to reports endpoint -> 403 Forbidden
    const cashierReports = await requestJson(
      server.baseUrl,
      "GET",
      "/api/reports/summary",
      undefined,
      cashierToken
    );
    expect(cashierReports.status).toBe(403);
    expect(cashierReports.body.error.code).toBe("FORBIDDEN");

    // 6. Owner request to reports endpoint -> 200 OK
    const ownerReports = await requestJson(
      server.baseUrl,
      "GET",
      "/api/reports/summary",
      undefined,
      ownerToken
    );
    expect(ownerReports.status).toBe(200);

    // 7. Cashier attempting to create users -> 403 Forbidden
    const cashierCreateUser = await requestJson(
      server.baseUrl,
      "POST",
      "/api/users",
      {
        username: "cashier2",
        full_name: "Another",
        role: "CASHIER",
        pin: "1111"
      },
      cashierToken
    );
    expect(cashierCreateUser.status).toBe(403);

    // 8. Cashier accessing POS sales -> allowed
    const listSalesRes = await requestJson(
      server.baseUrl,
      "GET",
      "/api/sales",
      undefined,
      cashierToken
    );
    expect(listSalesRes.status).toBe(200);
    expect(Array.isArray(listSalesRes.body.data)).toBe(true);

    // 9. Logout invalidates session
    const logoutRes = await requestJson(
      server.baseUrl,
      "POST",
      "/api/auth/logout",
      {},
      cashierToken
    );
    expect(logoutRes.status).toBe(200);

    // After logout, accessing with old token returns 401
    const afterLogoutRes = await requestJson(
      server.baseUrl,
      "GET",
      "/api/auth/me",
      undefined,
      cashierToken
    );
    expect(afterLogoutRes.status).toBe(401);
  });
});
