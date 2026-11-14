import { z } from 'zod';
import { identifierSchema, nonEmptyTextSchema, optionalTextSchema } from '../../../shared/domain';

export const SupplierSchema = z.object({
  supplier_id: identifierSchema,
  supplier_name: nonEmptyTextSchema,
  contact_person: optionalTextSchema,
  phone: optionalTextSchema,
  address: optionalTextSchema,
  is_active: z.boolean().default(true),
});

export type Supplier = z.infer<typeof SupplierSchema>;
