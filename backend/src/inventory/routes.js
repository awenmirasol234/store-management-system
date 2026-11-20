import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import { createCategoryEntity, createSupplierEntity } from "./domain.js";

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
    const products = await dependencies.productRepository.listAll();
    response.json({ data: products });
  });

  router.get("/products/low-stock", async function listLowStock(request, response) {
    const products = await dependencies.useCases.getLowStockProducts();
    response.json({ data: products });
  });

  router.get("/products/barcode/:barcode", async function lookupBarcode(request, response) {
    const barcode = request.params.barcode;
    const product = await dependencies.productRepository.findByBarcode(barcode);
    if (product) {
      const options = await dependencies.sellingOptionRepository.listByProductId(
        product.product_id
      );
      response.json({
        data: {
          match_type: "PRODUCT",
          product: product,
          option: null,
          options: options
        }
      });
      return;
    }

    const option = await dependencies.sellingOptionRepository.findByBarcode(barcode);
    if (option && option.is_active) {
      const parentProduct = await dependencies.productRepository.findById(option.product_id);
      if (parentProduct && parentProduct.deleted_at === null) {
        const options = await dependencies.sellingOptionRepository.listByProductId(
          parentProduct.product_id
        );
        response.json({
          data: {
            match_type: "OPTION",
            product: parentProduct,
            option: option,
            options: options
          }
        });
        return;
      }
    }

    throw new NotFoundError("No product or selling option matches barcode: " + barcode);
  });

  router.get("/products/:productId", async function getProduct(request, response) {
    const product = await dependencies.productRepository.findById(request.params.productId);
    if (!product || product.deleted_at !== null) {
      throw new NotFoundError("Product not found: " + request.params.productId);
    }
    const options = await dependencies.sellingOptionRepository.listByProductId(product.product_id);
    response.json({
      data: Object.assign({}, product, { selling_options: options })
    });
  });

  router.post("/products", async function createProduct(request, response) {
    const created = await dependencies.useCases.createProduct(request.body);
    response.status(201).json({ data: created });
  });

  router.patch("/products/:productId", async function updateProduct(request, response) {
    const payload = Object.assign({}, request.body, {
      product_id: request.params.productId
    });
    const updated = await dependencies.useCases.updateProduct(payload);
    response.json({ data: updated });
  });

  router.delete("/products/:productId", async function deleteProduct(request, response) {
    const deleted = await dependencies.useCases.deleteProduct({
      product_id: request.params.productId
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
        product_id: request.params.productId,
        image_url: imageUrl
      });
      response.json({ data: updated });
    }
  );

  router.get("/products/:productId/options", async function listOptions(request, response) {
    const options = await dependencies.sellingOptionRepository.listByProductId(
      request.params.productId
    );
    response.json({ data: options });
  });

  router.post("/products/:productId/options", async function createOption(request, response) {
    const payload = Object.assign({}, request.body, {
      product_id: request.params.productId
    });
    const saved = await dependencies.useCases.saveSellingOption(payload);
    response.status(201).json({ data: saved });
  });

  router.patch(
    "/products/:productId/options/:optionId",
    async function updateOption(request, response) {
      const payload = Object.assign({}, request.body, {
        product_id: request.params.productId,
        option_id: request.params.optionId
      });
      const saved = await dependencies.useCases.saveSellingOption(payload);
      response.json({ data: saved });
    }
  );

  router.get("/products/:productId/transactions", async function listTx(request, response) {
    const transactions = await dependencies.inventoryTransactionRepository.listByProductId(
      request.params.productId
    );
    response.json({ data: transactions });
  });

  router.post("/inventory/stock-in", async function stockIn(request, response) {
    const result = await dependencies.useCases.stockIn(request.body);
    response.status(201).json({ data: result });
  });

  router.post("/inventory/adjust", async function adjustStock(request, response) {
    const result = await dependencies.useCases.adjustStock(request.body);
    response.status(201).json({ data: result });
  });

  router.get("/categories", async function listCategories(request, response) {
    const categories = await dependencies.categoryRepository.listAll();
    response.json({ data: categories });
  });

  router.post("/categories", async function createCategory(request, response) {
    const category = createCategoryEntity(
      Object.assign({}, request.body, {
        category_id: dependencies.idGenerator.nextId()
      })
    );
    await dependencies.categoryRepository.save(category);
    response.status(201).json({ data: category });
  });

  router.get("/suppliers", async function listSuppliers(request, response) {
    const suppliers = await dependencies.supplierRepository.listAll();
    response.json({ data: suppliers });
  });

  router.post("/suppliers", async function createSupplier(request, response) {
    const supplier = createSupplierEntity(
      Object.assign({}, request.body, {
        supplier_id: dependencies.idGenerator.nextId()
      })
    );
    await dependencies.supplierRepository.save(supplier);
    response.status(201).json({ data: supplier });
  });

  return router;
}
