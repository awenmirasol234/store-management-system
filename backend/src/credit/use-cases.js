import { fromMoneyInt, toMoneyInt } from "../shared/decimal.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import { parsePositiveLimit, requireNonEmptyText } from "../shared/validation.js";
import {
  CREDIT_TRANSACTION_TYPES,
  createCreditTransactionEntity,
  createCustomerEntity
} from "./domain.js";

export function createCreateCustomerUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const fullName = requireNonEmptyText(safeInput.full_name, "full_name");
    const customerId = dependencies.idGenerator.nextId();
    const now = dependencies.clock.nowIso();

    const customer = createCustomerEntity({
      customer_id: customerId,
      full_name: fullName,
      phone: safeInput.phone,
      address: safeInput.address,
      credit_limit: safeInput.credit_limit,
      current_balance: 0,
      is_active: safeInput.is_active,
      created_at: now,
      updated_at: now
    });

    await dependencies.customerRepository.save(customer);
    return customer;
  };
}

export function createUpdateCustomerUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const customerId = requireNonEmptyText(safeInput.customer_id, "customer_id");
    const existing = await dependencies.customerRepository.findById(customerId);
    if (!existing) {
      throw new NotFoundError("Customer not found: " + customerId);
    }

    let fullName = existing.full_name;
    if (safeInput.full_name !== undefined) {
      fullName = requireNonEmptyText(safeInput.full_name, "full_name");
    }

    let phone = existing.phone;
    if (safeInput.phone !== undefined) {
      phone = safeInput.phone;
    }

    let address = existing.address;
    if (safeInput.address !== undefined) {
      address = safeInput.address;
    }

    let creditLimit = existing.credit_limit;
    if (safeInput.credit_limit !== undefined) {
      creditLimit = safeInput.credit_limit;
    }

    let isActive = existing.is_active;
    if (safeInput.is_active !== undefined) {
      isActive = safeInput.is_active;
    }

    const now = dependencies.clock.nowIso();
    const updated = createCustomerEntity({
      customer_id: existing.customer_id,
      full_name: fullName,
      phone: phone,
      address: address,
      credit_limit: creditLimit,
      current_balance: existing.current_balance,
      is_active: isActive,
      created_at: existing.created_at,
      updated_at: now
    });

    await dependencies.customerRepository.save(updated);
    return updated;
  };
}

export function createGetCustomerUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const customerId = requireNonEmptyText(safeInput.customer_id, "customer_id");
    const customer = await dependencies.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError("Customer not found: " + customerId);
    }
    return customer;
  };
}

export function createListCustomersUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    if (safeInput.query && safeInput.query.trim().length > 0) {
      return dependencies.customerRepository.search(safeInput.query.trim());
    }
    return dependencies.customerRepository.listAll();
  };
}

export function createRecordPaymentUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    return dependencies.unitOfWork.run(async function runRecordPayment() {
      const customerId = requireNonEmptyText(safeInput.customer_id, "customer_id");
      const createdBy = requireNonEmptyText(safeInput.created_by, "created_by");

      const customer = await dependencies.customerRepository.findById(customerId);
      if (!customer) {
        throw new NotFoundError("Customer not found: " + customerId);
      }
      if (!customer.is_active) {
        throw new ValidationError("Cannot record payment for inactive customer");
      }

      const balanceInt = toMoneyInt(customer.current_balance, "current_balance");
      if (balanceInt <= 0) {
        throw new ValidationError("Customer has no outstanding balance to pay");
      }

      const paymentInt = toMoneyInt(safeInput.amount, "amount");
      if (paymentInt <= 0) {
        throw new ValidationError("Payment amount must be greater than zero");
      }
      if (paymentInt > balanceInt) {
        throw new ValidationError("Payment amount exceeds outstanding balance");
      }

      const nextBalanceInt = balanceInt - paymentInt;
      const now = dependencies.clock.nowIso();

      const updatedCustomer = Object.assign({}, customer, {
        current_balance: fromMoneyInt(nextBalanceInt),
        updated_at: now
      });

      const txId = dependencies.idGenerator.nextId();
      const transaction = createCreditTransactionEntity({
        credit_tx_id: txId,
        customer_id: customerId,
        sale_id: null,
        shift_id: safeInput.shift_id,
        type: CREDIT_TRANSACTION_TYPES.PAYMENT,
        amount: safeInput.amount,
        remarks: safeInput.remarks,
        created_by: createdBy,
        created_at: now
      });

      await dependencies.customerRepository.save(updatedCustomer);
      await dependencies.creditTransactionRepository.save(transaction);

      return {
        customer: updatedCustomer,
        credit_transaction: transaction
      };
    });
  };
}

export function createListCreditTransactionsUseCase(dependencies) {
  return async function execute(input) {
    const safeInput = input || {};
    const customerId = requireNonEmptyText(safeInput.customer_id, "customer_id");
    const limit = parsePositiveLimit(safeInput.limit, 50, "limit");
    return dependencies.creditTransactionRepository.listByCustomerId(customerId, limit);
  };
}
