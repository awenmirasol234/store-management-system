import { z } from 'zod';
import {
  decimalQuantitySchema,
  idSchema,
  nonNegativeMoneySchema,
  optionalTextSchema,
  timestampSchema,
} from './primitives';

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
    transaction_id: idSchema,
    product_id: idSchema,
    supplier_id: idSchema.nullable().optional(),
    option_id: idSchema.nullable().optional(),
    transaction_type: InventoryTransactionTypeSchema,
    quantity: decimalQuantitySchema.refine((val) => val !== 0, {
      message: 'Inventory transaction quantity cannot be zero',
    }),
    unit_cost: nonNegativeMoneySchema,
    reference_number: optionalTextSchema,
    remarks: optionalTextSchema,
    created_by: idSchema,
    created_at: timestampSchema,
  })
  .superRefine((data, ctx) => {
    if (ADDITION_TYPES.has(data.transaction_type) && data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: `${data.transaction_type} transactions must have a positive quantity`,
      });
    }

    if (DEDUCTION_TYPES.has(data.transaction_type) && data.quantity >= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: `${data.transaction_type} transactions must have a negative quantity`,
      });
    }
  });

export type InventoryTransaction = z.infer<typeof InventoryTransactionSchema>;
