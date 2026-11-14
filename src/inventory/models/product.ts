import { z } from 'zod';
import {
  barcodeSchema,
  idSchema,
  nonEmptyTextSchema,
  nonNegativeMoneySchema,
  nonNegativeQuantitySchema,
  optionalTextSchema,
  positiveQuantitySchema,
  timestampSchema,
} from './primitives';

export const ProductSchema = z.object({
  product_id: idSchema,
  category_id: idSchema,
  product_name: nonEmptyTextSchema,
  barcode: barcodeSchema,
  description: optionalTextSchema,
  base_unit: nonEmptyTextSchema,
  current_stock: nonNegativeQuantitySchema,
  cost_price: nonNegativeMoneySchema,
  selling_price: nonNegativeMoneySchema,
  reorder_level: nonNegativeQuantitySchema,
  allow_custom_amount: z.boolean().default(false),
  is_active: z.boolean().default(true),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type Product = z.infer<typeof ProductSchema>;

export const ProductSellingOptionSchema = z.object({
  option_id: idSchema,
  product_id: idSchema,
  option_name: nonEmptyTextSchema,
  barcode: barcodeSchema,
  quantity: positiveQuantitySchema,
  price: nonNegativeMoneySchema,
  is_active: z.boolean().default(true),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type ProductSellingOption = z.infer<typeof ProductSellingOptionSchema>;

/**
 * Composite schema representing a Product (1:N) ProductSellingOption relationship.
 * Ensures every selling option belongs to the parent product.
 */
export const ProductWithOptionsSchema = ProductSchema.extend({
  selling_options: z.array(ProductSellingOptionSchema).default([]),
}).superRefine((data, ctx) => {
  data.selling_options.forEach((option, index) => {
    if (option.product_id !== data.product_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selling_options', index, 'product_id'],
        message: `Selling option product_id (${option.product_id}) must match parent product_id (${data.product_id})`,
      });
    }
  });
});

export type ProductWithOptions = z.infer<typeof ProductWithOptionsSchema>;
