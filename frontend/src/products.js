export const COMMON_BASE_UNITS = [
  "Piece (pc)",
  "Pack",
  "Box",
  "Bottle",
  "Can",
  "Sachet",
  "Kilogram (kg)",
  "Gram (g)",
  "Liter (L)",
  "Milliliter (mL)",
  "Meter (m)",
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
  "Stick",
  "Ream",
  "Sheet"
];

export const PRODUCT_CATEGORIES = [
  "All",
  "Beverages",
  "Snacks",
  "Biscuits & Crackers",
  "Candies & Chocolates",
  "Canned Goods",
  "Instant Food",
  "Rice & Grains",
  "Condiments & Seasonings",
  "Cooking Essentials",
  "Bread & Bakery",
  "Frozen Goods",
  "Meat & Processed Foods",
  "Personal Care",
  "Laundry & Cleaning",
  "Household Supplies",
  "Kitchen Supplies",
  "Baby Products",
  "Health & Hygiene",
  "School & Office Supplies",
  "Cigarettes & Tobacco"
];

export const STOCK_LEVELS = {
  OUT: "OUT",
  LOW: "LOW",
  HEALTHY: "HEALTHY"
};

export function getStockLevel(product) {
  if (!product) {
    return STOCK_LEVELS.OUT;
  }
  const currentStock = Number(product.current_stock);
  const reorderLevel = Number(product.reorder_level);
  if (!Number.isFinite(currentStock) || currentStock <= 0) {
    return STOCK_LEVELS.OUT;
  }
  if (Number.isFinite(reorderLevel) && currentStock <= reorderLevel) {
    return STOCK_LEVELS.LOW;
  }
  return STOCK_LEVELS.HEALTHY;
}

export function filterProducts(products, query) {
  if (!products || !Array.isArray(products)) {
    return [];
  }
  let lowerQuery = "";
  if (typeof query === "string") {
    lowerQuery = query.trim().toLowerCase();
  }
  const results = [];
  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    if (!product) {
      continue;
    }
    if (lowerQuery.length > 0) {
      let nameMatches = false;
      if (typeof product.product_name === "string") {
        nameMatches = product.product_name.toLowerCase().includes(lowerQuery);
      }
      let barcodeMatches = false;
      if (product.barcode !== null && product.barcode !== undefined) {
        barcodeMatches = String(product.barcode).toLowerCase().includes(lowerQuery);
      }
      if (!nameMatches && !barcodeMatches) {
        continue;
      }
    }
    results.push(product);
  }
  return results;
}

export function validateImageUrl(url) {
  if (url === undefined || url === null || typeof url !== "string") {
    return "";
  }
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return "";
  }
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return "URL must start with http:// or https://";
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Only HTTP and HTTPS URLs are supported";
    }
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return "Image URL must contain a valid domain name";
    }
  } catch (error) {
    return "Please enter a valid web URL";
  }
  return "";
}

export function calculatePosGridColumns(params) {
  const containerWidth = params ? params.containerWidth : 0;
  let viewportWidth = containerWidth;
  if (params && typeof params.viewportWidth === "number") {
    viewportWidth = params.viewportWidth;
  } else if (typeof window !== "undefined" && typeof window.innerWidth === "number") {
    viewportWidth = window.innerWidth;
  }

  // Fallback for SSR or unmeasured container
  if (!containerWidth || containerWidth <= 0) {
    if (viewportWidth >= 1536) {
      return 6;
    }
    if (viewportWidth >= 1280) {
      return 5;
    }
    if (viewportWidth >= 1024) {
      return 4;
    }
    if (viewportWidth >= 640) {
      return 3;
    }
    return 2;
  }

  // 1. Mobile viewports (< 768px): preserve 2-column layout (1 column only if extremely narrow < 260px)
  if (viewportWidth < 768) {
    if (containerWidth < 260) {
      return 1;
    }
    return 2;
  }

  // 2. Tablet viewports (768px to 1023px): min card width 180px, gap 12px
  if (viewportWidth < 1024) {
    const minCardWidth = 180;
    const gap = 12;
    const fitColumns = Math.floor((containerWidth + gap) / (minCardWidth + gap));
    let columns = fitColumns;
    if (columns < 1) {
      columns = 1;
    }
    if (columns > 4) {
      columns = 4;
    }
    return columns;
  }

  // 3. Desktop viewports (>= 1024px): min card width 200px, gap 12px
  const minCardWidth = 200;
  const gap = 12;
  const fitColumns = Math.floor((containerWidth + gap) / (minCardWidth + gap));
  let columns = fitColumns;
  if (columns < 1) {
    columns = 1;
  }
  if (columns > 6) {
    columns = 6;
  }
  return columns;
}
