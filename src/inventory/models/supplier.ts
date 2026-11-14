import { z } from 'zod';
import { idSchema, nonEmptyTextSchema, optionalTextSchema } from './primitives';

export const SupplierSchema = z.object({
  supplier_id: idSchema,
  supplier_name: nonEmptyTextSchema,
  contact_person: optionalTextSchema,
  phone: optionalTextSchema,
  address: optionalTextSchema,
  is_active: z.boolean().default(true),
});

export type Supplier = z.infer<typeof SupplierSchema>;
