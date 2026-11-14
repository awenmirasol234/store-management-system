import { z } from 'zod';
import { idSchema, nonEmptyTextSchema, optionalTextSchema } from './primitives';

export const ProductCategorySchema = z.object({
  category_id: idSchema,
  category_name: nonEmptyTextSchema,
  description: optionalTextSchema,
  is_active: z.boolean().default(true),
});

export type ProductCategory = z.infer<typeof ProductCategorySchema>;
