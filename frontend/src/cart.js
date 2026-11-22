import { formatQuantity } from "./format.js";

export function computeLocalCartTotals(cartItems, orderDiscount) {
  let subtotal = 0;
  for (let index = 0; index < cartItems.length; index++) {
    const item = cartItems[index];
    subtotal = subtotal + item.unit_price * item.quantity;
  }
  subtotal = Math.round(subtotal * 100) / 100;

  let discount = Number(orderDiscount);
  if (!Number.isFinite(discount) || discount < 0) {
    discount = 0;
  }
  if (discount > subtotal) {
    discount = subtotal;
  }
  discount = Math.round(discount * 100) / 100;

  const total = Math.round((subtotal - discount) * 100) / 100;
  return {
    subtotal: subtotal,
    discount: discount,
    total: total
  };
}

export function computeItemBaseQuantity(input) {
  const safeInput = input || {};
  const product = safeInput.product;
  const option = safeInput.option;
  const customAmount = safeInput.customAmount;
  let quantity = Number(safeInput.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    quantity = 1;
  }

  if (customAmount !== null && customAmount !== undefined && product) {
    const parsedAmount = Number(customAmount);
    const sellingPrice = Number(product.selling_price);
    if (!Number.isFinite(parsedAmount) || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      return 0;
    }
    // Calculate base quantity from peso amount (4-decimal precision)
    const baseQty = Math.round((parsedAmount / sellingPrice) * 10000) / 10000;
    return baseQty * quantity;
  }

  if (option && option.quantity !== null && option.quantity !== undefined) {
    const optionQty = Number(option.quantity);
    if (Number.isFinite(optionQty) && optionQty > 0) {
      return optionQty * quantity;
    }
  }

  return 1 * quantity;
}

export function calculateProductCartStockUsage(cartItems, productId) {
  if (!Array.isArray(cartItems) || !productId) {
    return 0;
  }
  let totalScaled = 0;
  for (let index = 0; index < cartItems.length; index++) {
    const item = cartItems[index];
    if (item && item.product_id === productId) {
      const qty = Number(item.quantity);
      let perUnit = Number(item.base_quantity_per_unit);
      if (!Number.isFinite(perUnit) || perUnit <= 0) {
        perUnit = 1;
      }
      if (Number.isFinite(qty) && qty > 0) {
        totalScaled = totalScaled + Math.round(qty * perUnit * 10000);
      }
    }
  }
  return totalScaled / 10000;
}

export function canAddStockToCart(input) {
  const safeInput = input || {};
  const cartItems = safeInput.cartItems || [];
  const product = safeInput.product;
  const additionalBaseQuantity = Number(safeInput.additionalBaseQuantity);

  if (!product) {
    return {
      allowed: false,
      message: "Product is not available"
    };
  }

  const currentStock = Number(product.current_stock);
  if (!Number.isFinite(currentStock) || currentStock <= 0) {
    return {
      allowed: false,
      message: product.product_name + " is out of stock"
    };
  }

  let addQty = 1;
  if (Number.isFinite(additionalBaseQuantity) && additionalBaseQuantity > 0) {
    addQty = additionalBaseQuantity;
  }

  const currentUsage = calculateProductCartStockUsage(cartItems, product.product_id);
  const currentUsageScaled = Math.round(currentUsage * 10000);
  const additionalScaled = Math.round(addQty * 10000);
  const stockScaled = Math.round(currentStock * 10000);

  if (currentUsageScaled + additionalScaled > stockScaled) {
    let unitLabel = "";
    if (product.base_unit) {
      unitLabel = " " + product.base_unit;
    }
    return {
      allowed: false,
      message:
        "Requested quantity exceeds available stock for " +
        product.product_name +
        " (" +
        formatQuantity(currentStock) +
        unitLabel +
        " available)."
    };
  }

  return {
    allowed: true,
    message: ""
  };
}
