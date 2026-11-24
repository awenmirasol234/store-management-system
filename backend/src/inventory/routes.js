import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { ValidationError } from "../shared/errors.js";
import { requireObjectBody, requireRouteParam } from "../shared/validation.js";

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

function extensionForMime(mimeType) {
  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  return ".jpg";
}

function createProductImageUpload(uploadsDir) {
  const productsDir = path.join(uploadsDir, "products");
  fs.mkdirSync(productsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination(request, file, callback) {
      callback(null, productsDir);
    },
    filename(request, file, callback) {
      const safeId = String(request.params.productId).replace(/[^a-zA-Z0-9_-]/g, "");
      const ext = extensionForMime(file.mimetype);
      callback(null, safeId + "-" + String(Date.now()) + ext);
    }
  });

  return multer({
    storage: storage,
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter(request, file, callback) {
      if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
        callback(new ValidationError("Only JPEG, PNG, and WebP images are allowed"));
        return;
      }
      callback(null, true);
    }
  });
}

export function createInventoryRouter(dependencies) {
  const router = express.Router();
  const upload = createProductImageUpload(dependencies.uploadsDir);

  router.get("/products", async function listProducts(request, response) {
    const products = await dependencies.useCases.listProducts();
    response.json({ data: products });
  });

  router.get("/products/low-stock", async function listLowStock(request, response) {
    const products = await dependencies.useCases.getLowStockProducts();
    response.json({ data: products });
  });

  router.get("/products/barcode/:barcode", async function lookupBarcode(request, response) {
    const match = await dependencies.useCases.lookupBarcode({
      barcode: requireRouteParam(request.params, "barcode")
    });
    response.json({ data: match });
  });

  router.get("/products/:productId", async function getProduct(request, response) {
    const product = await dependencies.useCases.getProduct({
      product_id: requireRouteParam(request.params, "productId")
    });
    response.json({ data: product });
  });

  router.post("/products", async function createProduct(request, response) {
    const created = await dependencies.useCases.createProduct(requireObjectBody(request.body));
    response.status(201).json({ data: created });
  });

  router.patch("/products/:productId", async function updateProduct(request, response) {
    const payload = Object.assign({}, requireObjectBody(request.body), {
      product_id: requireRouteParam(request.params, "productId")
    });
    const updated = await dependencies.useCases.updateProduct(payload);
    response.json({ data: updated });
  });

  router.delete("/products/:productId", async function deleteProduct(request, response) {
    const deleted = await dependencies.useCases.deleteProduct({
      product_id: requireRouteParam(request.params, "productId")
    });
    response.json({ data: deleted });
  });

  router.post(
    "/products/:productId/image",
    upload.single("image"),
    async function uploadProductImage(request, response) {
      if (!request.file) {
        throw new ValidationError("Image file is required under field name 'image'");
      }
      const imageUrl = "/uploads/products/" + request.file.filename;
      const updated = await dependencies.useCases.updateProduct({
        product_id: requireRouteParam(request.params, "productId"),
        image_url: imageUrl
      });
      response.json({ data: updated });
    }
  );

  router.get("/products/:productId/options", async function listSellingOptions(request, response) {
    const options = await dependencies.useCases.listSellingOptions({
      product_id: requireRouteParam(request.params, "productId")
    });
    response.json({ data: options });
  });

  router.post("/products/:productId/options", async function createOption(request, response) {
    const payload = Object.assign({}, requireObjectBody(request.body), {
      product_id: requireRouteParam(request.params, "productId")
    });
    const saved = await dependencies.useCases.saveSellingOption(payload);
    response.status(201).json({ data: saved });
  });

  router.patch(
    "/products/:productId/options/:optionId",
    async function updateOption(request, response) {
      const payload = Object.assign({}, requireObjectBody(request.body), {
        product_id: requireRouteParam(request.params, "productId"),
        option_id: requireRouteParam(request.params, "optionId")
      });
      const saved = await dependencies.useCases.saveSellingOption(payload);
      response.json({ data: saved });
    }
  );

  router.get("/products/:productId/transactions", async function listInventoryTransactions(request, response) {
    const transactions = await dependencies.useCases.listInventoryTransactions({
      product_id: requireRouteParam(request.params, "productId")
    });
    response.json({ data: transactions });
  });

  router.post("/inventory/stock-in", async function stockIn(request, response) {
    const body = requireObjectBody(request.body);
    let createdBy = body.created_by;
    if (request.user && request.user.username) {
      createdBy = request.user.username;
    }
    const result = await dependencies.useCases.stockIn(
      Object.assign({}, body, { created_by: createdBy })
    );
    response.status(201).json({ data: result });
  });

  router.post("/inventory/adjust", async function adjustStock(request, response) {
    const body = requireObjectBody(request.body);
    let createdBy = body.created_by;
    if (request.user && request.user.username) {
      createdBy = request.user.username;
    }
    const result = await dependencies.useCases.adjustStock(
      Object.assign({}, body, { created_by: createdBy })
    );
    response.status(201).json({ data: result });
  });

  router.get("/categories", async function listCategories(request, response) {
    const categories = await dependencies.useCases.listCategories();
    response.json({ data: categories });
  });

  router.post("/categories", async function createCategory(request, response) {
    const category = await dependencies.useCases.createCategory(requireObjectBody(request.body));
    response.status(201).json({ data: category });
  });

  router.get("/suppliers", async function listSuppliers(request, response) {
    const suppliers = await dependencies.useCases.listSuppliers();
    response.json({ data: suppliers });
  });

  router.post("/suppliers", async function createSupplier(request, response) {
    const supplier = await dependencies.useCases.createSupplier(requireObjectBody(request.body));
    response.status(201).json({ data: supplier });
  });

  router.get("/units", async function listUnits(request, response) {
    const units = await dependencies.useCases.listUnits();
    response.json({ data: units });
  });

  return router;
}
