import ExcelJS from "exceljs";
import { PRODUCT_CSV_COLUMNS } from "../inventory/domain.js";

const DEFAULT_UNITS = [
  "Piece (pc)",
  "Can",
  "Bottle",
  "Pack",
  "Box",
  "Kilogram (kg)",
  "Gram (g)",
  "Liter (L)",
  "Milliliter (mL)",
  "Sachet",
  "Roll",
  "Dozen (doz)",
  "Pair",
  "Set",
  "Bundle",
  "Sack",
  "Case",
  "Carton",
  "Tray",
  "Gallon",
  "Pouch",
  "Tube",
  "Jar",
  "Bar",
  "Stick"
];

const COLUMN_DEFINITIONS = [
  { key: "product_name", header: "product_name", width: 34 },
  { key: "barcode", header: "barcode", width: 18 },
  { key: "category", header: "category", width: 22 },
  { key: "description", header: "description", width: 26 },
  { key: "image_url", header: "image_url", width: 32 },
  { key: "base_unit", header: "base_unit", width: 16 },
  { key: "cost_price", header: "cost_price", width: 14 },
  { key: "selling_price", header: "selling_price", width: 14 },
  { key: "current_stock", header: "current_stock", width: 14 },
  { key: "reorder_level", header: "reorder_level", width: 14 },
  { key: "allow_custom_amount", header: "allow_custom_amount", width: 20 },
  { key: "is_active", header: "is_active", width: 12 }
];

export async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let worksheet = workbook.getWorksheet("Products");
  if (!worksheet) {
    worksheet = workbook.worksheets[0];
  }
  if (!worksheet) {
    return { headers: [], rows: [], rowCount: 0 };
  }

  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, function extractHeader(cell, colNumber) {
    let rawVal = cell.value;
    if (cell.text !== undefined) {
      rawVal = cell.text;
    }
    if (rawVal !== null && rawVal !== undefined) {
      let strVal = String(rawVal).trim();
      if (strVal.startsWith("'")) {
        strVal = strVal.slice(1).trim();
      }
      headers.push({
        colNumber: colNumber,
        originalKey: strVal,
        normKey: strVal.toLowerCase()
      });
    }
  });

  if (headers.length === 0) {
    return { headers: [], rows: [], rowCount: 0 };
  }

  const rows = [];
  for (let r = 2; r <= worksheet.rowCount; r = r + 1) {
    const row = worksheet.getRow(r);
    let hasValue = false;
    const rowObj = {};

    for (let h = 0; h < headers.length; h = h + 1) {
      const header = headers[h];
      const cell = row.getCell(header.colNumber);
      let cellStr = "";

      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === "object") {
          if (cell.value.text !== undefined) {
            cellStr = String(cell.value.text).trim();
          } else if (cell.value.result !== undefined) {
            cellStr = String(cell.value.result).trim();
          } else if (cell.value.richText && Array.isArray(cell.value.richText)) {
            cellStr = cell.value.richText
              .map(function (t) {
                return t.text || "";
              })
              .join("")
              .trim();
          } else {
            cellStr = String(cell.value).trim();
          }
        } else {
          cellStr = String(cell.value).trim();
        }
      }

      if (cellStr.startsWith("'")) {
        cellStr = cellStr.slice(1).trim();
      }

      if (cellStr.length > 0) {
        hasValue = true;
      }
      rowObj[header.normKey] = cellStr;
    }

    if (hasValue) {
      rows.push(rowObj);
    }
  }

  return {
    headers: headers.map(function (h) {
      return h.originalKey;
    }),
    rows: rows,
    rowCount: rows.length
  };
}

export async function generateProductXlsxTemplate(options) {
  const categories = (options && options.categories) || [];
  const units = (options && options.units) || DEFAULT_UNITS;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StoreFlow";
  workbook.created = new Date();

  // Sheet 1: Products
  const productsSheet = workbook.addWorksheet("Products", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  productsSheet.columns = COLUMN_DEFINITIONS.map(function (col) {
    return {
      header: col.header,
      key: col.key,
      width: col.width
    };
  });

  // Style header row
  const headerRow = productsSheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell(function (cell) {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF171717" }
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF333333" } },
      left: { style: "thin", color: { argb: "FF333333" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF333333" } }
    };
  });

  // Sheet 2: ReferenceData (hidden)
  const refSheet = workbook.addWorksheet("ReferenceData");
  refSheet.state = "hidden";
  refSheet.getCell("A1").value = "Categories";
  refSheet.getCell("B1").value = "Units";

  const catNames = [];
  for (let c = 0; c < categories.length; c = c + 1) {
    const item = categories[c];
    let name = item.category_name;
    if (typeof item === "string") {
      name = item;
    }
    if (name && name.trim().length > 0) {
      catNames.push(name.trim());
    }
  }

  for (let i = 0; i < catNames.length; i = i + 1) {
    refSheet.getCell("A" + String(i + 2)).value = catNames[i];
  }

  const unitNames = [];
  for (let u = 0; u < units.length; u = u + 1) {
    const item = units[u];
    let name = item.unit_name;
    if (typeof item === "string") {
      name = item;
    }
    if (name && name.trim().length > 0) {
      unitNames.push(name.trim());
    }
  }
  if (unitNames.length === 0) {
    for (let d = 0; d < DEFAULT_UNITS.length; d = d + 1) {
      unitNames.push(DEFAULT_UNITS[d]);
    }
  }

  for (let j = 0; j < unitNames.length; j = j + 1) {
    refSheet.getCell("B" + String(j + 2)).value = unitNames[j];
  }

  // Attach data validations to column C (Category) and column F (Base Unit)
  const maxRow = 1000;
  const catEndRow = Math.max(catNames.length + 1, 2);
  const unitEndRow = Math.max(unitNames.length + 1, 2);

  for (let r = 2; r <= maxRow; r = r + 1) {
    if (catNames.length > 0) {
      productsSheet.getCell("C" + String(r)).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["ReferenceData!$A$2:$A$" + String(catEndRow)],
        showErrorMessage: true,
        errorTitle: "Invalid Category",
        error: "Please select a category from the dropdown or type a category name."
      };
    }

    productsSheet.getCell("F" + String(r)).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["ReferenceData!$B$2:$B$" + String(unitEndRow)],
      showErrorMessage: true,
      errorTitle: "Invalid Unit",
      error: "Please select a valid base unit from the dropdown list."
    };

    productsSheet.getCell("K" + String(r)).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"true,false"']
    };

    productsSheet.getCell("L" + String(r)).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"true,false"']
    };
  }

  // Sample Rows
  const sample1 = productsSheet.addRow({
    product_name: "Century Tuna Flakes in Oil 180g",
    barcode: "4800016644812",
    category: catNames[0] || "Canned Goods",
    description: "Flakes in oil",
    image_url: "https://example.com/images/century-tuna.jpg",
    base_unit: "Can",
    cost_price: 28.5,
    selling_price: 38.0,
    current_stock: 24,
    reorder_level: 5,
    allow_custom_amount: "false",
    is_active: "true"
  });
  sample1.getCell("G").numFmt = "#,##0.00";
  sample1.getCell("H").numFmt = "#,##0.00";
  sample1.getCell("I").numFmt = "#,##0";
  sample1.getCell("J").numFmt = "#,##0";

  const sample2 = productsSheet.addRow({
    product_name: "Coca-Cola Regular 330ml",
    barcode: "4800000000012",
    category: catNames[1] || "Beverages",
    description: "Carbonated soda",
    image_url: "https://example.com/images/coke-can.png",
    base_unit: "Can",
    cost_price: 22.0,
    selling_price: 30.0,
    current_stock: 48,
    reorder_level: 10,
    allow_custom_amount: "false",
    is_active: "true"
  });
  sample2.getCell("G").numFmt = "#,##0.00";
  sample2.getCell("H").numFmt = "#,##0.00";
  sample2.getCell("I").numFmt = "#,##0";
  sample2.getCell("J").numFmt = "#,##0";

  return workbook.xlsx.writeBuffer();
}

export async function generateProductsXlsx(options) {
  const products = (options && options.products) || [];
  const categories = (options && options.categories) || [];
  const units = (options && options.units) || DEFAULT_UNITS;

  const categoryMap = new Map();
  const catNames = [];
  for (let c = 0; c < categories.length; c = c + 1) {
    const cat = categories[c];
    categoryMap.set(cat.category_id, cat.category_name);
    catNames.push(cat.category_name);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StoreFlow";
  workbook.created = new Date();

  // Sheet 1: Products
  const productsSheet = workbook.addWorksheet("Products", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  productsSheet.columns = COLUMN_DEFINITIONS.map(function (col) {
    return {
      header: col.header,
      key: col.key,
      width: col.width
    };
  });

  // Style header row
  const headerRow = productsSheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell(function (cell) {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF171717" }
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF333333" } },
      left: { style: "thin", color: { argb: "FF333333" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF333333" } }
    };
  });

  // Sheet 2: ReferenceData (hidden)
  const refSheet = workbook.addWorksheet("ReferenceData");
  refSheet.state = "hidden";
  refSheet.getCell("A1").value = "Categories";
  refSheet.getCell("B1").value = "Units";

  for (let i = 0; i < catNames.length; i = i + 1) {
    refSheet.getCell("A" + String(i + 2)).value = catNames[i];
  }

  const unitNames = [];
  for (let u = 0; u < units.length; u = u + 1) {
    const item = units[u];
    let name = item.unit_name;
    if (typeof item === "string") {
      name = item;
    }
    if (name) {
      unitNames.push(name.trim());
    }
  }
  if (unitNames.length === 0) {
    for (let d = 0; d < DEFAULT_UNITS.length; d = d + 1) {
      unitNames.push(DEFAULT_UNITS[d]);
    }
  }

  for (let j = 0; j < unitNames.length; j = j + 1) {
    refSheet.getCell("B" + String(j + 2)).value = unitNames[j];
  }

  // Populate product rows
  for (let p = 0; p < products.length; p = p + 1) {
    const prod = products[p];
    let catName = "";
    if (prod.category_id && categoryMap.has(prod.category_id)) {
      catName = categoryMap.get(prod.category_id);
    }

    const row = productsSheet.addRow({
      product_name: prod.product_name,
      barcode: prod.barcode || "",
      category: catName,
      description: prod.description || "",
      image_url: prod.image_url || "",
      base_unit: prod.base_unit,
      cost_price: prod.cost_price,
      selling_price: prod.selling_price,
      current_stock: prod.current_stock,
      reorder_level: prod.reorder_level,
      allow_custom_amount: Boolean(prod.allow_custom_amount),
      is_active: Boolean(prod.is_active)
    });

    row.getCell("G").numFmt = "#,##0.00";
    row.getCell("H").numFmt = "#,##0.00";
    row.getCell("I").numFmt = "#,##0";
    row.getCell("J").numFmt = "#,##0";
  }

  // Attach data validations
  const maxRow = Math.max(products.length + 500, 1000);
  const catEndRow = Math.max(catNames.length + 1, 2);
  const unitEndRow = Math.max(unitNames.length + 1, 2);

  for (let r = 2; r <= maxRow; r = r + 1) {
    if (catNames.length > 0) {
      productsSheet.getCell("C" + String(r)).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["ReferenceData!$A$2:$A$" + String(catEndRow)]
      };
    }

    productsSheet.getCell("F" + String(r)).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["ReferenceData!$B$2:$B$" + String(unitEndRow)]
    };

    productsSheet.getCell("K" + String(r)).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"true,false"']
    };

    productsSheet.getCell("L" + String(r)).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"true,false"']
    };
  }

  return workbook.xlsx.writeBuffer();
}
