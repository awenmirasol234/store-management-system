import { z } from 'zod';

/**
 * Checks whether a finite number fits within DECIMAL(precision, scale)
 * without exceeding the allowed fractional digits or integer range.
 */
function hasMaxScale(value: number, precision: number, scale: number): boolean {
  if (!Number.isFinite(value)) return false;
  const maxAbs = 10 ** (precision - scale);
  if (Math.abs(value) >= maxAbs) return false;
  return Number(value.toFixed(scale)) === value;
}

export const identifierSchema = z.string().trim().min(1, 'Identifier must not be empty');

export const nonEmptyTextSchema = z.string().trim().min(1, 'Value must not be empty');

export const optionalTextSchema = z.string().trim().nullable().optional();

export const barcodeSchema = z
  .string()
  .trim()
  .min(1, 'Barcode cannot be blank when provided')
  .nullable()
  .optional();

/**
 * DECIMAL(12, 2) for monetary values (prices, costs, subtotals, payments).
 */
export const decimalMoneySchema = z
  .number()
  .refine((value) => hasMaxScale(value, 12, 2), {
    message: 'Monetary value must be a finite DECIMAL(12, 2) with at most 2 decimal places',
  });

export const nonNegativeMoneySchema = decimalMoneySchema.refine((value) => value >= 0, {
  message: 'Monetary value cannot be negative',
});

/**
 * DECIMAL(12, 4) for inventory and selling-option quantities (supports fractional weights/volumes).
 */
export const decimalQuantitySchema = z
  .number()
  .refine((value) => hasMaxScale(value, 12, 4), {
    message: 'Quantity must be a finite DECIMAL(12, 4) with at most 4 decimal places',
  });

export const nonNegativeQuantitySchema = decimalQuantitySchema.refine((value) => value >= 0, {
  message: 'Quantity cannot be negative',
});

export const positiveQuantitySchema = decimalQuantitySchema.refine((value) => value > 0, {
  message: 'Quantity must be greater than zero',
});

export const timestampSchema = z.union([
  z.date(),
  z.string().datetime({ message: 'Must be a valid ISO-8601 datetime string' }),
]);
