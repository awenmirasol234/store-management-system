import path from "node:path";
import express from "express";
import cors from "cors";
import multer from "multer";
import { DomainError } from "./shared/errors.js";
import { createSecurityHeadersMiddleware } from "./shared/security-headers.js";
import { createDefaultIdGenerator, createSystemClock } from "./shared/ports.js";
import { createFeatureConfig, getFeatureCapabilities, requireFeature } from "./shared/features.js";
import { createSqliteUnitOfWork, openSqliteDatabase } from "./db/sqlite.js";
import {
  createSqliteCategoryRepository,
  createSqliteInventoryTransactionRepository,
  createSqliteProductRepository,
  createSqliteSellingOptionRepository,
  createSqliteSupplierRepository,
  createSqliteUnitRepository
} from "./inventory/sqlite-repo.js";
import {
  createAdjustStockUseCase,
  createExportProductsToCsvUseCase,
  createExportProductsToXlsxUseCase,
  createGenerateProductXlsxTemplateUseCase,
  createImportProductsFromCsvUseCase,
  createCreateCategoryUseCase,
  createCreateSupplierUseCase,
  createDeleteProductUseCase,
  createGetLowStockProductsUseCase,
  createGetProductUseCase,
  createListCategoriesUseCase,
  createListInventoryTransactionsUseCase,
  createListProductsUseCase,
  createListSellingOptionsUseCase,
  createListSuppliersUseCase,
  createListUnitsUseCase,
  createLookupBarcodeUseCase,
  createCreateProductUseCase,
  createSaveSellingOptionUseCase,
  createStockInUseCase,
  createUpdateProductUseCase
} from "./inventory/use-cases.js";
import { createInventoryRouter } from "./inventory/routes.js";
import { createSqliteSalesRepository } from "./sales/sqlite-repo.js";
import {
  createCalculateCartTotalsUseCase,
  createGetSaleUseCase,
  createListSalesUseCase,
  createProcessReturnUseCase,
  createProcessSaleUseCase
} from "./sales/use-cases.js";
import { createSalesRouter } from "./sales/routes.js";
import { createSqliteReportsRepository } from "./reports/sqlite-repo.js";
import {
  createGetCategorySalesUseCase,
  createGetDailyBreakdownUseCase,
  createGetReportsSummaryUseCase,
  createGetStockMovementReportUseCase,
  createGetTopProductsUseCase,
  createGetTransactionsReportUseCase
} from "./reports/use-cases.js";
import { createReportsRouter } from "./reports/routes.js";
import {
  createSqliteCreditTransactionRepository,
  createSqliteCustomerRepository
} from "./credit/sqlite-repo.js";
import {
  createCreateCustomerUseCase,
  createGetCustomerUseCase,
  createListCreditTransactionsUseCase,
  createListCustomersUseCase,
  createRecordPaymentUseCase,
  createUpdateCustomerUseCase
} from "./credit/use-cases.js";
import { createCreditRouter } from "./credit/routes.js";
import {
  createSqliteSessionRepository,
  createSqliteUserRepository
} from "./auth/sqlite-repo.js";
import {
  createChangePinUseCase,
  createCreateUserUseCase,
  createGetAuthStatusUseCase,
  createGetCurrentUserUseCase,
  createListUsersUseCase,
  createLoginUseCase,
  createLogoutUseCase,
  createSetupInitialOwnerUseCase,
  createUpdateUserUseCase
} from "./auth/use-cases.js";
import {
  createAuthMiddleware,
  createInMemoryRateLimiter
} from "./auth/middleware.js";
import {
  createAuthRouter,
  createUsersRouter
} from "./auth/routes.js";
import { ROLES } from "./auth/domain.js";
import {
  createSqliteCashMovementRepository,
  createSqliteShiftRepository
} from "./shifts/sqlite-repo.js";
import {
  createCloseShiftUseCase,
  createGetActiveShiftUseCase,
  createGetShiftUseCase,
  createListShiftsUseCase,
  createOpenShiftUseCase,
  createRecordCashMovementUseCase
} from "./shifts/use-cases.js";
import { createShiftsRouter } from "./shifts/routes.js";
import { createSqliteSettingsRepository } from "./settings/sqlite-repo.js";
import {
  createGetSettingsUseCase,
  createUpdateSettingsUseCase
} from "./settings/use-cases.js";
import { createSettingsRouter } from "./settings/routes.js";

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

    if (error instanceof SyntaxError && error.type === "entity.parse.failed") {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body must contain valid JSON"
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
  const features = createFeatureConfig(config);
  const backendRoot = path.resolve(import.meta.dirname, "..");
  const uploadsDir = config.uploadsDir || path.join(backendRoot, "uploads");
  const idGenerator = config.idGenerator || createDefaultIdGenerator();
  const clock = config.clock || createSystemClock();
  const unitOfWork = createSqliteUnitOfWork(database);
  const productRepository = createSqliteProductRepository(database);
  const sellingOptionRepository = createSqliteSellingOptionRepository(database);
  const inventoryTransactionRepository = createSqliteInventoryTransactionRepository(database);
  const categoryRepository = createSqliteCategoryRepository(database);
  const supplierRepository = createSqliteSupplierRepository(database);
  const unitRepository = createSqliteUnitRepository(database);
  const customerRepository = createSqliteCustomerRepository(database);
  const creditTransactionRepository = createSqliteCreditTransactionRepository(database);
  const salesRepository = createSqliteSalesRepository(database);
  const reportsRepository = createSqliteReportsRepository(database);
  const userRepository = createSqliteUserRepository(database);
  const sessionRepository = createSqliteSessionRepository(database);
  const shiftRepository = createSqliteShiftRepository(database);
  const cashMovementRepository = createSqliteCashMovementRepository(database);
  const settingsRepository = createSqliteSettingsRepository(database);
  const rateLimiter = createInMemoryRateLimiter();

  const sharedDeps = {
    idGenerator: idGenerator,
    clock: clock,
    unitOfWork: unitOfWork,
    productRepository: productRepository,
    sellingOptionRepository: sellingOptionRepository,
    inventoryTransactionRepository: inventoryTransactionRepository,
    categoryRepository: categoryRepository,
    supplierRepository: supplierRepository,
    unitRepository: unitRepository,
    customerRepository: customerRepository,
    creditTransactionRepository: creditTransactionRepository,
    salesRepository: salesRepository,
    reportsRepository: reportsRepository,
    userRepository: userRepository,
    sessionRepository: sessionRepository,
    shiftRepository: shiftRepository,
    cashMovementRepository: cashMovementRepository,
    settingsRepository: settingsRepository,
    rateLimiter: rateLimiter,
    features: features
  };

  const inventoryUseCases = {
    createProduct: createCreateProductUseCase(sharedDeps),
    updateProduct: createUpdateProductUseCase(sharedDeps),
    deleteProduct: createDeleteProductUseCase(sharedDeps),
    saveSellingOption: createSaveSellingOptionUseCase(sharedDeps),
    stockIn: createStockInUseCase(sharedDeps),
    adjustStock: createAdjustStockUseCase(sharedDeps),
    getLowStockProducts: createGetLowStockProductsUseCase(sharedDeps),
    listProducts: createListProductsUseCase(sharedDeps),
    lookupBarcode: createLookupBarcodeUseCase(sharedDeps),
    getProduct: createGetProductUseCase(sharedDeps),
    listSellingOptions: createListSellingOptionsUseCase(sharedDeps),
    listInventoryTransactions: createListInventoryTransactionsUseCase(sharedDeps),
    listCategories: createListCategoriesUseCase(sharedDeps),
    createCategory: createCreateCategoryUseCase(sharedDeps),
    listSuppliers: createListSuppliersUseCase(sharedDeps),
    createSupplier: createCreateSupplierUseCase(sharedDeps),
    listUnits: createListUnitsUseCase(sharedDeps),
    exportProductsToCsv: createExportProductsToCsvUseCase(sharedDeps),
    exportProductsToXlsx: createExportProductsToXlsxUseCase(sharedDeps),
    generateProductXlsxTemplate: createGenerateProductXlsxTemplateUseCase(sharedDeps),
    importProductsFromCsv: createImportProductsFromCsvUseCase(sharedDeps)
  };

  const salesUseCases = {
    calculateCartTotals: createCalculateCartTotalsUseCase(sharedDeps),
    processSale: createProcessSaleUseCase(sharedDeps),
    processReturn: createProcessReturnUseCase(sharedDeps),
    listSales: createListSalesUseCase(sharedDeps),
    getSale: createGetSaleUseCase(sharedDeps)
  };

  const reportsUseCases = {
    getSummary: createGetReportsSummaryUseCase(sharedDeps),
    getTopProducts: createGetTopProductsUseCase(sharedDeps),
    getDailyBreakdown: createGetDailyBreakdownUseCase(sharedDeps),
    getCategorySales: createGetCategorySalesUseCase(sharedDeps),
    getStockMovementReport: createGetStockMovementReportUseCase(sharedDeps),
    getTransactionsReport: createGetTransactionsReportUseCase(sharedDeps)
  };

  const creditUseCases = {
    createCustomer: createCreateCustomerUseCase(sharedDeps),
    updateCustomer: createUpdateCustomerUseCase(sharedDeps),
    getCustomer: createGetCustomerUseCase(sharedDeps),
    listCustomers: createListCustomersUseCase(sharedDeps),
    recordPayment: createRecordPaymentUseCase(sharedDeps),
    listCreditTransactions: createListCreditTransactionsUseCase(sharedDeps)
  };

  const shiftsUseCases = {
    openShift: createOpenShiftUseCase(sharedDeps),
    getActiveShift: createGetActiveShiftUseCase(sharedDeps),
    recordCashMovement: createRecordCashMovementUseCase(sharedDeps),
    closeShift: createCloseShiftUseCase(sharedDeps),
    getShift: createGetShiftUseCase(sharedDeps),
    listShifts: createListShiftsUseCase(sharedDeps)
  };

  const authUseCases = {
    getAuthStatus: createGetAuthStatusUseCase(sharedDeps),
    setupInitialOwner: createSetupInitialOwnerUseCase(sharedDeps),
    login: createLoginUseCase(sharedDeps),
    logout: createLogoutUseCase(sharedDeps),
    getCurrentUser: createGetCurrentUserUseCase(sharedDeps),
    createUser: createCreateUserUseCase(sharedDeps),
    updateUser: createUpdateUserUseCase(sharedDeps),
    listUsers: createListUsersUseCase(sharedDeps),
    changePin: createChangePinUseCase(sharedDeps)
  };

  const settingsUseCases = {
    getSettings: createGetSettingsUseCase(sharedDeps),
    updateSettings: createUpdateSettingsUseCase(sharedDeps)
  };

  const authMiddleware = createAuthMiddleware(authUseCases);
  const enforceAuth = Boolean(config.enforceAuth || process.env.ENFORCE_AUTH === "true");

  const app = express();
  app.use(createSecurityHeadersMiddleware());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use("/uploads", express.static(uploadsDir));
  app.use(authMiddleware.authenticate);

  app.get("/api/health", function healthCheck(request, response) {
    response.json({ data: { status: "ok" } });
  });
  app.get("/api/capabilities", function capabilities(request, response) {
    response.json({ data: getFeatureCapabilities(features) });
  });

  app.use("/api/auth", createAuthRouter(authUseCases));
  app.use(
    "/api/users",
    requireFeature(features, "staffManagement"),
    createUsersRouter({
      useCases: authUseCases,
      authMiddleware: authMiddleware,
      enforceAuth: enforceAuth
    })
  );
  app.use("/api/customers", requireFeature(features, "customerCredit"));
  app.use("/api/shifts", requireFeature(features, "cashDrawer"));
  app.use("/api/settings/backup", requireFeature(features, "databaseBackup"));

  if (enforceAuth) {
    const requireAuthOrOwnerForWrite = function checkAuth(request, response, next) {
      if (request.method === "GET") {
        authMiddleware.requireAuth(request, response, next);
      } else {
        authMiddleware.requireRole([ROLES.OWNER])(request, response, next);
      }
    };

    app.use("/api/reports", authMiddleware.requireRole([ROLES.OWNER]));
    app.use("/api/sales", authMiddleware.requireAuth);
    app.use("/api/customers", authMiddleware.requireAuth);
    app.use("/api/products", requireAuthOrOwnerForWrite);
    app.use("/api/inventory", authMiddleware.requireRole([ROLES.OWNER]));
    app.use("/api/categories", requireAuthOrOwnerForWrite);
    app.use("/api/suppliers", requireAuthOrOwnerForWrite);
    app.use("/api/units", authMiddleware.requireAuth);
    app.use("/api/shifts", authMiddleware.requireAuth);
    app.use("/api/settings/backup", authMiddleware.requireRole([ROLES.OWNER]));
    app.use("/api/settings", requireAuthOrOwnerForWrite);
  }

  app.use(
    "/api",
    createInventoryRouter({
      uploadsDir: uploadsDir,
      useCases: inventoryUseCases,
      fetch: config.fetch,
      dnsLookup: config.dnsLookup,
      features: features
    })
  );

  app.use(
    "/api",
    createSalesRouter({
      useCases: salesUseCases
    })
  );

  app.use(
    "/api",
    createReportsRouter({
      useCases: reportsUseCases
    })
  );

  app.use(
    "/api",
    createCreditRouter({
      useCases: creditUseCases
    })
  );

  app.use(
    "/api",
    createShiftsRouter({
      useCases: shiftsUseCases
    })
  );

  app.use(
    "/api",
    createSettingsRouter({
      databasePath: config.databasePath,
      database: database,
      useCases: settingsUseCases
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
    database: database,
    repositories: {
      productRepository: productRepository,
      sellingOptionRepository: sellingOptionRepository,
      inventoryTransactionRepository: inventoryTransactionRepository,
      categoryRepository: categoryRepository,
      supplierRepository: supplierRepository,
      unitRepository: unitRepository,
      customerRepository: customerRepository,
      creditTransactionRepository: creditTransactionRepository,
      salesRepository: salesRepository,
      reportsRepository: reportsRepository,
      userRepository: userRepository,
      sessionRepository: sessionRepository,
      shiftRepository: shiftRepository,
      cashMovementRepository: cashMovementRepository,
      settingsRepository: settingsRepository
    },
    useCases: {
      inventory: inventoryUseCases,
      sales: salesUseCases,
      reports: reportsUseCases,
      credit: creditUseCases,
      auth: authUseCases,
      shifts: shiftsUseCases,
      settings: settingsUseCases,
      features: features
    }
  };
}
