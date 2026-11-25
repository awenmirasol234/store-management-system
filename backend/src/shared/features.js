import { FeatureDisabledError, ValidationError } from "./errors.js";

const DEFAULT_FEATURES = {
  customerCredit: true,
  sellingOptions: true,
  customAmountSales: true,
  catalogExtras: true,
  productImages: true,
  databaseBackup: true
};

function readBoolean(value, fallbackValue) {
  if (value === undefined || value === null) {
    return fallbackValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  throw new ValidationError("Feature configuration must use true or false values");
}

function readFeature(options, featureName, environmentName, fallbackValue) {
  let value = fallbackValue;
  if (options.features && options.features[featureName] !== undefined) {
    value = options.features[featureName];
  } else if (process.env[environmentName] !== undefined) {
    value = process.env[environmentName];
  }
  return readBoolean(value, fallbackValue);
}

export function createFeatureConfig(options) {
  let config = options;
  if (!config) {
    config = {};
  }

  let operationMode = config.operationMode;
  if (operationMode === undefined) {
    operationMode = process.env.STORE_OPERATION_MODE || "single_user";
  }
  if (operationMode !== "single_user" && operationMode !== "multi_user") {
    throw new ValidationError("STORE_OPERATION_MODE must be single_user or multi_user");
  }

  const multiUserEnabled = operationMode === "multi_user";
  const customerCredit = readFeature(
    config,
    "customerCredit",
    "ENABLE_CUSTOMER_CREDIT",
    DEFAULT_FEATURES.customerCredit
  );
  const sellingOptions = readFeature(
    config,
    "sellingOptions",
    "ENABLE_SELLING_OPTIONS",
    DEFAULT_FEATURES.sellingOptions
  );
  const customAmountSales = readFeature(
    config,
    "customAmountSales",
    "ENABLE_CUSTOM_AMOUNT_SALES",
    DEFAULT_FEATURES.customAmountSales
  );
  const catalogExtras = readFeature(
    config,
    "catalogExtras",
    "ENABLE_PRODUCT_CATALOG_EXTRAS",
    DEFAULT_FEATURES.catalogExtras
  );
  const productImages = readFeature(
    config,
    "productImages",
    "ENABLE_PRODUCT_IMAGES",
    DEFAULT_FEATURES.productImages
  );
  const databaseBackup = readFeature(
    config,
    "databaseBackup",
    "ENABLE_DATABASE_BACKUP",
    DEFAULT_FEATURES.databaseBackup
  );
  const cashDrawer = readFeature(
    config,
    "cashDrawer",
    "ENABLE_CASH_DRAWER",
    false
  );

  return {
    mode: operationMode,
    staffManagement: multiUserEnabled,
    roles: multiUserEnabled,
    cashDrawer: cashDrawer,
    customerCredit: customerCredit,
    sellingOptions: sellingOptions,
    customAmountSales: customAmountSales,
    catalogExtras: catalogExtras,
    productImages: productImages,
    databaseBackup: databaseBackup
  };
}

export function requireFeature(features, featureName) {
  return function checkFeature(request, response, next) {
    if (!features[featureName]) {
      throw new FeatureDisabledError(featureName);
    }
    next();
  };
}

export function getFeatureCapabilities(features) {
  return {
    mode: features.mode,
    staff_management: features.staffManagement,
    roles: features.roles,
    cash_drawer: features.cashDrawer,
    customer_credit: features.customerCredit,
    selling_options: features.sellingOptions,
    custom_amount_sales: features.customAmountSales,
    catalog_extras: features.catalogExtras,
    product_images: features.productImages,
    database_backup: features.databaseBackup
  };
}
