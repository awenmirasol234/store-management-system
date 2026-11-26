import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCsv, generateCsv } from "../src/shared/csv.js";
import {
  normalizeBaseUnit,
  validateProductCsvHeaders,
  validateProductCsvRows,
  PRODUCT_CSV_COLUMNS,
  REQUIRED_PRODUCT_CSV_COLUMNS
} from "../src/inventory/domain.js";
import {
  createImportProductsFromCsvUseCase,
  createExportProductsToCsvUseCase
} from "../src/inventory/use-cases.js";
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

function createInMemoryDeps() {
  const products = new Map();
  const options = new Map();
  const categories = new Map();
  const transactions = [];
  let counter = 1;

  return {
    products: products,
    options: options,
    categories: categories,
    transactions: transactions,
    idGenerator: {
      nextId() {
        const idVal = "gen-id-" + String(counter);
        counter = counter + 1;
        return idVal;
      }
    },
    clock: {
      nowIso() {
        return "2026-11-26T12:00:00.000Z";
      }
    },
    unitOfWork: {
      async run(work) {
        return work();
      }
    },
    productRepository: {
      async findById(productId) {
        return products.get(productId) || null;
      },
      async findByBarcode(barcode) {
        for (const p of products.values()) {
          if (p.barcode === barcode && p.deleted_at === null) {
            return p;
          }
        }
        return null;
      },
      async listAll() {
        return Array.from(products.values()).filter(function (p) {
          return p.deleted_at === null;
        });
      },
      async save(prod) {
        products.set(prod.product_id, prod);
      }
    },
    sellingOptionRepository: {
      async findByBarcode(barcode) {
        for (const opt of options.values()) {
          if (opt.barcode === barcode) {
            return opt;
          }
        }
        return null;
      },
      async listByProductId(productId) {
        const list = [];
        for (const opt of options.values()) {
          if (opt.product_id === productId) {
            list.push(opt);
          }
        }
        return list;
      }
    },
    categoryRepository: {
      async findByName(name) {
        const lower = name.trim().toLowerCase();
        for (const cat of categories.values()) {
          if (cat.category_name.toLowerCase() === lower) {
            return cat;
          }
        }
        return null;
      },
      async listAll() {
        return Array.from(categories.values());
      },
      async save(cat) {
        categories.set(cat.category_id, cat);
      }
    },
    inventoryTransactionRepository: {
      async save(tx) {
        transactions.push(tx);
      }
    }
  };
}

async function startTestServer() {
  const uploadsDir = path.join(os.tmpdir(), "store-mgmt-csv-tests-" + String(Date.now()));
  const runtime = createApp({
    databasePath: ":memory:",
    uploadsDir: uploadsDir,
    operationMode: "single_user",
    features: { cashDrawer: false },
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
  return {
    baseUrl: "http://127.0.0.1:" + String(address.port),
    runtime: runtime
  };
}

describe("CSV Shared Parser and Serializer", function () {
  it("parses simple CSV rows and columns into objects", function () {
    const csv = "name,price,qty\nApple,10.50,100\nBanana,5.00,50";
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(["name", "price", "qty"]);
    expect(parsed.rowCount).toBe(2);
    expect(parsed.rows).toEqual([
      { name: "Apple", price: "10.50", qty: "100" },
      { name: "Banana", price: "5.00", qty: "50" }
    ]);
  });

  it("handles CRLF and CR line endings cleanly", function () {
    const csv = "col1,col2\r\nval1,val2\rval3,val4\nval5,val6";
    const parsed = parseCsv(csv);
    expect(parsed.rowCount).toBe(3);
    expect(parsed.rows[0]).toEqual({ col1: "val1", col2: "val2" });
    expect(parsed.rows[1]).toEqual({ col1: "val3", col2: "val4" });
    expect(parsed.rows[2]).toEqual({ col1: "val5", col2: "val6" });
  });

  it("handles quoted values with commas and escaped double quotes", function () {
    const csv = 'product_name,description\n"Sardines, 155g","Special ""Mega"" Brand"';
    const parsed = parseCsv(csv);
    expect(parsed.rows[0]["product_name"]).toBe("Sardines, 155g");
    expect(parsed.rows[0]["description"]).toBe('Special "Mega" Brand');
  });

  it("strips UTF-8 BOM and Excel formula prefix apostrophes", function () {
    const csv = '\uFEFFproduct_name,selling_price\n\'"Test Product",\'50.00';
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(["product_name", "selling_price"]);
    expect(parsed.rows[0]["product_name"]).toBe("Test Product");
    expect(parsed.rows[0]["selling_price"]).toBe("50.00");
  });

  it("generates CSV with proper quotes and escapes", function () {
    const headers = ["product_name", "price", "note"];
    const rows = [
      { product_name: "Century Tuna, 180g", price: 38.5, note: 'Hot & "Spicy"' },
      { product_name: "Purefoods Corned Beef", price: 85, note: "Standard" }
    ];
    const generated = generateCsv(headers, rows);
    expect(generated).toContain('"product_name","price","note"');
    expect(generated).toContain('"Century Tuna, 180g","38.5","Hot & ""Spicy"""');
    expect(generated).toContain('"Purefoods Corned Beef","85","Standard"');
  });
});

describe("Inventory CSV Domain Validation", function () {
  it("validates required headers and permits optional headers in any order", function () {
    const validHeaders = [
      "selling_price",
      "product_name",
      "base_unit",
      "barcode",
      "category"
    ];
    expect(validateProductCsvHeaders(validHeaders)).toBe(true);
  });

  it("throws ValidationError when required headers are missing", function () {
    const missingHeaders = ["product_name", "description"];
    expect(function () {
      validateProductCsvHeaders(missingHeaders);
    }).toThrow(/Missing required CSV column/);
  });

  it("normalizes base unit aliases correctly", function () {
    expect(normalizeBaseUnit("pc")).toBe("Piece (pc)");
    expect(normalizeBaseUnit("pcs")).toBe("Piece (pc)");
    expect(normalizeBaseUnit("pieces")).toBe("Piece (pc)");
    expect(normalizeBaseUnit("can")).toBe("Can");
    expect(normalizeBaseUnit("cans")).toBe("Can");
    expect(normalizeBaseUnit("kg")).toBe("Kilogram (kg)");
    expect(normalizeBaseUnit("kilo")).toBe("Kilogram (kg)");
    expect(normalizeBaseUnit("kilos")).toBe("Kilogram (kg)");
    expect(normalizeBaseUnit("pack")).toBe("Pack");
    expect(normalizeBaseUnit("bottle")).toBe("Bottle");
    expect(normalizeBaseUnit("sachet")).toBe("Sachet");
    expect(normalizeBaseUnit("Box")).toBe("Box");
  });

  it("validates row data values and detects missing names, non-positive prices, and negative stocks", function () {
    const parsedRows = [
      { product_name: "", base_unit: "pc", selling_price: "20.00", cost_price: "15.00", current_stock: "10" },
      { product_name: "Item C", base_unit: "pc", selling_price: "-5.00", cost_price: "15.00", current_stock: "10" },
      { product_name: "Item D", base_unit: "pc", selling_price: "20.00", cost_price: "-1.00", current_stock: "10" },
      { product_name: "Item E", base_unit: "pc", selling_price: "20.00", cost_price: "15.00", current_stock: "-5" }
    ];

    expect(function () {
      validateProductCsvRows(parsedRows, [], [], false);
    }).toThrow(/CSV import validation failed/);
  });

  it("detects duplicate barcodes within the CSV file itself", function () {
    const parsedRows = [
      { product_name: "Item A", base_unit: "pc", selling_price: "20.00", barcode: "1234567890" },
      { product_name: "Item B", base_unit: "pc", selling_price: "25.00", barcode: "1234567890" }
    ];

    expect(function () {
      validateProductCsvRows(parsedRows, [], [], false);
    }).toThrow(/Duplicate barcode "1234567890" found in CSV/);
  });

  it("rejects existing database barcode if update_existing is false", function () {
    const parsedRows = [
      { product_name: "Item A", base_unit: "pc", selling_price: "20.00", barcode: "4800016644812" }
    ];
    const existingProducts = [
      { product_id: "prod-1", product_name: "Existing Item", barcode: "4800016644812", deleted_at: null }
    ];

    expect(function () {
      validateProductCsvRows(parsedRows, existingProducts, [], false);
    }).toThrow(/already assigned to an existing product/);
  });

  it("allows existing database barcode if update_existing is true", function () {
    const parsedRows = [
      { product_name: "Item A", base_unit: "pc", selling_price: "20.00", barcode: "4800016644812" }
    ];
    const existingProducts = [
      { product_id: "prod-1", product_name: "Existing Item", barcode: "4800016644812", deleted_at: null }
    ];

    const result = validateProductCsvRows(parsedRows, existingProducts, [], true);
    expect(result.length).toBe(1);
    expect(result[0].product_name).toBe("Item A");
    expect(result[0].barcode).toBe("4800016644812");
  });

  it("rejects invalid image_url formats", function () {
    const parsedRows = [
      { product_name: "Item A", base_unit: "pc", selling_price: "20.00", image_url: "ftp://example.com/pic.png" }
    ];

    expect(function () {
      validateProductCsvRows(parsedRows, [], [], false);
    }).toThrow(/image_url/);
  });
});

describe("Inventory CSV Use Cases (In-Memory Unit Tests)", function () {
  it("imports products, creates categories, and writes initial inventory audit transactions", async function () {
    const deps = createInMemoryDeps();
    const importUseCase = createImportProductsFromCsvUseCase(deps);
    const exportUseCase = createExportProductsToCsvUseCase(deps);

    const csvText = [
      "product_name,barcode,category,image_url,base_unit,cost_price,selling_price,current_stock,reorder_level",
      "Lucky Me Pancit Canton 60g,4807770270014,Noodles,https://images.example.com/pancit.jpg,Pack,12.00,16.00,50,10",
      "San Marino Corned Tuna 180g,4800016644999,Canned Goods,,Can,32.00,42.00,25,5"
    ].join("\n");

    const result = await importUseCase({
      csvText: csvText,
      update_existing: false,
      created_by: "admin"
    });

    expect(result.imported_count).toBe(2);
    expect(result.created_count).toBe(2);
    expect(result.updated_count).toBe(0);

    // Products saved
    const products = await deps.productRepository.listAll();
    expect(products.length).toBe(2);
    expect(products[0].product_name).toBe("Lucky Me Pancit Canton 60g");
    expect(products[0].image_url).toBe("https://images.example.com/pancit.jpg");
    expect(products[0].base_unit).toBe("Pack");
    expect(products[0].current_stock).toBe(50);
    expect(products[1].product_name).toBe("San Marino Corned Tuna 180g");
    expect(products[1].image_url).toBeNull();

    // Categories auto-created
    const noodlesCat = await deps.categoryRepository.findByName("Noodles");
    expect(noodlesCat).not.toBeNull();
    expect(noodlesCat.category_name).toBe("Noodles");

    // Stock-in transaction recorded
    expect(deps.transactions.length).toBe(2);
    expect(deps.transactions[0].transaction_type).toBe("STOCK_IN");
    expect(deps.transactions[0].reference_number).toBe("CSV-IMPORT");
    expect(deps.transactions[0].quantity).toBe(50);

    // Test Export
    const exportedCsv = await exportUseCase();
    expect(exportedCsv).toContain('"product_name","barcode","category"');
    expect(exportedCsv).toContain('"image_url"');
    expect(exportedCsv).toContain("Lucky Me Pancit Canton 60g");
    expect(exportedCsv).toContain("https://images.example.com/pancit.jpg");
    expect(exportedCsv).toContain("San Marino Corned Tuna 180g");
  });

  it("updates existing product when update_existing is true and adjusts stock diff", async function () {
    const deps = createInMemoryDeps();
    const importUseCase = createImportProductsFromCsvUseCase(deps);

    // Pre-insert product with stock 10
    deps.products.set("prod-existing", {
      product_id: "prod-existing",
      product_name: "Original Name",
      barcode: "4801112223334",
      category_id: null,
      description: null,
      base_unit: "Piece (pc)",
      cost_price: 10,
      selling_price: 15,
      current_stock: 10,
      reorder_level: 2,
      allow_custom_amount: false,
      is_active: true,
      deleted_at: null,
      created_at: "2026-11-20T00:00:00.000Z",
      updated_at: "2026-11-20T00:00:00.000Z"
    });

    const updateCsv = [
      "product_name,barcode,base_unit,cost_price,selling_price,current_stock",
      "Updated Name,4801112223334,Piece (pc),12.00,18.00,15"
    ].join("\n");

    const result = await importUseCase({
      csvText: updateCsv,
      update_existing: true,
      created_by: "manager"
    });

    expect(result.imported_count).toBe(1);
    expect(result.created_count).toBe(0);
    expect(result.updated_count).toBe(1);

    const updated = deps.products.get("prod-existing");
    expect(updated.product_name).toBe("Updated Name");
    expect(updated.selling_price).toBe(18);
    expect(updated.cost_price).toBe(12);
    expect(updated.current_stock).toBe(15);

    // Stock increased by 5 (15 - 10) -> STOCK_IN transaction
    expect(deps.transactions.length).toBe(1);
    expect(deps.transactions[0].transaction_type).toBe("STOCK_IN");
    expect(deps.transactions[0].quantity).toBe(5);
    expect(deps.transactions[0].reference_number).toBe("CSV-UPDATE");
  });
});
