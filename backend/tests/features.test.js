import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createFeatureConfig } from "../src/shared/features.js";

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

describe("centralized feature configuration", function () {
  it("defaults to single-user mode without a cash drawer", function () {
    const features = createFeatureConfig({ features: {} });

    expect(features.mode).toBe("single_user");
    expect(features.staffManagement).toBe(false);
    expect(features.roles).toBe(false);
    expect(features.cashDrawer).toBe(false);
    expect(features.customerCredit).toBe(true);
  });

  it("enables staff and independently configured features in multi-user mode", function () {
    const features = createFeatureConfig({
      operationMode: "multi_user",
      features: {
        cashDrawer: true,
        customerCredit: false
      }
    });

    expect(features.staffManagement).toBe(true);
    expect(features.roles).toBe(true);
    expect(features.cashDrawer).toBe(true);
    expect(features.customerCredit).toBe(false);
  });

  it("reports capabilities and blocks disabled routes", async function () {
    const runtime = createApp({
      databasePath: ":memory:",
      enforceAuth: false,
      features: {
        customerCredit: false
      }
    });
    activeDatabase = runtime.database;

    await new Promise(function listen(resolve) {
      activeServer = runtime.app.listen(0, "127.0.0.1", resolve);
    });

    const address = activeServer.address();
    const baseUrl = "http://127.0.0.1:" + String(address.port);
    const capabilitiesResponse = await fetch(baseUrl + "/api/capabilities");
    const capabilitiesBody = await capabilitiesResponse.json();
    expect(capabilitiesBody.data.mode).toBe("single_user");
    expect(capabilitiesBody.data.customer_credit).toBe(false);

    const disabledResponse = await fetch(baseUrl + "/api/customers");
    const disabledBody = await disabledResponse.json();
    expect(disabledResponse.status).toBe(404);
    expect(disabledBody.error.code).toBe("FEATURE_DISABLED");
  });
});
