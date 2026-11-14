import { z } from 'zod';
import {
  decimalQuantitySchema,
  identifierSchema,
  nonNegativeMoneySchema,
  optionalTextSchema,
  timestampSchema,
} from '../../../shared/domain';

export const InventoryTransactionTypeSchema = z.enum([
  'STOCK_IN',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'DAMAGED',
  'EXPIRED',
]);

export type InventoryTransactionType = z.infer<typeof InventoryTransactionTypeSchema>;

const ADDITION_TYPES: ReadonlySet<InventoryTransactionType> = new Set(['STOCK_IN', 'RETURN']);
const DEDUCTION_TYPES: ReadonlySet<InventoryTransactionType> = new Set([
  'SALE',
  'DAMAGED',
  'EXPIRED',
]);

export const InventoryTransactionSchema = z
  .object({
    transaction_id: identifierSchema,
    product_id: identifierSchema,
    supplier_id: identifierSchema.nullable().optional(),
    option_id: identifierSchema.nullable().optional(),
    transaction_type: InventoryTransactionTypeSchema,
    quantity: decimalQuantitySchema.refine((value) => value !== 0, {
      message: 'Inventory transaction quantity cannot be zero',
    }),
    unit_cost: nonNegativeMoneySchema,
    reference_number: optionalTextSchema,
    remarks: optionalTextSchema,
    created_by: identifierSchema,
    created_at: timestampSchema,
  })
  .superRefine((transaction, context) => {
    if (ADDITION_TYPES.has(transaction.transaction_type) && transaction.quantity <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: `${transaction.transaction_type} transactions must have a positive quantity`,
      });
    }

    if (DEDUCTION_TYPES.has(transaction.transaction_type) && transaction.quantity >= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: `${transaction.transaction_type} transactions must have a negative quantity`,
      });
    }
  });

export type InventoryTransaction = z.infer<typeof InventoryTransactionSchema>;
