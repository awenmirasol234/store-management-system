import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express from "express";
import multer from "multer";
import { ValidationError } from "../shared/errors.js";
import { requireFeature } from "../shared/features.js";
import { requireNonEmptyText, requireObjectBody, requireRouteParam } from "../shared/validation.js";

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

function isPrivateIpAddress(address) {
  const normalized = address.toLowerCase().split("%")[0];
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) {
    const parts = normalized.split(".").map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) {
      return true;
    }
    if (parts[0] === 169 && parts[1] === 254) {
      return true;
    }
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
    if (parts[0] === 192 && parts[1] === 168) {
      return true;
    }
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
      return true;
    }
    return false;
  }

  if (ipVersion === 6) {
    if (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    ) {
      return true;
    }
    if (normalized.startsWith("::ffff:")) {
      return isPrivateIpAddress(normalized.slice(7));
    }
  }

  return false;
}

async function validateExternalImageUrl(url, dnsLookup) {
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new ValidationError("Image URL is required");
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    throw new ValidationError("Only HTTP and HTTPS image URLs are supported");
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch (error) {
    throw new ValidationError("Invalid image URL provided");
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new ValidationError("Private or loopback image URLs are not permitted");
  }

  if (isPrivateIpAddress(hostname)) {
    throw new ValidationError("Private network image URLs are not permitted");
  }

  const lookup = dnsLookup || dns.lookup;
  let addresses;
  try {
    if (net.isIP(hostname)) {
      addresses = [{ address: hostname }];
    } else {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    }
  } catch (error) {
    throw new ValidationError("Image host could not be resolved");
  }
  if (addresses.length === 0) {
    throw new ValidationError("Image host could not be resolved");
  }

  for (let index = 0; index < addresses.length; index = index + 1) {
    if (isPrivateIpAddress(addresses[index].address)) {
      throw new ValidationError("Private network image URLs are not permitted");
    }
  }

  return parsedUrl;
}

function detectImageMime(mimeType, buffer, urlPath) {
  if (buffer && buffer.length >= 4) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "image/jpeg";
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return "image/png";
    }
    if (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      return "image/webp";
    }
    return null;
  }
  if (mimeType && ALLOWED_IMAGE_MIMES.has(mimeType)) {
    return mimeType;
  }
  const lowerPath = urlPath.toLowerCase();
  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }
  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return null;
}

async function readResponseBody(response) {
  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const chunks = [];
    let totalLength = 0;

    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      const chunk = Buffer.from(result.value);
      totalLength = totalLength + chunk.length;
      if (totalLength > MAX_IMAGE_SIZE_BYTES) {
        await reader.cancel();
        throw new ValidationError("Downloaded image exceeds the maximum 2MB size limit");
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, totalLength);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new ValidationError("Downloaded image exceeds the maximum 2MB size limit");
  }
  return buffer;
}

function extensionForMime(mimeType) {
  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  return ".jpg";
}

function removeFileIfPresent(filePath) {
  try {
    fs.rmSync(filePath, { force: true });
  } catch (error) {
    // Keep the original request error when cleanup cannot remove a temporary upload.
  }
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
      callback(null, safeId + "-" + randomUUID() + ext);
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
  const features = dependencies.features;
  function featureMiddleware(featureName) {
    if (!features) {
      return function featureEnabledByDefault(request, response, next) {
        next();
      };
    }
    return requireFeature(features, featureName);
  }

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
    const body = requireObjectBody(request.body);
    let createdBy = body.created_by;
    if (request.user && request.user.username) {
      createdBy = request.user.username;
    }
    const created = await dependencies.useCases.createProduct(
      Object.assign({}, body, { created_by: createdBy })
    );
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
    featureMiddleware("productImages"),
    upload.single("image"),
    async function uploadProductImage(request, response) {
      if (!request.file) {
        throw new ValidationError("Image file is required under field name 'image'");
      }
      const uploadedBuffer = fs.readFileSync(request.file.path);
      const detectedMime = detectImageMime("", uploadedBuffer, request.file.originalname);
      if (!detectedMime) {
        removeFileIfPresent(request.file.path);
        throw new ValidationError("Uploaded file is not a supported image format");
      }
      const imageUrl = "/uploads/products/" + request.file.filename;
      let updated;
      try {
        updated = await dependencies.useCases.updateProduct({
          product_id: requireRouteParam(request.params, "productId"),
          image_url: imageUrl
        });
      } catch (error) {
        removeFileIfPresent(request.file.path);
        throw error;
      }
      response.json({ data: updated });
    }
  );

  router.post(
    "/products/:productId/image-url",
    featureMiddleware("productImages"),
    async function saveProductImageUrl(request, response) {
      const body = requireObjectBody(request.body);
      const url = requireNonEmptyText(body.url, "url");
      const productId = requireRouteParam(request.params, "productId");

      const productsDir = path.join(dependencies.uploadsDir, "products");
      fs.mkdirSync(productsDir, { recursive: true });
      let currentUrl = url;
      let fetchResponse = null;
      for (let redirectCount = 0; redirectCount <= 3; redirectCount = redirectCount + 1) {
        await validateExternalImageUrl(currentUrl, dependencies.dnsLookup);

        const fetchImpl = dependencies.fetch || globalThis.fetch;
        if (typeof fetchImpl !== "function") {
          throw new ValidationError("Fetch client is not available in the runtime");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(function onTimeout() {
          controller.abort();
        }, 10000);

        try {
          fetchResponse = await fetchImpl(currentUrl, {
            redirect: "manual",
            signal: controller.signal,
            headers: {
              Accept: "image/jpeg,image/png,image/webp,image/*",
              "User-Agent": "StoreFlow-POS/1.0"
            }
          });
        } catch (err) {
          if (err.name === "AbortError") {
            throw new ValidationError("Image download timed out. Please check the URL.");
          }
          throw new ValidationError("Could not download image from the provided URL: " + err.message);
        } finally {
          clearTimeout(timeoutId);
        }

        if (fetchResponse.status >= 300 && fetchResponse.status < 400) {
          const location = fetchResponse.headers.get("location");
          if (!location) {
            throw new ValidationError("Image URL redirect did not provide a target");
          }
          if (redirectCount === 3) {
            throw new ValidationError("Too many image URL redirects");
          }
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
        break;
      }

      if (!fetchResponse.ok) {
        throw new ValidationError("Failed to download image from URL (HTTP " + fetchResponse.status + ")");
      }

      let rawContentType = "";
      if (fetchResponse.headers && typeof fetchResponse.headers.get === "function") {
        rawContentType = fetchResponse.headers.get("content-type") || "";
      }
      const mimeType = rawContentType.split(";")[0].trim().toLowerCase();

      const buffer = await readResponseBody(fetchResponse);

      const detectedMime = detectImageMime(mimeType, buffer, new URL(currentUrl).pathname);
      if (!detectedMime) {
        throw new ValidationError("Downloaded file is not a supported image format (JPEG, PNG, WebP)");
      }

      const safeId = String(productId).replace(/[^a-zA-Z0-9_-]/g, "");
      const ext = extensionForMime(detectedMime);
      const filename = safeId + "-" + randomUUID() + ext;
      const filePath = path.join(productsDir, filename);

      fs.writeFileSync(filePath, buffer);

      const imageUrl = "/uploads/products/" + filename;
      let updated;
      try {
        updated = await dependencies.useCases.updateProduct({
          product_id: productId,
          image_url: imageUrl
        });
      } catch (error) {
        removeFileIfPresent(filePath);
        throw error;
      }
      response.json({ data: updated });
    }
  );

  router.get(
    "/products/:productId/options",
    featureMiddleware("sellingOptions"),
    async function listSellingOptions(request, response) {
    const options = await dependencies.useCases.listSellingOptions({
      product_id: requireRouteParam(request.params, "productId")
    });
    response.json({ data: options });
    }
  );

  router.post(
    "/products/:productId/options",
    featureMiddleware("sellingOptions"),
    async function createOption(request, response) {
    const payload = Object.assign({}, requireObjectBody(request.body), {
      product_id: requireRouteParam(request.params, "productId")
    });
    const saved = await dependencies.useCases.saveSellingOption(payload);
    response.status(201).json({ data: saved });
    }
  );

  router.patch(
    "/products/:productId/options/:optionId",
    featureMiddleware("sellingOptions"),
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

  router.get(
    "/categories",
    featureMiddleware("catalogExtras"),
    async function listCategories(request, response) {
    const categories = await dependencies.useCases.listCategories();
    response.json({ data: categories });
    }
  );

  router.post(
    "/categories",
    featureMiddleware("catalogExtras"),
    async function createCategory(request, response) {
    const category = await dependencies.useCases.createCategory(requireObjectBody(request.body));
    response.status(201).json({ data: category });
    }
  );

  router.get(
    "/suppliers",
    featureMiddleware("catalogExtras"),
    async function listSuppliers(request, response) {
    const suppliers = await dependencies.useCases.listSuppliers();
    response.json({ data: suppliers });
    }
  );

  router.post(
    "/suppliers",
    featureMiddleware("catalogExtras"),
    async function createSupplier(request, response) {
    const supplier = await dependencies.useCases.createSupplier(requireObjectBody(request.body));
    response.status(201).json({ data: supplier });
    }
  );

  router.get("/units", async function listUnits(request, response) {
    const units = await dependencies.useCases.listUnits();
    response.json({ data: units });
  });

  return router;
}
