import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  generateProductXlsxTemplate,
  generateProductsXlsx,
  parseXlsx
} from "../src/shared/xlsx.js";
import {
  createExportProductsToXlsxUseCase,
  createGenerateProductXlsxTemplateUseCase,
  createImportProductsFromCsvUseCase
} from "../src/inventory/use-cases.js";

function createInMemoryDeps() {
  const products = new Map();
  const options = new Map();
  const categories = new Map();
  const units = [
    { unit_id: "u1", unit_name: "Piece (pc)", is_active: true },
    { unit_id: "u2", unit_name: "Can", is_active: true },
    { unit_id: "u3", unit_name: "Bottle", is_active: true },
    { unit_id: "u4", unit_name: "Pack", is_active: true }
  ];
  const transactions = [];
  let counter = 1;

  return {
    products: products,
    options: options,
    categories: categories,
    units: units,
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
    unitRepository: {
      async listAll() {
        return units;
      }
    },
    inventoryTransactionRepository: {
      async save(tx) {
        transactions.push(tx);
      }
    }
  };
}

describe("Excel (.xlsx) Generator and Parser", function () {
  it("generates template workbook with Products and hidden ReferenceData sheets and dropdown validations", async function () {
    const categories = [
      { category_id: "c1", category_name: "Canned Goods" },
      { category_id: "c2", category_name: "Beverages" }
    ];
    const units = [
      { unit_id: "u1", unit_name: "Piece (pc)" },
      { unit_id: "u2", unit_name: "Can" }
    ];

    const buffer = await generateProductXlsxTemplate({
      categories: categories,
      units: units
    });

    expect(Buffer.isBuffer(Buffer.from(buffer))).toBe(true);

    // Inspect generated workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const productsSheet = workbook.getWorksheet("Products");
    const refSheet = workbook.getWorksheet("ReferenceData");

    expect(productsSheet).toBeDefined();
    expect(refSheet).toBeDefined();
    expect(refSheet.state).toBe("hidden");

    // Check ReferenceData contents
    expect(refSheet.getCell("A1").value).toBe("Categories");
    expect(refSheet.getCell("A2").value).toBe("Canned Goods");
    expect(refSheet.getCell("A3").value).toBe("Beverages");

    expect(refSheet.getCell("B1").value).toBe("Units");
    expect(refSheet.getCell("B2").value).toBe("Piece (pc)");
    expect(refSheet.getCell("B3").value).toBe("Can");

    // Check Products headers
    const row1 = productsSheet.getRow(1);
    expect(row1.getCell(1).value).toBe("product_name");
    expect(row1.getCell(2).value).toBe("barcode");
    expect(row1.getCell(3).value).toBe("category");
    expect(row1.getCell(6).value).toBe("base_unit");

    // Check Data Validations on category (C) and base_unit (F)
    const cellC2 = productsSheet.getCell("C2");
    expect(cellC2.dataValidation).toBeDefined();
    expect(cellC2.dataValidation.type).toBe("list");
    expect(cellC2.dataValidation.formulae[0]).toContain("ReferenceData!$A$2");

    const cellF2 = productsSheet.getCell("F2");
    expect(cellF2.dataValidation).toBeDefined();
    expect(cellF2.dataValidation.type).toBe("list");
    expect(cellF2.dataValidation.formulae[0]).toContain("ReferenceData!$B$2");
  });

  it("parses an Excel (.xlsx) file into normalized headers and row objects", async function () {
    const categories = [{ category_name: "Snacks" }];
    const buffer = await generateProductXlsxTemplate({ categories: categories });

    const parsed = await parseXlsx(buffer);
    expect(parsed.headers).toContain("product_name");
    expect(parsed.headers).toContain("base_unit");
    expect(parsed.headers).toContain("selling_price");
    expect(parsed.rowCount).toBeGreaterThanOrEqual(2);

    expect(parsed.rows[0]["product_name"]).toBe("Century Tuna Flakes in Oil 180g");
    expect(parsed.rows[0]["base_unit"]).toBe("Can");
    expect(parsed.rows[0]["selling_price"]).toBe("38");
  });
});

describe("Inventory XLSX Use Cases Integration", function () {
  it("imports products from an .xlsx buffer, creates categories and stock transactions", async function () {
    const deps = createInMemoryDeps();
    const generateTemplateUseCase = createGenerateProductXlsxTemplateUseCase(deps);
    const importUseCase = createImportProductsFromCsvUseCase(deps);
    const exportXlsxUseCase = createExportProductsToXlsxUseCase(deps);

    // 1. Generate template
    const templateBuffer = await generateTemplateUseCase();

    // 2. Import generated template directly (contains Century Tuna and Coca-Cola sample rows)
    const result = await importUseCase({
      fileBuffer: Buffer.from(templateBuffer),
      fileType: "xlsx",
      update_existing: false,
      created_by: "manager"
    });

    expect(result.imported_count).toBe(2);
    expect(result.created_count).toBe(2);
    expect(result.updated_count).toBe(0);

    // Verify products in database
    const products = await deps.productRepository.listAll();
    expect(products.length).toBe(2);

    const tuna = products.find(function (p) {
      return p.barcode === "4800016644812";
    });
    expect(tuna).toBeDefined();
    expect(tuna.product_name).toBe("Century Tuna Flakes in Oil 180g");
    expect(tuna.base_unit).toBe("Can");
    expect(tuna.selling_price).toBe(38);
    expect(tuna.cost_price).toBe(28.5);
    expect(tuna.current_stock).toBe(24);

    // Verify stock transactions recorded
    expect(deps.transactions.length).toBe(2);
    expect(deps.transactions[0].transaction_type).toBe("STOCK_IN");
    expect(deps.transactions[0].reference_number).toBe("CSV-IMPORT");

    // 3. Test Export to XLSX
    const exportedBuffer = await exportXlsxUseCase();
    expect(Buffer.isBuffer(Buffer.from(exportedBuffer))).toBe(true);

    const exportedWorkbook = new ExcelJS.Workbook();
    await exportedWorkbook.xlsx.load(exportedBuffer);
    const exportedSheet = exportedWorkbook.getWorksheet("Products");
    expect(exportedSheet).toBeDefined();
    expect(exportedSheet.rowCount).toBeGreaterThanOrEqual(3); // 1 header + 2 products
  });
});
