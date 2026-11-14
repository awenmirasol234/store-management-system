import { z } from 'zod';
import {
  identifierSchema,
  nonEmptyTextSchema,
  nonNegativeMoneySchema,
  positiveQuantitySchema,
  timestampSchema,
} from '../../../shared/domain';

export const SalesItemSchema = z.object({
  sale_item_id: identifierSchema,
  sale_id: identifierSchema,
  product_id: identifierSchema,
  option_id: identifierSchema.nullable(),
  option_name_snapshot: nonEmptyTextSchema,
  quantity: positiveQuantitySchema,
  base_quantity: positiveQuantitySchema,
  unit_price: nonNegativeMoneySchema,
  unit_cost: nonNegativeMoneySchema,
  subtotal: nonNegativeMoneySchema,
});

export type SalesItem = z.infer<typeof SalesItemSchema>;

export const SalesTransactionBaseSchema = z.object({
  sale_id: identifierSchema,
  receipt_number: nonEmptyTextSchema,
  total_amount: nonNegativeMoneySchema,
  amount_paid: nonNegativeMoneySchema,
  change_amount: nonNegativeMoneySchema,
  created_by: identifierSchema,
  created_at: timestampSchema,
});

export const SalesTransactionSchema = SalesTransactionBaseSchema.superRefine(
  (transaction, context) => {
    if (transaction.amount_paid < transaction.total_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount_paid'],
        message: 'amount_paid cannot be less than total_amount',
      });
    }
  },
);

export type SalesTransaction = z.infer<typeof SalesTransactionSchema>;

/**
 * Composite schema representing a SalesTransaction (1:N) SalesItem relationship.
 * Ensures every line item references the parent sale_id.
 */
export const SalesTransactionWithItemsSchema = SalesTransactionBaseSchema.extend({
  items: z.array(SalesItemSchema).min(1, 'A sales transaction must contain at least one item'),
}).superRefine((transaction, context) => {
  if (transaction.amount_paid < transaction.total_amount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount_paid'],
      message: 'amount_paid cannot be less than total_amount',
    });
  }

  transaction.items.forEach((item, index) => {
    if (item.sale_id !== transaction.sale_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items', index, 'sale_id'],
        message: `Sales item sale_id (${item.sale_id}) must match parent sale_id (${transaction.sale_id})`,
      });
    }
  });
});

export type SalesTransactionWithItems = z.infer<typeof SalesTransactionWithItemsSchema>;
