import { z } from 'zod';
import { identifierSchema, nonEmptyTextSchema, optionalTextSchema } from '../../../shared/domain';

export const ProductCategorySchema = z.object({
  category_id: identifierSchema,
  category_name: nonEmptyTextSchema,
  description: optionalTextSchema,
  is_active: z.boolean().default(true),
});

export type ProductCategory = z.infer<typeof ProductCategorySchema>;
