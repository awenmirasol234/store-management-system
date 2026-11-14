import { z } from 'zod';
import {
  idSchema,
  nonEmptyTextSchema,
  nonNegativeMoneySchema,
  positiveQuantitySchema,
  timestampSchema,
} from './primitives';

export const SalesItemSchema = z.object({
  sale_item_id: idSchema,
  sale_id: idSchema,
  product_id: idSchema,
  option_id: idSchema.nullable(),
  option_name_snapshot: nonEmptyTextSchema,
  quantity: positiveQuantitySchema,
  base_quantity: positiveQuantitySchema,
  unit_price: nonNegativeMoneySchema,
  unit_cost: nonNegativeMoneySchema,
  subtotal: nonNegativeMoneySchema,
});

export type SalesItem = z.infer<typeof SalesItemSchema>;

export const SalesTransactionBaseSchema = z.object({
  sale_id: idSchema,
  receipt_number: nonEmptyTextSchema,
  total_amount: nonNegativeMoneySchema,
  amount_paid: nonNegativeMoneySchema,
  change_amount: nonNegativeMoneySchema,
  created_by: idSchema,
  created_at: timestampSchema,
});

export const SalesTransactionSchema = SalesTransactionBaseSchema.superRefine((data, ctx) => {
  if (data.amount_paid < data.total_amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount_paid'],
      message: 'amount_paid cannot be less than total_amount',
    });
  }
});

export type SalesTransaction = z.infer<typeof SalesTransactionSchema>;

/**
 * Composite schema representing a SalesTransaction (1:N) SalesItem relationship.
 * Ensures every line item references the parent sale_id.
 */
export const SalesTransactionWithItemsSchema = SalesTransactionBaseSchema.extend({
  items: z.array(SalesItemSchema).min(1, 'A sales transaction must contain at least one item'),
}).superRefine((data, ctx) => {
  if (data.amount_paid < data.total_amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount_paid'],
      message: 'amount_paid cannot be less than total_amount',
    });
  }

  data.items.forEach((item, index) => {
    if (item.sale_id !== data.sale_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items', index, 'sale_id'],
        message: `Sales item sale_id (${item.sale_id}) must match parent sale_id (${data.sale_id})`,
      });
    }
  });
});

export type SalesTransactionWithItems = z.infer<typeof SalesTransactionWithItemsSchema>;
