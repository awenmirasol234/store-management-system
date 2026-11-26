const API_BASE = import.meta.env.VITE_API_BASE || "";
const TOKEN_KEY = "storeflow_auth_token";
const authEvents = new EventTarget();
let inMemoryToken = null;

export function subscribeToSessionExpiry(listener) {
  authEvents.addEventListener("expired", listener);
  return function unsubscribe() {
    authEvents.removeEventListener("expired", listener);
  };
}

export function getAuthToken() {
  try {
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      typeof window.localStorage.getItem === "function"
    ) {
      const stored = window.localStorage.getItem(TOKEN_KEY);
      if (stored !== null && stored !== undefined) {
        return stored;
      }
    }
  } catch (error) {
    // fallback to in-memory
  }
  return inMemoryToken;
}

export function setAuthToken(token) {
  inMemoryToken = token || null;
  try {
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      typeof window.localStorage.setItem === "function"
    ) {
      if (token) {
        window.localStorage.setItem(TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    }
  } catch (error) {
    // ignore storage error
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

function expireSession(response, token) {
  if (response.status === 401 && token && getAuthToken() === token) {
    clearAuthToken();
    authEvents.dispatchEvent(new Event("expired"));
  }
}

async function request(method, path, body) {
  const options = {
    method: method,
    headers: {}
  };
  const token = getAuthToken();
  if (token) {
    options.headers["Authorization"] = "Bearer " + token;
  }
  if (body !== undefined && !(body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  if (body instanceof FormData) {
    options.body = body;
  }

  const response = await fetch(API_BASE + path, options);
  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = await response.json();
      if (payload && payload.error && payload.error.message) {
        message = payload.error.message;
      }
    } catch {
      // The proxy may return a non-JSON error.
    }
    if (path !== "/api/auth/login" && path !== "/api/auth/setup" &&
        !(path === "/api/auth/change-pin" && message === "Current PIN is incorrect")) {
      expireSession(response, token);
    }
    throw new Error(message);
  }
  const payload = await response.json();
  return payload.data;
}

export function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return null;
  }
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return API_BASE + imageUrl;
}

export const api = {
  listProducts() {
    return request("GET", "/api/products");
  },
  listLowStockProducts() {
    return request("GET", "/api/products/low-stock");
  },
  getProduct(productId) {
    return request("GET", "/api/products/" + encodeURIComponent(productId));
  },
  lookupBarcode(barcode) {
    return request("GET", "/api/products/barcode/" + encodeURIComponent(barcode));
  },
  createProduct(data) {
    return request("POST", "/api/products", data);
  },
  updateProduct(productId, data) {
    return request("PATCH", "/api/products/" + encodeURIComponent(productId), data);
  },
  deleteProduct(productId) {
    return request("DELETE", "/api/products/" + encodeURIComponent(productId));
  },
  saveProductImageUrl(productId, url) {
    return request(
      "POST",
      "/api/products/" + encodeURIComponent(productId) + "/image-url",
      { url: url }
    );
  },
  uploadProductImage(productId, file) {
    const formData = new FormData();
    formData.append("image", file);
    return request(
      "POST",
      "/api/products/" + encodeURIComponent(productId) + "/image",
      formData
    );
  },
  importProductsCsv(file, updateExisting) {
    const formData = new FormData();
    formData.append("file", file);
    if (updateExisting) {
      formData.append("update_existing", "true");
    }
    return request("POST", "/api/products/import-csv", formData);
  },
  listSellingOptions(productId) {
    return request("GET", "/api/products/" + encodeURIComponent(productId) + "/options");
  },
  createSellingOption(productId, data) {
    return request("POST", "/api/products/" + encodeURIComponent(productId) + "/options", data);
  },
  updateSellingOption(productId, optionId, data) {
    return request(
      "PATCH",
      "/api/products/" + encodeURIComponent(productId) + "/options/" + encodeURIComponent(optionId),
      data
    );
  },
  stockIn(data) {
    return request("POST", "/api/inventory/stock-in", data);
  },
  adjustStock(data) {
    return request("POST", "/api/inventory/adjust", data);
  },
  listCategories() {
    return request("GET", "/api/categories");
  },
  createCategory(data) {
    return request("POST", "/api/categories", data);
  },
  listUnits() {
    return request("GET", "/api/units");
  },
  listSuppliers() {
    return request("GET", "/api/suppliers");
  },
  createSupplier(data) {
    return request("POST", "/api/suppliers", data);
  },
  calculateCart(data) {
    return request("POST", "/api/sales/calculate", data);
  },
  processSale(data) {
    return request("POST", "/api/sales", data);
  },
  listSales(limit) {
    const params = new URLSearchParams();
    if (limit) {
      params.set("limit", String(limit));
    }
    return request("GET", "/api/sales" + buildQuery(params));
  },
  getSale(saleId) {
    return request("GET", "/api/sales/" + encodeURIComponent(saleId));
  },
  processReturn(saleId, data) {
    return request("POST", "/api/sales/" + encodeURIComponent(saleId) + "/returns", data);
  },
  getReportsSummary(fromDate, toDate) {
    const query = buildDateRangeQuery(fromDate, toDate);
    return request("GET", "/api/reports/summary" + query);
  },
  getTopProducts(fromDate, toDate, limit) {
    const params = new URLSearchParams();
    if (fromDate) {
      params.set("from", fromDate);
    }
    if (toDate) {
      params.set("to", toDate);
    }
    if (limit) {
      params.set("limit", String(limit));
    }
    return request("GET", "/api/reports/top-products" + buildQuery(params));
  },
  getDailyReport(fromDate, toDate) {
    const query = buildDateRangeQuery(fromDate, toDate);
    return request("GET", "/api/reports/daily" + query);
  },
  getCategorySalesReport(fromDate, toDate) {
    const query = buildDateRangeQuery(fromDate, toDate);
    return request("GET", "/api/reports/categories" + query);
  },
  getStockMovementsReport(fromDate, toDate) {
    const query = buildDateRangeQuery(fromDate, toDate);
    return request("GET", "/api/reports/stock-movements" + query);
  },
  getTransactionsReport(fromDate, toDate) {
    const query = buildDateRangeQuery(fromDate, toDate);
    return request("GET", "/api/reports/transactions" + query);
  },
  listCustomers(query) {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    return request("GET", "/api/customers" + buildQuery(params));
  },
  createCustomer(data) {
    return request("POST", "/api/customers", data);
  },
  getCustomer(customerId) {
    return request("GET", "/api/customers/" + encodeURIComponent(customerId));
  },
  updateCustomer(customerId, data) {
    return request("PATCH", "/api/customers/" + encodeURIComponent(customerId), data);
  },
  recordPayment(customerId, data) {
    return request("POST", "/api/customers/" + encodeURIComponent(customerId) + "/payments", data);
  },
  listCreditTransactions(customerId, limit) {
    const params = new URLSearchParams();
    if (limit) {
      params.set("limit", String(limit));
    }
    return request(
      "GET",
      "/api/customers/" + encodeURIComponent(customerId) + "/transactions" + buildQuery(params)
    );
  },
  getAuthStatus() {
    return request("GET", "/api/auth/status");
  },
  getCapabilities() {
    return request("GET", "/api/capabilities");
  },
  setupInitialOwner(data) {
    return request("POST", "/api/auth/setup", data);
  },
  login(data) {
    return request("POST", "/api/auth/login", data);
  },
  logout() {
    return request("POST", "/api/auth/logout", {});
  },
  getMe() {
    return request("GET", "/api/auth/me");
  },
  changePin(data) {
    return request("POST", "/api/auth/change-pin", data);
  },
  listUsers() {
    return request("GET", "/api/users");
  },
  createUser(data) {
    return request("POST", "/api/users", data);
  },
  updateUser(userId, data) {
    return request("PATCH", "/api/users/" + encodeURIComponent(userId), data);
  },
  openShift(data) {
    return request("POST", "/api/shifts/open", data);
  },
  getActiveShift(userId) {
    let path = "/api/shifts/active";
    if (userId) {
      path = path + "?user_id=" + encodeURIComponent(userId);
    }
    return request("GET", path);
  },
  closeShift(shiftId, data) {
    return request("POST", "/api/shifts/" + encodeURIComponent(shiftId) + "/close", data);
  },
  recordCashMovement(shiftId, data) {
    return request("POST", "/api/shifts/" + encodeURIComponent(shiftId) + "/movements", data);
  },
  getShift(shiftId) {
    return request("GET", "/api/shifts/" + encodeURIComponent(shiftId));
  },
  listShifts(filters) {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.user_id) {
        params.set("user_id", filters.user_id);
      }
      if (filters.status) {
        params.set("status", filters.status);
      }
      if (filters.limit) {
        params.set("limit", String(filters.limit));
      }
      if (filters.offset) {
        params.set("offset", String(filters.offset));
      }
    }
    return request("GET", "/api/shifts" + buildQuery(params));
  },
  getSettings() {
    return request("GET", "/api/settings");
  },
  updateSettings(data) {
    return request("PATCH", "/api/settings", data);
  },
  async downloadBackup() {
    const token = getAuthToken();
    const headers = {};
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
    const response = await fetch(API_BASE + "/api/settings/backup", {
      method: "GET",
      headers: headers
    });
    if (!response.ok) {
      expireSession(response, token);
      let message = "Failed to download database backup";
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.error && errorJson.error.message) {
          message = errorJson.error.message;
        }
      } catch (e) {
        // ignore parse error
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition");
    let filename = "storeflow-backup.db";
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  }
};

function buildDateRangeQuery(fromDate, toDate) {
  const params = new URLSearchParams();
  if (fromDate) {
    params.set("from", fromDate);
  }
  if (toDate) {
    params.set("to", toDate);
  }
  return buildQuery(params);
}

function buildQuery(params) {
  const text = params.toString();
  if (text.length > 0) {
    return "?" + text;
  }
  return "";
}
