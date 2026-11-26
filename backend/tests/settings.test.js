import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { openSqliteDatabase } from "../src/db/sqlite.js";
import { createApp } from "../src/app.js";
import { DEFAULT_STORE_SETTINGS, validateStoreSettings } from "../src/settings/domain.js";
import { createSqliteSettingsRepository } from "../src/settings/sqlite-repo.js";
import {
  createGetSettingsUseCase,
  createUpdateSettingsUseCase
} from "../src/settings/use-cases.js";
import { ROLES } from "../src/auth/domain.js";

describe("Store Settings Module", function () {
  describe("Domain Validation", function () {
    it("validates empty or invalid input", function () {
      expect(function () {
        validateStoreSettings(null);
      }).toThrow("Settings data is required");

      expect(function () {
        validateStoreSettings("invalid");
      }).toThrow("Settings data is required");
    });

    it("rejects empty store name", function () {
      expect(function () {
        validateStoreSettings({ store_name: "   " });
      }).toThrow("Store name cannot be empty");
    });

    it("rejects overly long store name", function () {
      const longName = "A".repeat(101);
      expect(function () {
        validateStoreSettings({ store_name: longName });
      }).toThrow("Store name cannot exceed 100 characters");
    });

    it("validates low stock threshold", function () {
      expect(function () {
        validateStoreSettings({ default_low_stock_threshold: -1 });
      }).toThrow("Default low stock threshold must be an integer between 0 and 10,000");

      expect(function () {
        validateStoreSettings({ default_low_stock_threshold: 1.5 });
      }).toThrow("Default low stock threshold must be an integer between 0 and 10,000");

      expect(function () {
        validateStoreSettings({ default_low_stock_threshold: 20000 });
      }).toThrow("Default low stock threshold must be an integer between 0 and 10,000");
    });

    it("validates sound and cashier toggles", function () {
      expect(function () {
        validateStoreSettings({ sound_enabled: 5 });
      }).toThrow("Sound enabled must be 0 or 1");

      expect(function () {
        validateStoreSettings({ show_cashier_on_receipt: "yes" });
      }).toThrow("Show cashier on receipt must be 0 or 1");
    });

    it("validates text fields length limit", function () {
      const longText = "X".repeat(501);
      expect(function () {
        validateStoreSettings({ tagline: longText });
      }).toThrow("Field tagline cannot exceed 500 characters");
    });
  });

  describe("SQLite Repository & Use Cases", function () {
    it("auto-seeds and returns default settings when empty", async function () {
      const db = openSqliteDatabase(":memory:");
      const repo = createSqliteSettingsRepository(db);

      const settings = await repo.getSettings();
      expect(settings).toBeDefined();
      expect(settings.id).toBe("default");
      expect(settings.store_name).toBe(DEFAULT_STORE_SETTINGS.store_name);
      expect(settings.default_low_stock_threshold).toBe(5);
      expect(settings.sound_enabled).toBe(1);
      expect(settings.show_cashier_on_receipt).toBe(1);
    });

    it("updates settings and preserves unmodified fields", async function () {
      const db = openSqliteDatabase(":memory:");
      const repo = createSqliteSettingsRepository(db);
      const clock = {
        now() {
          return new Date("2026-11-23T12:00:00.000Z");
        }
      };

      const getUseCase = createGetSettingsUseCase({ settingsRepository: repo });
      const updateUseCase = createUpdateSettingsUseCase({ settingsRepository: repo, clock: clock });

      const updated = await updateUseCase.execute({
        store_name: "Aling Nena Sari-Sari Store",
        address: "Barangay Poblacion, Makati City",
        phone: "0917-123-4567",
        default_low_stock_threshold: 10,
        sound_enabled: false
      });

      expect(updated.store_name).toBe("Aling Nena Sari-Sari Store");
      expect(updated.address).toBe("Barangay Poblacion, Makati City");
      expect(updated.phone).toBe("0917-123-4567");
      expect(updated.default_low_stock_threshold).toBe(10);
      expect(updated.sound_enabled).toBe(0);
      expect(updated.updated_at).toBe("2026-11-23T12:00:00.000Z");

      const fetched = await getUseCase.execute();
      expect(fetched.store_name).toBe("Aling Nena Sari-Sari Store");
      expect(fetched.sound_enabled).toBe(0);
      expect(fetched.show_cashier_on_receipt).toBe(1);
    });
  });

  describe("Express REST API", function () {
    let server = null;
    let baseUrl = "";
    let tempDbFile = "";

    beforeEach(async function () {
      tempDbFile = path.join(os.tmpdir(), "storeflow-test-" + Date.now() + ".db");
      const appRoot = createApp({
        databasePath: tempDbFile,
        enforceAuth: false,
        operationMode: "multi_user",
        features: { cashDrawer: true }
      });

      await new Promise(function (resolve) {
        server = appRoot.app.listen(0, function () {
          const port = server.address().port;
          baseUrl = "http://127.0.0.1:" + port;
          resolve();
        });
      });
    });

    afterEach(async function () {
      if (server) {
        await new Promise(function (resolve) {
          server.close(resolve);
        });
      }
      if (tempDbFile && fs.existsSync(tempDbFile)) {
        try {
          fs.unlinkSync(tempDbFile);
        } catch (error) {
          // ignore cleanup error
        }
      }
    });

    it("GET /api/settings returns settings object", async function () {
      const response = await fetch(baseUrl + "/api/settings");
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.store_name).toBe("Duane Store");
    });

    it("PATCH /api/settings updates settings", async function () {
      const response = await fetch(baseUrl + "/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: "Super Sari-Sari Mart",
          tax_number: "TIN-987-654-321"
        })
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.store_name).toBe("Super Sari-Sari Mart");
      expect(body.data.tax_number).toBe("TIN-987-654-321");

      const verifyRes = await fetch(baseUrl + "/api/settings");
      const verifyBody = await verifyRes.json();
      expect(verifyBody.data.store_name).toBe("Super Sari-Sari Mart");
    });

    it("GET /api/settings/backup downloads sqlite database file", async function () {
      const response = await fetch(baseUrl + "/api/settings/backup");
      expect(response.status).toBe(200);
      const disposition = response.headers.get("content-disposition");
      expect(disposition).toContain("storeflow-backup-");
      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe("Role-Based Access Control (RBAC)", function () {
    let server = null;
    let baseUrl = "";
    let ownerToken = "";
    let cashierToken = "";

    beforeEach(async function () {
      const appRoot = createApp({
        databasePath: ":memory:",
        enforceAuth: true,
        operationMode: "multi_user",
        features: { cashDrawer: true }
      });

      // Seed owner and cashier
      await appRoot.useCases.auth.setupInitialOwner({
        username: "testowner",
        full_name: "Test Owner",
        pin: "123456"
      });

      const ownerLogin = await appRoot.useCases.auth.login({
        username: "testowner",
        pin: "123456"
      });
      ownerToken = ownerLogin.token;

      const cashierUser = await appRoot.useCases.auth.createUser({
        username: "testcashier",
        full_name: "Test Cashier",
        role: ROLES.CASHIER,
        pin: "654321"
      });

      const cashierLogin = await appRoot.useCases.auth.login({
        username: "testcashier",
        pin: "654321"
      });
      cashierToken = cashierLogin.token;

      await new Promise(function (resolve) {
        server = appRoot.app.listen(0, function () {
          const port = server.address().port;
          baseUrl = "http://127.0.0.1:" + port;
          resolve();
        });
      });
    });

    afterEach(async function () {
      if (server) {
        await new Promise(function (resolve) {
          server.close(resolve);
        });
      }
    });

    it("allows cashier to read settings", async function () {
      const response = await fetch(baseUrl + "/api/settings", {
        headers: { Authorization: "Bearer " + cashierToken }
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.store_name).toBe("Duane Store");
    });

    it("forbids cashier from updating settings", async function () {
      const response = await fetch(baseUrl + "/api/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + cashierToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ store_name: "Hacked Store" })
      });
      expect(response.status).toBe(403);
    });

    it("forbids cashier from downloading backup", async function () {
      const response = await fetch(baseUrl + "/api/settings/backup", {
        headers: { Authorization: "Bearer " + cashierToken }
      });
      expect(response.status).toBe(403);
    });

    it("allows owner to update settings", async function () {
      const response = await fetch(baseUrl + "/api/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + ownerToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ store_name: "Owner Updated Store" })
      });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.store_name).toBe("Owner Updated Store");
    });
  });
});
