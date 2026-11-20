import path from "node:path";
import express from "express";
import cors from "cors";
import multer from "multer";
import { DomainError } from "./shared/errors.js";
import { createDefaultIdGenerator, createSystemClock } from "./shared/ports.js";
import { createSqliteUnitOfWork, openSqliteDatabase } from "./db/sqlite.js";
import {
  createSqliteCategoryRepository,
  createSqliteInventoryTransactionRepository,
  createSqliteProductRepository,
  createSqliteSellingOptionRepository,
  createSqliteSupplierRepository
} from "./inventory/sqlite-repo.js";
import {
  createAdjustStockUseCase,
  createDeleteProductUseCase,
  createGetLowStockProductsUseCase,
  createProductUseCase,
  createSaveSellingOptionUseCase,
  createStockInUseCase,
  createUpdateProductUseCase
} from "./inventory/use-cases.js";
import { createInventoryRouter } from "./inventory/routes.js";
import { createSqliteSalesRepository } from "./sales/sqlite-repo.js";
import {
  createCalculateCartTotalsUseCase,
  createProcessReturnUseCase,
  createProcessSaleUseCase
} from "./sales/use-cases.js";
import { createSalesRouter } from "./sales/routes.js";

function createErrorHandler() {
  return function handleError(error, request, response, next) {
    if (error instanceof DomainError) {
      response.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    if (error instanceof multer.MulterError) {
      response.status(400).json({
        error: {
          code: "UPLOAD_ERROR",
          message: error.message
        }
      });
      return;
    }

    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error"
      }
    });
  };
}

export function createApp(options) {
  let config = options;
  if (!config) {
    config = {};
  }

  const database = config.database || openSqliteDatabase(config.databasePath);
  const uploadsDir = config.uploadsDir || path.resolve(process.cwd(), "uploads");
  const idGenerator = config.idGenerator || createDefaultIdGenerator();
  const clock = config.clock || createSystemClock();
  const unitOfWork = createSqliteUnitOfWork(database);

  const productRepository = createSqliteProductRepository(database);
  const sellingOptionRepository = createSqliteSellingOptionRepository(database);
  const inventoryTransactionRepository = createSqliteInventoryTransactionRepository(database);
  const categoryRepository = createSqliteCategoryRepository(database);
  const supplierRepository = createSqliteSupplierRepository(database);
  const salesRepository = createSqliteSalesRepository(database);

  const sharedDeps = {
    idGenerator: idGenerator,
    clock: clock,
    unitOfWork: unitOfWork,
    productRepository: productRepository,
    sellingOptionRepository: sellingOptionRepository,
    inventoryTransactionRepository: inventoryTransactionRepository,
    salesRepository: salesRepository
  };

  const inventoryUseCases = {
    createProduct: createProductUseCase(sharedDeps),
    updateProduct: createUpdateProductUseCase(sharedDeps),
    deleteProduct: createDeleteProductUseCase(sharedDeps),
    saveSellingOption: createSaveSellingOptionUseCase(sharedDeps),
    stockIn: createStockInUseCase(sharedDeps),
    adjustStock: createAdjustStockUseCase(sharedDeps),
    getLowStockProducts: createGetLowStockProductsUseCase(sharedDeps)
  };

  const salesUseCases = {
    calculateCartTotals: createCalculateCartTotalsUseCase(sharedDeps),
    processSale: createProcessSaleUseCase(sharedDeps),
    processReturn: createProcessReturnUseCase(sharedDeps)
  };

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/health", function healthCheck(request, response) {
    response.json({ data: { status: "ok" } });
  });

  app.use(
    "/api",
    createInventoryRouter({
      uploadsDir: uploadsDir,
      idGenerator: idGenerator,
      productRepository: productRepository,
      sellingOptionRepository: sellingOptionRepository,
      inventoryTransactionRepository: inventoryTransactionRepository,
      categoryRepository: categoryRepository,
      supplierRepository: supplierRepository,
      useCases: inventoryUseCases
    })
  );

  app.use(
    "/api",
    createSalesRouter({
      salesRepository: salesRepository,
      useCases: salesUseCases
    })
  );

  app.use(function handleNotFound(request, response) {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found"
      }
    });
  });

  app.use(createErrorHandler());

  return {
    app: app,
    database: database
  };
}
