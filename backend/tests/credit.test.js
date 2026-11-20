import { describe, expect, it } from "vitest";
import { openSqliteDatabase, createSqliteUnitOfWork } from "../src/db/sqlite.js";
import { createDefaultIdGenerator, createSystemClock } from "../src/shared/ports.js";
import { ValidationError, NotFoundError } from "../src/shared/errors.js";
import {
  CREDIT_TRANSACTION_TYPES,
  createCustomerEntity,
  createCreditTransactionEntity
} from "../src/credit/domain.js";
import {
  createCreateCustomerUseCase,
  createUpdateCustomerUseCase,
  createGetCustomerUseCase,
  createListCustomersUseCase,
  createRecordPaymentUseCase,
  createListCreditTransactionsUseCase
} from "../src/credit/use-cases.js";
import {
  createSqliteCustomerRepository,
  createSqliteCreditTransactionRepository
} from "../src/credit/sqlite-repo.js";
import {
  createSqliteProductRepository,
  createSqliteSellingOptionRepository,
  createSqliteInventoryTransactionRepository
} from "../src/inventory/sqlite-repo.js";
import { createSqliteSalesRepository } from "../src/sales/sqlite-repo.js";
import { createProcessSaleUseCase, createProcessReturnUseCase } from "../src/sales/use-cases.js";

function setupCreditTestEnv() {
  const database = openSqliteDatabase(":memory:");
  const unitOfWork = createSqliteUnitOfWork(database);
  const idGenerator = createDefaultIdGenerator();
  const clock = createSystemClock();

  const customerRepository = createSqliteCustomerRepository(database);
  const creditTransactionRepository = createSqliteCreditTransactionRepository(database);
  const productRepository = createSqliteProductRepository(database);
  const sellingOptionRepository = createSqliteSellingOptionRepository(database);
  const inventoryTransactionRepository = createSqliteInventoryTransactionRepository(database);
  const salesRepository = createSqliteSalesRepository(database);

  const sharedDeps = {
    idGenerator: idGenerator,
    clock: clock,
    unitOfWork: unitOfWork,
    customerRepository: customerRepository,
    creditTransactionRepository: creditTransactionRepository,
    productRepository: productRepository,
    sellingOptionRepository: sellingOptionRepository,
    inventoryTransactionRepository: inventoryTransactionRepository,
    salesRepository: salesRepository
  };

  const useCases = {
    createCustomer: createCreateCustomerUseCase(sharedDeps),
    updateCustomer: createUpdateCustomerUseCase(sharedDeps),
    getCustomer: createGetCustomerUseCase(sharedDeps),
    listCustomers: createListCustomersUseCase(sharedDeps),
    recordPayment: createRecordPaymentUseCase(sharedDeps),
    listCreditTransactions: createListCreditTransactionsUseCase(sharedDeps),
    processSale: createProcessSaleUseCase(sharedDeps),
    processReturn: createProcessReturnUseCase(sharedDeps)
  };

  return {
    database: database,
    useCases: useCases,
    repositories: sharedDeps
  };
}

describe("Credit Domain Entities", function () {
  it("creates customer entity with defaults and validates input", function () {
    const customer = createCustomerEntity({
      customer_id: "cust-1",
      full_name: "Juan Dela Cruz",
      phone: "09171234567",
      address: "Brgy. San Jose",
      credit_limit: 1000,
      current_balance: 0,
      is_active: true,
      created_at: "2026-11-20T10:00:00.000Z",
      updated_at: "2026-11-20T10:00:00.000Z"
    });

    expect(customer.customer_id).toBe("cust-1");
    expect(customer.full_name).toBe("Juan Dela Cruz");
    expect(customer.credit_limit).toBe(1000);
    expect(customer.current_balance).toBe(0);
    expect(customer.is_active).toBe(true);

    expect(function () {
      createCustomerEntity({
        customer_id: "c1",
        full_name: "",
        created_at: "now",
        updated_at: "now"
      });
    }).toThrow(ValidationError);

    expect(function () {
      createCustomerEntity({
        customer_id: "c1",
        full_name: "Maria",
        credit_limit: -50,
        created_at: "now",
        updated_at: "now"
      });
    }).toThrow(ValidationError);
  });

  it("creates credit transaction entity and rejects invalid types or negative amounts", function () {
    const tx = createCreditTransactionEntity({
      credit_tx_id: "tx-1",
      customer_id: "cust-1",
      type: CREDIT_TRANSACTION_TYPES.CHARGE,
      amount: 250.5,
      remarks: "Rice credit",
      created_by: "owner",
      created_at: "2026-11-20T10:00:00.000Z"
    });

    expect(tx.type).toBe("CHARGE");
    expect(tx.amount).toBe(250.5);

    expect(function () {
      createCreditTransactionEntity({
        credit_tx_id: "t1",
        customer_id: "c1",
        type: "UNKNOWN_TYPE",
        amount: 10,
        created_by: "owner",
        created_at: "now"
      });
    }).toThrow(ValidationError);

    expect(function () {
      createCreditTransactionEntity({
        credit_tx_id: "t1",
        customer_id: "c1",
        type: CREDIT_TRANSACTION_TYPES.PAYMENT,
        amount: -10,
        created_by: "owner",
        created_at: "now"
      });
    }).toThrow(ValidationError);
  });
});

describe("Credit Customer Use Cases & Repositories", function () {
  it("creates, retrieves, searches, and updates customer accounts", async function () {
    const env = setupCreditTestEnv();

    const created = await env.useCases.createCustomer({
      full_name: "Aling Nena",
      phone: "09181112233",
      address: "Purok 2",
      credit_limit: 500
    });

    expect(created.customer_id).toBeDefined();
    expect(created.full_name).toBe("Aling Nena");
    expect(created.current_balance).toBe(0);
    expect(created.credit_limit).toBe(500);

    const fetched = await env.useCases.getCustomer({
      customer_id: created.customer_id
    });
    expect(fetched.full_name).toBe("Aling Nena");

    const searchResults = await env.useCases.listCustomers({ query: "nena" });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].customer_id).toBe(created.customer_id);

    const updated = await env.useCases.updateCustomer({
      customer_id: created.customer_id,
      credit_limit: 1500,
      phone: "09998887766"
    });
    expect(updated.credit_limit).toBe(1500);
    expect(updated.phone).toBe("09998887766");
  });

  it("records customer payments, reduces balance, and logs payment transaction", async function () {
    const env = setupCreditTestEnv();

    const customer = await env.useCases.createCustomer({
      full_name: "Mang Tomas",
      credit_limit: 1000
    });

    // Manually set initial balance to simulate existing utang
    const customerWithDebt = Object.assign({}, customer, { current_balance: 350 });
    await env.repositories.customerRepository.save(customerWithDebt);

    // Record partial payment
    const paymentResult = await env.useCases.recordPayment({
      customer_id: customer.customer_id,
      amount: 150,
      remarks: "Partial payment",
      created_by: "owner"
    });

    expect(paymentResult.customer.current_balance).toBe(200);
    expect(paymentResult.credit_transaction.amount).toBe(150);
    expect(paymentResult.credit_transaction.type).toBe("PAYMENT");

    // Check transaction history
    const history = await env.useCases.listCreditTransactions({
      customer_id: customer.customer_id
    });
    expect(history.length).toBe(1);
    expect(history[0].amount).toBe(150);
    expect(history[0].type).toBe("PAYMENT");

    // Pay remaining balance
    const finalPayment = await env.useCases.recordPayment({
      customer_id: customer.customer_id,
      amount: 200,
      created_by: "owner"
    });
    expect(finalPayment.customer.current_balance).toBe(0);

    // Reject payment when balance is zero
    await expect(function () {
      return env.useCases.recordPayment({
        customer_id: customer.customer_id,
        amount: 50,
        created_by: "owner"
      });
    }).rejects.toThrow(ValidationError);
  });
});

describe("POS Credit Sale & Return Integration", function () {
  it("processes CREDIT sale, updates customer balance, creates CHARGE transaction, and enforces credit_limit", async function () {
    const env = setupCreditTestEnv();

    // Create a product with stock
    const product = {
      product_id: "prod-1",
      category_id: null,
      product_name: "Coke 1.5L",
      barcode: "480001",
      description: null,
      image_url: null,
      base_unit: "bottle",
      current_stock: 20,
      cost_price: 50,
      selling_price: 65,
      reorder_level: 5,
      allow_custom_amount: false,
      is_active: true,
      deleted_at: null,
      created_at: "2026-11-20T10:00:00.000Z",
      updated_at: "2026-11-20T10:00:00.000Z"
    };
    await env.repositories.productRepository.save(product);

    // Create a customer with 100 limit
    const customer = await env.useCases.createCustomer({
      full_name: "Tessie",
      credit_limit: 100
    });

    // Attempt sale of 2 bottles = 130 (exceeds 100 credit limit)
    await expect(function () {
      return env.useCases.processSale({
        items: [{ product_id: product.product_id, quantity: 2 }],
        payment_method: "CREDIT",
        customer_id: customer.customer_id,
        created_by: "owner"
      });
    }).rejects.toThrow(ValidationError);

    // Sale of 1 bottle = 65 (within 100 limit)
    const saleResult = await env.useCases.processSale({
      items: [{ product_id: product.product_id, quantity: 1 }],
      payment_method: "CREDIT",
      customer_id: customer.customer_id,
      created_by: "owner"
    });

    expect(saleResult.sale.payment_method).toBe("CREDIT");
    expect(saleResult.sale.credit_amount).toBe(65);
    expect(saleResult.credit_transaction).toBeDefined();
    expect(saleResult.credit_transaction.amount).toBe(65);
    expect(saleResult.credit_transaction.type).toBe("CHARGE");

    // Check customer balance increased
    const updatedCustomer = await env.useCases.getCustomer({
      customer_id: customer.customer_id
    });
    expect(updatedCustomer.current_balance).toBe(65);

    // Process return on the credit sale -> refunds credit balance
    const returnResult = await env.useCases.processReturn({
      sale_id: saleResult.sale.sale_id,
      items: [
        {
          sale_item_id: saleResult.items[0].sale_item_id,
          quantity: 1
        }
      ],
      remarks: "Wrong item",
      created_by: "owner"
    });

    expect(returnResult.return_record.credit_refund_amount).toBe(65);
    expect(returnResult.return_record.cash_refund_amount).toBe(0);

    // Balance should be restored back to 0
    const customerAfterReturn = await env.useCases.getCustomer({
      customer_id: customer.customer_id
    });
    expect(customerAfterReturn.current_balance).toBe(0);
  });
});
