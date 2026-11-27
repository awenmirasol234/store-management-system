import { formatQuantity, formatUnit } from "./format.js";

export function computeLocalCartTotals(cartItems, orderDiscount) {
  let subtotal = 0;
  let items = [];
  if (Array.isArray(cartItems)) {
    items = cartItems;
  }
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const unitPrice = Number(item && item.unit_price);
    const quantity = Number(item && item.quantity);
    if (Number.isFinite(unitPrice) && unitPrice >= 0 && Number.isFinite(quantity) && quantity > 0) {
      subtotal = subtotal + unitPrice * quantity;
    }
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
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice <= 0
    ) {
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

export function sanitizeCartItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleanItems = [];
  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (!item || typeof item !== "object") {
      continue;
    }

    const productId = String(item.product_id || "").trim();
    const unitPrice = Number(item.unit_price);
    const quantity = Number(item.quantity);
    let baseQuantityPerUnit = 1;
    if (item.base_quantity_per_unit !== null && item.base_quantity_per_unit !== undefined) {
      baseQuantityPerUnit = Number(item.base_quantity_per_unit);
    }
    const key = String(item.key || "").trim();

    if (
      !productId ||
      !key ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(baseQuantityPerUnit) ||
      baseQuantityPerUnit <= 0
    ) {
      continue;
    }

    let customAmount = null;
    if (item.custom_amount !== null && item.custom_amount !== undefined) {
      customAmount = Number(item.custom_amount);
      if (!Number.isFinite(customAmount) || customAmount <= 0) {
        continue;
      }
    }

    const cleanItem = Object.assign({}, item);
    cleanItem.product_id = productId;
    cleanItem.unit_price = unitPrice;
    cleanItem.quantity = quantity;
    if (item.base_quantity_per_unit !== null && item.base_quantity_per_unit !== undefined) {
      cleanItem.base_quantity_per_unit = baseQuantityPerUnit;
    }
    cleanItem.custom_amount = customAmount;
    cleanItems.push(cleanItem);
  }

  return cleanItems;
}

// shortcut: client-side stock availability checked against local product snapshot; backend transaction re-validates atomically on checkout.
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
      unitLabel = " " + formatUnit(product.base_unit, currentStock);
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

const PHP_BANKNOTES = [20, 50, 100, 200, 500, 1000];

export function getSmartCashPresets(totalDue) {
  let safeTotal = Number(totalDue);
  if (!Number.isFinite(safeTotal) || safeTotal < 0) {
    safeTotal = 0;
  }
  safeTotal = Math.round(safeTotal * 100) / 100;

  const presets = [
    { key: "exact", label: "Exact", amount: safeTotal }
  ];
  if (safeTotal <= 0) {
    return presets;
  }

  const candidates = [];
  if (safeTotal < 1000) {
    for (let i = 0; i < PHP_BANKNOTES.length; i++) {
      if (PHP_BANKNOTES[i] > safeTotal) {
        candidates.push(PHP_BANKNOTES[i]);
      }
    }
  } else {
    const steps = [100, 500, 1000];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const nextMultiple = Math.floor(safeTotal / step) * step + step;
      if (nextMultiple > safeTotal && !candidates.includes(nextMultiple)) {
        candidates.push(nextMultiple);
      }
    }
  }

  const maxBills = Math.min(3, candidates.length);
  for (let i = 0; i < maxBills; i++) {
    const bill = candidates[i];
    presets.push({
      key: String(bill),
      label: "₱" + bill.toLocaleString("en-PH"),
      amount: bill
    });
  }
  return presets;
}

export function evaluateCashTendered(rawInput, totalDue) {
  let safeTotal = Number(totalDue);
  if (!Number.isFinite(safeTotal) || safeTotal < 0) {
    safeTotal = 0;
  }
  safeTotal = Math.round(safeTotal * 100) / 100;

  let text = "";
  if (rawInput !== undefined && rawInput !== null) {
    text = String(rawInput).trim();
  }
  if (text.length === 0) {
    return {
      status: "empty",
      amount: null,
      changeAmount: 0,
      shortAmount: safeTotal,
      errorMessage: ""
    };
  }

  if (text.startsWith("-")) {
    return {
      status: "invalid",
      amount: null,
      changeAmount: 0,
      shortAmount: safeTotal,
      errorMessage: "Amount cannot be negative."
    };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return {
      status: "invalid",
      amount: null,
      changeAmount: 0,
      shortAmount: safeTotal,
      errorMessage: "Enter a valid amount with up to 2 decimal places."
    };
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return {
      status: "invalid",
      amount: null,
      changeAmount: 0,
      shortAmount: safeTotal,
      errorMessage: "Enter a valid amount."
    };
  }

  const rounded = Math.round(parsed * 100) / 100;
  if (rounded < safeTotal) {
    const shortAmount = Math.round((safeTotal - rounded) * 100) / 100;
    return {
      status: "short",
      amount: rounded,
      changeAmount: 0,
      shortAmount: shortAmount,
      errorMessage: ""
    };
  }

  const changeAmount = Math.round((rounded - safeTotal) * 100) / 100;
  return {
    status: "sufficient",
    amount: rounded,
    changeAmount: changeAmount,
    shortAmount: 0,
    errorMessage: ""
  };
}
