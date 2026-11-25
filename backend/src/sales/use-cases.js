import {
  fromMoneyInt,
  fromQuantityInt,
  roundHalfUpBigIntDiv,
  toMoneyInt,
  toQuantityInt
} from "../shared/decimal.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../shared/errors.js";
import {
  normalizeOptionalText,
  parsePositiveLimit,
  requireNonEmptyText
} from "../shared/validation.js";
import {
  INVENTORY_TRANSACTION_TYPES,
  createInventoryTransactionEntity,
  createProductEntity
} from "../inventory/domain.js";
import {
  SALE_STATUSES,
  calculateReturnRefundSplit,
  calculateSaleLine,
  formatReceiptNumber,
  validatePaymentBreakdown
} from "./domain.js";

async function resolveCartLines(dependencies, cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ValidationError("Sale must include at least one item");
  }

  const resolvedLines = [];
  const productCache = new Map();
  let subtotalInt = 0;

  for (let index = 0; index < cartItems.length; index++) {
    const rawItem = cartItems[index];
    let product = productCache.get(rawItem.product_id);
    if (!product) {
      product = await dependencies.productRepository.findById(rawItem.product_id);
      if (!product || product.deleted_at !== null) {
        throw new NotFoundError("Product not found: " + rawItem.product_id);
      }
      productCache.set(product.product_id, product);
    }

    let option = null;
    if (rawItem.option_id) {
      option = await dependencies.sellingOptionRepository.findById(rawItem.option_id);
      if (!option) {
        throw new NotFoundError("Selling option not found: " + rawItem.option_id);
      }
    }

    const line = calculateSaleLine({
      product: product,
      option: option,
      quantity: rawItem.quantity,
      custom_amount: rawItem.custom_amount,
      discount_amount: rawItem.discount_amount
    });

    subtotalInt = subtotalInt + toMoneyInt(line.subtotal, "subtotal");
    resolvedLines.push(line);
  }

  return {
    lines: resolvedLines,
    productsById: productCache,
    subtotal_int: subtotalInt
  };
}

async function validateActivityShift(dependencies, shiftId, actorUserId) {
  if (!shiftId) {
    return;
  }
  const shift = await dependencies.shiftRepository.findById(shiftId);
  if (!shift || shift.status !== "OPEN") {
    throw new ValidationError("Sales activity requires an open shift");
  }
  if (actorUserId && shift.user_id !== actorUserId) {
    throw new ForbiddenError("You can only record activity on your own shift");
  }
}

function applyOrderDiscount(subtotalInt, orderDiscountRaw) {
  let rawDiscount = orderDiscountRaw;
  if (rawDiscount === undefined || rawDiscount === null) {
    rawDiscount = 0;
  }
  const discountInt = toMoneyInt(rawDiscount, "discount_amount");
  if (discountInt < 0) {
    throw new ValidationError("Order discount_amount cannot be negative");
  }
  if (discountInt > subtotalInt) {
    throw new ValidationError("Order discount_amount cannot exceed subtotal_amount");
  }
  return {
    discount_int: discountInt,
    total_int: subtotalInt - discountInt
  };
}

function aggregateRequiredStockByProduct(lines) {
  const requiredByProduct = new Map();
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineBaseInt = toQuantityInt(line.base_quantity, "base_quantity");
    let currentRequired = requiredByProduct.get(line.product_id);
    if (currentRequired === undefined) {
      currentRequired = 0;
    }
    requiredByProduct.set(line.product_id, currentRequired + lineBaseInt);
  }
  return requiredByProduct;
}

export function createCalculateCartTotalsUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const resolved = await resolveCartLines(dependencies, safeInput.items);
    const totals = applyOrderDiscount(resolved.subtotal_int, safeInput.discount_amount);
    const requiredByProduct = aggregateRequiredStockByProduct(resolved.lines);

    const stockWarnings = [];
    for (const [productId, requiredInt] of requiredByProduct.entries()) {
      const product = resolved.productsById.get(productId);
      const availableInt = toQuantityInt(product.current_stock, "current_stock");
      if (requiredInt > availableInt) {
        stockWarnings.push({
          product_id: productId,
          product_name: product.product_name,
          available_stock: product.current_stock,
          required_stock: fromQuantityInt(requiredInt)
        });
      }
    }

    return {
      lines: resolved.lines,
      subtotal_amount: fromMoneyInt(resolved.subtotal_int),
      discount_amount: fromMoneyInt(totals.discount_int),
      total_amount: fromMoneyInt(totals.total_int),
      stock_warnings: stockWarnings
    };
  };
}

async function validateCustomerCredit(dependencies, payment) {
  if (payment.credit_amount <= 0) {
    return null;
  }
  if (!dependencies.customerRepository || !dependencies.creditTransactionRepository) {
    throw new ValidationError("Credit sales are not configured");
  }

  const customer = await dependencies.customerRepository.findById(payment.customer_id);
  if (!customer || !customer.is_active) {
    throw new NotFoundError("Active customer not found: " + payment.customer_id);
  }

  const currentBalanceInt = toMoneyInt(customer.current_balance, "current_balance");
  const chargeInt = toMoneyInt(payment.credit_amount, "credit_amount");
  const nextBalanceInt = currentBalanceInt + chargeInt;

  if (customer.credit_limit !== null && customer.credit_limit !== undefined) {
    const creditLimitInt = toMoneyInt(customer.credit_limit, "credit_limit");
    if (nextBalanceInt > creditLimitInt) {
      throw new ValidationError("Sale exceeds customer credit_limit");
    }
  }

  return {
    customer: customer,
    next_balance: fromMoneyInt(nextBalanceInt)
  };
}

async function recordCustomerCreditCharge(dependencies, creditContext, chargeInput) {
  if (!creditContext) {
    return null;
  }

  const updatedCustomer = Object.assign({}, creditContext.customer, {
    current_balance: creditContext.next_balance
  });
  const creditTransaction = {
    credit_tx_id: dependencies.idGenerator.nextId(),
    customer_id: creditContext.customer.customer_id,
    sale_id: chargeInput.sale_id,
    shift_id: chargeInput.shift_id,
    type: "CHARGE",
    amount: chargeInput.credit_amount,
    remarks: "POS Credit Sale",
    created_by: chargeInput.created_by,
    created_at: chargeInput.created_at
  };

  await dependencies.customerRepository.save(updatedCustomer);
  await dependencies.creditTransactionRepository.save(creditTransaction);
  return creditTransaction;
}

export function createProcessSaleUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    return dependencies.unitOfWork.run(async function runProcessSale() {
      const createdBy = requireNonEmptyText(safeInput.created_by, "created_by");
      const shiftId = normalizeOptionalText(safeInput.shift_id, "shift_id");
      await validateActivityShift(dependencies, shiftId, safeInput.actor_user_id);
      const resolved = await resolveCartLines(dependencies, safeInput.items);
      const totals = applyOrderDiscount(resolved.subtotal_int, safeInput.discount_amount);
      const requiredByProduct = aggregateRequiredStockByProduct(resolved.lines);

      for (const [productId, requiredInt] of requiredByProduct.entries()) {
        const product = resolved.productsById.get(productId);
        const availableInt = toQuantityInt(product.current_stock, "current_stock");
        if (availableInt <= 0) {
          throw new ValidationError("Product is out of stock: " + product.product_name);
        }
        if (requiredInt > availableInt) {
          throw new ValidationError("Insufficient stock for product: " + product.product_name);
        }
      }

      const payment = validatePaymentBreakdown({
        payment_method: safeInput.payment_method,
        total_amount: fromMoneyInt(totals.total_int),
        cash_amount: safeInput.cash_amount,
        credit_amount: safeInput.credit_amount,
        amount_paid: safeInput.amount_paid,
        customer_id: safeInput.customer_id
      });

      const creditContext = await validateCustomerCredit(dependencies, payment);

      const now = dependencies.clock.nowIso();
      const compactDate = dependencies.clock.todayManilaCompact();
      const sequence = await dependencies.salesRepository.nextReceiptSequence(compactDate);
      const receiptNumber = formatReceiptNumber(compactDate, sequence);
      const saleId = dependencies.idGenerator.nextId();

      const sale = {
        sale_id: saleId,
        receipt_number: receiptNumber,
        shift_id: shiftId,
        customer_id: payment.customer_id,
        payment_method: payment.payment_method,
        subtotal_amount: fromMoneyInt(resolved.subtotal_int),
        discount_amount: fromMoneyInt(totals.discount_int),
        total_amount: fromMoneyInt(totals.total_int),
        cash_amount: payment.cash_amount,
        credit_amount: payment.credit_amount,
        amount_paid: payment.amount_paid,
        change_amount: payment.change_amount,
        status: SALE_STATUSES.COMPLETED,
        created_by: createdBy,
        created_at: now
      };

      const salesItems = [];
      for (let index = 0; index < resolved.lines.length; index++) {
        const line = resolved.lines[index];
        salesItems.push(
          Object.assign(
            {
              sale_item_id: dependencies.idGenerator.nextId(),
              sale_id: saleId
            },
            line
          )
        );
      }

      await dependencies.salesRepository.saveSale(sale, salesItems);

      for (const [productId, requiredInt] of requiredByProduct.entries()) {
        const product = resolved.productsById.get(productId);
        const availableInt = toQuantityInt(product.current_stock, "current_stock");
        const updatedProduct = createProductEntity(
          Object.assign({}, product, {
            current_stock: fromQuantityInt(availableInt - requiredInt),
            updated_at: now
          })
        );
        await dependencies.productRepository.save(updatedProduct);

        const inventoryTx = createInventoryTransactionEntity({
          transaction_id: dependencies.idGenerator.nextId(),
          product_id: productId,
          supplier_id: null,
          option_id: null,
          transaction_type: INVENTORY_TRANSACTION_TYPES.SALE,
          quantity: fromQuantityInt(-requiredInt),
          unit_cost: product.cost_price,
          reference_number: receiptNumber,
          remarks: null,
          created_by: createdBy,
          created_at: now
        });
        await dependencies.inventoryTransactionRepository.save(inventoryTx);
      }

      const creditTransaction = await recordCustomerCreditCharge(
        dependencies,
        creditContext,
        {
          sale_id: saleId,
          shift_id: shiftId,
          credit_amount: payment.credit_amount,
          created_by: createdBy,
          created_at: now
        }
      );

      return {
        sale: sale,
        items: salesItems,
        credit_transaction: creditTransaction
      };
    });
  };
}

function calculateProportionalInt(totalInt, partQuantityInt, wholeQuantityInt) {
  if (partQuantityInt === wholeQuantityInt) {
    return totalInt;
  }
  const numerator = BigInt(totalInt) * BigInt(partQuantityInt);
  return Number(roundHalfUpBigIntDiv(numerator, BigInt(wholeQuantityInt)));
}

export function createProcessReturnUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    return dependencies.unitOfWork.run(async function runProcessReturn() {
      const createdBy = requireNonEmptyText(safeInput.created_by, "created_by");
      const remarks = requireNonEmptyText(safeInput.remarks, "remarks");
      const shiftId = normalizeOptionalText(safeInput.shift_id, "shift_id");
      await validateActivityShift(dependencies, shiftId, safeInput.actor_user_id);

      if (!Array.isArray(safeInput.items) || safeInput.items.length === 0) {
        throw new ValidationError("Return must include at least one item");
      }

      const existingSaleRecord = await dependencies.salesRepository.findSaleById(safeInput.sale_id);
      if (!existingSaleRecord) {
        throw new NotFoundError("Sale not found: " + safeInput.sale_id);
      }

      const sale = existingSaleRecord.sale;
      const itemsById = new Map();
      for (let index = 0; index < existingSaleRecord.items.length; index++) {
        const saleItem = existingSaleRecord.items[index];
        itemsById.set(saleItem.sale_item_id, saleItem);
      }

      const returnedSoFar = await dependencies.salesRepository.getReturnedQuantitiesBySaleId(
        sale.sale_id
      );

      const now = dependencies.clock.nowIso();
      let totalRefundInt = 0;
      const returnItems = [];

      for (let index = 0; index < safeInput.items.length; index++) {
        const requestItem = safeInput.items[index];
        for (let previousIndex = 0; previousIndex < index; previousIndex++) {
          if (safeInput.items[previousIndex].sale_item_id === requestItem.sale_item_id) {
            throw new ValidationError("Each sale item can appear only once in a return");
          }
        }
        const saleItem = itemsById.get(requestItem.sale_item_id);
        if (!saleItem) {
          throw new NotFoundError("Sale item not found in sale: " + requestItem.sale_item_id);
        }

        const returnQtyInt = toQuantityInt(requestItem.quantity, "quantity");
        if (returnQtyInt <= 0) {
          throw new ValidationError("Return quantity must be greater than zero");
        }

        const soldQtyInt = toQuantityInt(saleItem.quantity, "sold_quantity");
        let alreadyReturnedRaw = returnedSoFar.get(saleItem.sale_item_id);
        if (alreadyReturnedRaw === undefined) {
          alreadyReturnedRaw = 0;
        }
        const alreadyReturnedInt = toQuantityInt(alreadyReturnedRaw, "already_returned");
        if (alreadyReturnedInt + returnQtyInt > soldQtyInt) {
          throw new ValidationError("Return quantity exceeds remaining sold quantity");
        }

        const soldBaseQtyInt = toQuantityInt(saleItem.base_quantity, "base_quantity");
        const restoreBaseQtyInt = calculateProportionalInt(
          soldBaseQtyInt,
          returnQtyInt,
          soldQtyInt
        );

        const soldSubtotalInt = toMoneyInt(saleItem.subtotal, "subtotal");
        const lineRefundInt = calculateProportionalInt(soldSubtotalInt, returnQtyInt, soldQtyInt);
        totalRefundInt = totalRefundInt + lineRefundInt;

        const product = await dependencies.productRepository.findById(saleItem.product_id);
        if (!product) {
          throw new NotFoundError("Product not found: " + saleItem.product_id);
        }

        const currentStockInt = toQuantityInt(product.current_stock, "current_stock");
        const updatedProduct = createProductEntity(
          Object.assign({}, product, {
            current_stock: fromQuantityInt(currentStockInt + restoreBaseQtyInt),
            updated_at: now
          })
        );
        await dependencies.productRepository.save(updatedProduct);

        const inventoryTx = createInventoryTransactionEntity({
          transaction_id: dependencies.idGenerator.nextId(),
          product_id: product.product_id,
          supplier_id: null,
          option_id: saleItem.option_id,
          transaction_type: INVENTORY_TRANSACTION_TYPES.RETURN,
          quantity: fromQuantityInt(restoreBaseQtyInt),
          unit_cost: saleItem.unit_cost,
          reference_number: sale.receipt_number,
          remarks: remarks,
          created_by: createdBy,
          created_at: now
        });
        await dependencies.inventoryTransactionRepository.save(inventoryTx);

        returnItems.push({
          return_item_id: dependencies.idGenerator.nextId(),
          sale_item_id: saleItem.sale_item_id,
          product_id: saleItem.product_id,
          quantity: fromQuantityInt(returnQtyInt),
          base_quantity: fromQuantityInt(restoreBaseQtyInt),
          refund_amount: fromMoneyInt(lineRefundInt)
        });
      }

      const previouslyRefundedCredit = await dependencies.salesRepository.getRefundedCreditBySaleId(
        sale.sale_id
      );
      let remainingCreditInt =
        toMoneyInt(sale.credit_amount, "credit_amount") -
        toMoneyInt(previouslyRefundedCredit, "previously_refunded_credit");
      if (remainingCreditInt < 0) {
        remainingCreditInt = 0;
      }

      let refundCustomer = null;
      if (sale.customer_id !== null && remainingCreditInt > 0) {
        if (!dependencies.customerRepository || !dependencies.creditTransactionRepository) {
          throw new ValidationError("Credit refunds are not configured");
        }
        refundCustomer = await dependencies.customerRepository.findById(sale.customer_id);
        if (!refundCustomer) {
          throw new NotFoundError("Customer not found: " + sale.customer_id);
        }
        const currentBalanceInt = toMoneyInt(refundCustomer.current_balance, "current_balance");
        if (remainingCreditInt > currentBalanceInt) {
          remainingCreditInt = currentBalanceInt;
        }
      }

      const refundSplit = calculateReturnRefundSplit(
        fromMoneyInt(totalRefundInt),
        fromMoneyInt(remainingCreditInt)
      );

      let creditAdjustment = null;
      if (refundSplit.credit_refund_amount > 0 && refundCustomer) {
        const currentBalanceInt = toMoneyInt(refundCustomer.current_balance, "current_balance");
        const adjustInt = toMoneyInt(refundSplit.credit_refund_amount, "credit_refund_amount");
        const nextBalanceInt = currentBalanceInt - adjustInt;
        await dependencies.customerRepository.save(
          Object.assign({}, refundCustomer, {
            current_balance: fromMoneyInt(nextBalanceInt)
          })
        );
        creditAdjustment = {
          credit_tx_id: dependencies.idGenerator.nextId(),
          customer_id: refundCustomer.customer_id,
          sale_id: sale.sale_id,
          shift_id: shiftId,
          type: "RETURN_ADJUSTMENT",
          amount: refundSplit.credit_refund_amount,
          remarks: remarks,
          created_by: createdBy,
          created_at: now
        };
        await dependencies.creditTransactionRepository.save(creditAdjustment);
      }

      const returnRecord = {
        return_id: dependencies.idGenerator.nextId(),
        sale_id: sale.sale_id,
        shift_id: shiftId,
        total_refund_amount: fromMoneyInt(totalRefundInt),
        credit_refund_amount: refundSplit.credit_refund_amount,
        cash_refund_amount: refundSplit.cash_refund_amount,
        remarks: remarks,
        created_by: createdBy,
        created_at: now,
        items: returnItems
      };

      await dependencies.salesRepository.saveReturn(returnRecord);

      return {
        return_record: returnRecord,
        credit_transaction: creditAdjustment
      };
    });
  };
}

export function createListSalesUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const limit = parsePositiveLimit(safeInput.limit, 50, "limit");
    return dependencies.salesRepository.listRecentSales(limit);
  };
}

export function createGetSaleUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const record = await dependencies.salesRepository.findSaleById(safeInput.sale_id);
    if (!record) {
      throw new NotFoundError("Sale not found: " + safeInput.sale_id);
    }
    return record;
  };
}
