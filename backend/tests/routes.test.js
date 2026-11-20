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

async function startTestServer() {
  const uploadsDir = path.join(os.tmpdir(), "store-mgmt-test-uploads");
  const runtime = createApp({
    databasePath: ":memory:",
    uploadsDir: uploadsDir,
    clock: {
      nowIso() {
        return "2026-11-20T02:00:00.000Z";
      },
      todayManilaCompact() {
        return "20261120";
      },
      todayManilaIsoDate() {
        return "2026-11-20";
      }
    }
  });
  activeDatabase = runtime.database;

  await new Promise(function listen(resolve) {
    activeServer = runtime.app.listen(0, "127.0.0.1", resolve);
  });

  const address = activeServer.address();
  return "http://127.0.0.1:" + String(address.port);
}

async function requestJson(baseUrl, method, routePath, body) {
  const options = {
    method: method,
    headers: {}
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(baseUrl + routePath, options);
  const payload = await response.json();
  return {
    status: response.status,
    body: payload
  };
}

describe("Express REST API routes", function () {
  it("handles products, selling options, barcode lookup, stock-in, sales, returns, and soft delete", async function () {
    const baseUrl = await startTestServer();

    const health = await requestJson(baseUrl, "GET", "/api/health");
    expect(health.status).toBe(200);
    expect(health.body.data.status).toBe("ok");

    // Create product
    const createRes = await requestJson(baseUrl, "POST", "/api/products", {
      product_name: "Instant Noodles",
      barcode: "480111",
      base_unit: "piece",
      current_stock: 10,
      cost_price: 10,
      selling_price: 15,
      reorder_level: 12
    });
    expect(createRes.status).toBe(201);
    const productId = createRes.body.data.product_id;

    // Add pack option with its own barcode
    const optionRes = await requestJson(
      baseUrl,
      "POST",
      "/api/products/" + productId + "/options",
      {
        option_name: "1 Pack (5 pcs)",
        barcode: "480111-PACK",
        quantity: 5,
        price: 70
      }
    );
    expect(optionRes.status).toBe(201);
    const optionId = optionRes.body.data.option_id;

    // Barcode lookup matches option directly
    const barcodeRes = await requestJson(baseUrl, "GET", "/api/products/barcode/480111-PACK");
    expect(barcodeRes.status).toBe(200);
    expect(barcodeRes.body.data.match_type).toBe("OPTION");
    expect(barcodeRes.body.data.option.option_id).toBe(optionId);

    // Low-stock alert (10 <= 12)
    const lowStockRes = await requestJson(baseUrl, "GET", "/api/products/low-stock");
    expect(lowStockRes.status).toBe(200);
    expect(lowStockRes.body.data.length).toBe(1);

    // Bulk stock-in: 2 packs = +10 pieces -> stock becomes 20
    const stockInRes = await requestJson(baseUrl, "POST", "/api/inventory/stock-in", {
      product_id: productId,
      option_id: optionId,
      quantity: 2,
      unit_cost: 11,
      created_by: "owner-1"
    });
    expect(stockInRes.status).toBe(201);
    expect(stockInRes.body.data.product.current_stock).toBe(20);
    expect(stockInRes.body.data.product.cost_price).toBe(11);

    // Process CASH sale of 1 pack (₱70, paid ₱100 -> change ₱30, stock -> 15)
    const saleRes = await requestJson(baseUrl, "POST", "/api/sales", {
      items: [{ product_id: productId, option_id: optionId, quantity: 1 }],
      payment_method: "CASH",
      amount_paid: 100,
      created_by: "cashier-1"
    });
    expect(saleRes.status).toBe(201);
    expect(saleRes.body.data.sale.receipt_number).toBe("20261120-0001");
    expect(saleRes.body.data.sale.change_amount).toBe(30);

    const saleId = saleRes.body.data.sale.sale_id;
    const saleItemId = saleRes.body.data.items[0].sale_item_id;

    // Process return of 1 pack (restores stock -> 20)
    const returnRes = await requestJson(baseUrl, "POST", "/api/sales/" + saleId + "/returns", {
      items: [{ sale_item_id: saleItemId, quantity: 1 }],
      remarks: "Damaged seal",
      created_by: "cashier-1"
    });
    expect(returnRes.status).toBe(201);
    expect(returnRes.body.data.return_record.cash_refund_amount).toBe(70);

    const reportsRes = await requestJson(
      baseUrl,
      "GET",
      "/api/reports/summary?from=2026-11-20&to=2026-11-20"
    );
    expect(reportsRes.status).toBe(200);
    expect(reportsRes.body.data.sale_count).toBe(1);

    // Soft-delete product
    const deleteRes = await requestJson(baseUrl, "DELETE", "/api/products/" + productId);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted_at).not.toBeNull();

    // Soft-deleted product is excluded from list
    const listRes = await requestJson(baseUrl, "GET", "/api/products");
    expect(listRes.body.data.length).toBe(0);
  });

  it("returns consistent JSON error envelope for validation and not-found errors", async function () {
    const baseUrl = await startTestServer();

    const missing = await requestJson(baseUrl, "GET", "/api/products/does-not-exist");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const invalid = await requestJson(baseUrl, "POST", "/api/products", {
      product_name: "",
      base_unit: "piece",
      selling_price: -5
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
  });
});
