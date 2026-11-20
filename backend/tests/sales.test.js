import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/shared/errors.js";
import { createProductUseCase, createSaveSellingOptionUseCase } from "../src/inventory/use-cases.js";
import { calculateItemProfit, PAYMENT_METHODS } from "../src/sales/domain.js";
import {
  createCalculateCartTotalsUseCase,
  createProcessReturnUseCase,
  createProcessSaleUseCase
} from "../src/sales/use-cases.js";

function createInMemorySalesDeps() {
  const products = new Map();
  const options = new Map();
  const inventoryTransactions = [];
  const sales = new Map();
  const returns = [];
  const customers = new Map();
  const creditTransactions = [];
  const receiptSeqByDate = new Map();
  let counter = 1;

  return {
    products: products,
    options: options,
    inventoryTransactions: inventoryTransactions,
    sales: sales,
    returns: returns,
    customers: customers,
    creditTransactions: creditTransactions,
    idGenerator: {
      nextId() {
        const idValue = "id-" + String(counter);
        counter = counter + 1;
        return idValue;
      }
    },
    clock: {
      nowIso() {
        return "2026-11-20T02:00:00.000Z";
      },
      todayManilaCompact() {
        return "20261120";
      }
    },
    unitOfWork: {
      async run(work) {
        return work();
      }
    },
    productRepository: {
      async findById(productId) {
        return products.get(productId) || null;
      },
      async findByBarcode(barcode) {
        for (const product of products.values()) {
          if (product.barcode === barcode && product.deleted_at === null) {
            return product;
          }
        }
        return null;
      },
      async save(product) {
        products.set(product.product_id, product);
      }
    },
    sellingOptionRepository: {
      async findById(optionId) {
        return options.get(optionId) || null;
      },
      async findByBarcode(barcode) {
        for (const option of options.values()) {
          if (option.barcode === barcode) {
            return option;
          }
        }
        return null;
      },
      async save(option) {
        options.set(option.option_id, option);
      }
    },
    inventoryTransactionRepository: {
      async save(transaction) {
        inventoryTransactions.push(transaction);
      }
    },
    salesRepository: {
      async nextReceiptSequence(compactDate) {
        let current = receiptSeqByDate.get(compactDate);
        if (current === undefined) {
          current = 0;
        }
        const next = current + 1;
        receiptSeqByDate.set(compactDate, next);
        return next;
      },
      async saveSale(sale, items) {
        sales.set(sale.sale_id, { sale: sale, items: items });
      },
      async findSaleById(saleId) {
        return sales.get(saleId) || null;
      },
      async getReturnedQuantitiesBySaleId(saleId) {
        const totals = new Map();
        for (let index = 0; index < returns.length; index++) {
          const returnRecord = returns[index];
          if (returnRecord.sale_id !== saleId) {
            continue;
          }
          for (let itemIndex = 0; itemIndex < returnRecord.items.length; itemIndex++) {
            const item = returnRecord.items[itemIndex];
            let prev = totals.get(item.sale_item_id);
            if (prev === undefined) {
              prev = 0;
            }
            totals.set(item.sale_item_id, prev + item.quantity);
          }
        }
        return totals;
      },
      async getRefundedCreditBySaleId(saleId) {
        let sum = 0;
        for (let index = 0; index < returns.length; index++) {
          if (returns[index].sale_id === saleId) {
            sum = sum + returns[index].credit_refund_amount;
          }
        }
        return sum;
      },
      async saveReturn(returnRecord) {
        returns.push(returnRecord);
      }
    },
    customerRepository: {
      async findById(customerId) {
        return customers.get(customerId) || null;
      },
      async save(customer) {
        customers.set(customer.customer_id, customer);
      }
    },
    creditTransactionRepository: {
      async save(creditTx) {
        creditTransactions.push(creditTx);
      }
    }
  };
}

describe("sales domain and use cases", function () {
  it("processes base-unit, option, and ad-hoc tingi sales with exact stock deduction and profit snapshots", async function () {
    const deps = createInMemorySalesDeps();
    const createProduct = createProductUseCase(deps);
    const saveOption = createSaveSellingOptionUseCase(deps);
    const calculateCart = createCalculateCartTotalsUseCase(deps);
    const processSale = createProcessSaleUseCase(deps);

    const candy = await createProduct({
      product_name: "Candy",
      base_unit: "piece",
      current_stock: 100,
      cost_price: 1,
      selling_price: 2
    });
    const promoOption = await saveOption({
      product_id: candy.product_id,
      option_name: "3 for ₱5",
      quantity: 3,
      price: 5
    });

    const oil = await createProduct({
      product_name: "Cooking Oil",
      base_unit: "ml",
      current_stock: 1000,
      cost_price: 0.15,
      selling_price: 0.2,
      allow_custom_amount: true
    });

    const preview = await calculateCart({
      items: [
        { product_id: candy.product_id, option_id: promoOption.option_id, quantity: 2 },
        { product_id: oil.product_id, custom_amount: 7 }
      ],
      discount_amount: 1
    });

    expect(preview.subtotal_amount).toBe(17);
    expect(preview.total_amount).toBe(16);
    expect(preview.stock_warnings.length).toBe(0);

    const result = await processSale({
      items: [
        { product_id: candy.product_id, option_id: promoOption.option_id, quantity: 2 },
        { product_id: oil.product_id, custom_amount: 7 }
      ],
      discount_amount: 1,
      payment_method: PAYMENT_METHODS.CASH,
      amount_paid: 20,
      created_by: "cashier-1"
    });

    expect(result.sale.receipt_number).toBe("20261120-0001");
    expect(result.sale.change_amount).toBe(4);

    // Candy: 100 - (2 * 3) = 94; profit = 10 - (6 * 1) = 4
    expect(deps.products.get(candy.product_id).current_stock).toBe(94);
    expect(calculateItemProfit(result.items[0])).toBe(4);

    // Oil: 1000 - (7 / 0.20 = 35 ml) = 965; profit = 7 - (35 * 0.15) = 1.75
    expect(deps.products.get(oil.product_id).current_stock).toBe(965);
    expect(result.items[1].option_name_snapshot).toBe("Custom Amount (₱7.00)");
    expect(calculateItemProfit(result.items[1])).toBe(1.75);
  });

  it("blocks overselling when multiple lines share the same product", async function () {
    const deps = createInMemorySalesDeps();
    const createProduct = createProductUseCase(deps);
    const processSale = createProcessSaleUseCase(deps);

    const water = await createProduct({
      product_name: "Water",
      base_unit: "piece",
      current_stock: 5,
      cost_price: 10,
      selling_price: 15
    });

    await expect(
      processSale({
        items: [
          { product_id: water.product_id, quantity: 3 },
          { product_id: water.product_id, quantity: 3 }
        ],
        payment_method: PAYMENT_METHODS.CASH,
        amount_paid: 100,
        created_by: "cashier-1"
      })
    ).rejects.toThrow(ValidationError);
  });

  it("fails closed when credit repositories are missing", async function () {
    const deps = createInMemorySalesDeps();
    const createProduct = createProductUseCase(deps);
    const processSale = createProcessSaleUseCase(deps);

    const water = await createProduct({
      product_name: "Water",
      base_unit: "piece",
      current_stock: 5,
      cost_price: 10,
      selling_price: 15
    });

    deps.customerRepository = null;
    deps.creditTransactionRepository = null;

    await expect(
      processSale({
        items: [{ product_id: water.product_id, quantity: 1 }],
        payment_method: PAYMENT_METHODS.CREDIT,
        customer_id: "cust-1",
        created_by: "cashier-1"
      })
    ).rejects.toThrow("Credit sales are not configured");
    expect(deps.sales.size).toBe(0);
  });

  it("enforces credit limit on SPLIT sale and refunds credit first before cash on ProcessReturn", async function () {
    const deps = createInMemorySalesDeps();
    const createProduct = createProductUseCase(deps);
    const processSale = createProcessSaleUseCase(deps);
    const processReturn = createProcessReturnUseCase(deps);

    const rice = await createProduct({
      product_name: "Rice",
      base_unit: "kg",
      current_stock: 50,
      cost_price: 45,
      selling_price: 60
    });

    deps.customers.set("cust-1", {
      customer_id: "cust-1",
      full_name: "Juan Dela Cruz",
      credit_limit: 100,
      current_balance: 20,
      is_active: true
    });

    // Exceeds credit_limit (20 + 90 = 110 > 100)
    await expect(
      processSale({
        items: [{ product_id: rice.product_id, quantity: 2 }],
        payment_method: PAYMENT_METHODS.SPLIT,
        cash_amount: 30,
        credit_amount: 90,
        amount_paid: 30,
        customer_id: "cust-1",
        created_by: "cashier-1"
      })
    ).rejects.toThrow(ValidationError);

    // Valid SPLIT: total ₱120 (₱70 cash + ₱50 credit -> balance becomes ₱70)
    const saleResult = await processSale({
      items: [{ product_id: rice.product_id, quantity: 2 }],
      payment_method: PAYMENT_METHODS.SPLIT,
      cash_amount: 70,
      credit_amount: 50,
      amount_paid: 100,
      customer_id: "cust-1",
      shift_id: "shift-1",
      created_by: "cashier-1"
    });

    expect(saleResult.sale.change_amount).toBe(30);
    expect(deps.customers.get("cust-1").current_balance).toBe(70);

    // Return 1 kg (₱60 refund -> ₱50 reverses credit first, ₱10 cash refund)
    const returnResult = await processReturn({
      sale_id: saleResult.sale.sale_id,
      shift_id: "shift-1",
      items: [{ sale_item_id: saleResult.items[0].sale_item_id, quantity: 1 }],
      remarks: "Customer changed mind",
      created_by: "cashier-1"
    });

    expect(returnResult.return_record.total_refund_amount).toBe(60);
    expect(returnResult.return_record.credit_refund_amount).toBe(50);
    expect(returnResult.return_record.cash_refund_amount).toBe(10);
    expect(deps.customers.get("cust-1").current_balance).toBe(20);
    expect(deps.products.get(rice.product_id).current_stock).toBe(49);

    // Over-return guard (only 1 kg left to return; trying to return 1.5 kg fails)
    await expect(
      processReturn({
        sale_id: saleResult.sale.sale_id,
        items: [{ sale_item_id: saleResult.items[0].sale_item_id, quantity: 1.5 }],
        remarks: "Duplicate",
        created_by: "cashier-1"
      })
    ).rejects.toThrow(ValidationError);
  });
});
