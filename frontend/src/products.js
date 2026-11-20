export const STOCK_LEVELS = {
  OUT: "OUT",
  LOW: "LOW",
  HEALTHY: "HEALTHY"
};

export function getStockLevel(product) {
  if (product.current_stock <= 0) {
    return STOCK_LEVELS.OUT;
  }
  if (product.current_stock <= product.reorder_level) {
    return STOCK_LEVELS.LOW;
  }
  return STOCK_LEVELS.HEALTHY;
}

export function filterProducts(products, query) {
  const lowerQuery = query.trim().toLowerCase();
  const results = [];
  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    if (lowerQuery.length > 0) {
      const nameMatches = product.product_name.toLowerCase().includes(lowerQuery);
      let barcodeMatches = false;
      if (product.barcode !== null && product.barcode !== undefined) {
        barcodeMatches = product.barcode.toLowerCase().includes(lowerQuery);
      }
      if (!nameMatches && !barcodeMatches) {
        continue;
      }
    }
    results.push(product);
  }
  return results;
}
