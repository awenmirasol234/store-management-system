import { describe, expect, it } from 'vitest';
import {
  InventoryTransactionSchema,
  ProductCategorySchema,
  ProductSchema,
  ProductSellingOptionSchema,
  ProductWithOptionsSchema,
  SalesItemSchema,
  SalesTransactionSchema,
  SalesTransactionWithItemsSchema,
  SupplierSchema,
} from '../../../src/inventory/domain';

const CURRENT_TIMESTAMP = '2026-11-14T12:00:00.000Z';

function buildProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    product_id: 'prod-1',
    category_id: 'cat-1',
    product_name: 'Bottled Water',
    barcode: '4800016644801',
    description: '500ml purified drinking water',
    base_unit: 'piece',
    current_stock: 100,
    cost_price: 10.5,
    selling_price: 15,
    reorder_level: 20,
    allow_custom_amount: false,
    is_active: true,
    created_at: CURRENT_TIMESTAMP,
    updated_at: CURRENT_TIMESTAMP,
    ...overrides,
  };
}

function buildSellingOption(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    option_id: 'opt-1',
    product_id: 'prod-1',
    option_name: '1 Piece',
    barcode: null,
    quantity: 1,
    price: 15,
    is_active: true,
    created_at: CURRENT_TIMESTAMP,
    updated_at: CURRENT_TIMESTAMP,
    ...overrides,
  };
}

describe('Inventory & Selling Models - Validation & Precision Rules', () => {
  it('validates ProductCategory and Supplier models', () => {
    const category = ProductCategorySchema.parse({
      category_id: 'cat-1',
      category_name: 'Beverages',
      description: 'Bottled and canned drinks',
      is_active: true,
    });
    expect(category.category_name).toBe('Beverages');

    const supplier = SupplierSchema.parse({
      supplier_id: 'sup-1',
      supplier_name: 'Metro Wholesale',
      contact_person: 'Juan Dela Cruz',
      phone: '09171234567',
      address: 'Manila',
      is_active: true,
    });
    expect(supplier.supplier_name).toBe('Metro Wholesale');
  });

  it('enforces DECIMAL(12, 2) precision on monetary fields', () => {
    expect(() =>
      ProductSchema.parse(buildProduct({ selling_price: 15.999 })),
    ).toThrow(/DECIMAL\(12, 2\)/);

    expect(() =>
      ProductSchema.parse(buildProduct({ cost_price: -1 })),
    ).toThrow(/cannot be negative/);

    const validProduct = ProductSchema.parse(
      buildProduct({ cost_price: 10.25, selling_price: 15.5 }),
    );
    expect(validProduct.cost_price).toBe(10.25);
    expect(validProduct.selling_price).toBe(15.5);
  });

  it('enforces DECIMAL(12, 4) precision and non-negative stock on quantities', () => {
    expect(() =>
      ProductSchema.parse(buildProduct({ current_stock: -0.5 })),
    ).toThrow(/cannot be negative/);

    expect(() =>
      ProductSchema.parse(buildProduct({ current_stock: 1.12345 })),
    ).toThrow(/DECIMAL\(12, 4\)/);

    const fractionalProduct = ProductSchema.parse(
      buildProduct({ base_unit: 'kg', current_stock: 12.3456, reorder_level: 2.5 }),
    );
    expect(fractionalProduct.current_stock).toBe(12.3456);
  });

  it('requires selling option quantity to be strictly positive', () => {
    expect(() =>
      ProductSellingOptionSchema.parse(buildSellingOption({ quantity: 0 })),
    ).toThrow(/greater than zero/);

    expect(() =>
      ProductSellingOptionSchema.parse(buildSellingOption({ quantity: -1 })),
    ).toThrow(/greater than zero/);
  });

  it('rejects blank barcodes when provided, while allowing null or undefined', () => {
    expect(ProductSchema.parse(buildProduct({ barcode: null })).barcode).toBeNull();
    expect(ProductSchema.parse(buildProduct({ barcode: undefined })).barcode).toBeUndefined();
    expect(() => ProductSchema.parse(buildProduct({ barcode: '   ' }))).toThrow();
  });

  it('enforces InventoryTransaction sign rules per transaction type', () => {
    const baseTransaction = {
      transaction_id: 'tx-1',
      product_id: 'prod-1',
      supplier_id: 'sup-1',
      option_id: null,
      unit_cost: 10,
      reference_number: 'PO-001',
      remarks: 'Restock',
      created_by: 'user-1',
      created_at: CURRENT_TIMESTAMP,
    };

    expect(
      InventoryTransactionSchema.parse({
        ...baseTransaction,
        transaction_type: 'STOCK_IN',
        quantity: 50,
      }).quantity,
    ).toBe(50);

    expect(() =>
      InventoryTransactionSchema.parse({
        ...baseTransaction,
        transaction_type: 'STOCK_IN',
        quantity: -5,
      }),
    ).toThrow(/positive quantity/);

    expect(() =>
      InventoryTransactionSchema.parse({
        ...baseTransaction,
        transaction_type: 'SALE',
        quantity: 2,
      }),
    ).toThrow(/negative quantity/);

    expect(
      InventoryTransactionSchema.parse({
        ...baseTransaction,
        transaction_type: 'SALE',
        quantity: -0.25,
      }).quantity,
    ).toBe(-0.25);

    expect(
      InventoryTransactionSchema.parse({
        ...baseTransaction,
        transaction_type: 'ADJUSTMENT',
        quantity: -1.5,
      }).quantity,
    ).toBe(-1.5);

    expect(() =>
      InventoryTransactionSchema.parse({
        ...baseTransaction,
        transaction_type: 'ADJUSTMENT',
        quantity: 0,
      }),
    ).toThrow(/cannot be zero/);
  });

  it('enforces relationship integrity on ProductWithOptions and SalesTransactionWithItems', () => {
    expect(() =>
      ProductWithOptionsSchema.parse({
        ...buildProduct({ product_id: 'prod-1' }),
        selling_options: [buildSellingOption({ product_id: 'prod-999' })],
      }),
    ).toThrow(/must match parent product_id/);

    expect(() =>
      SalesTransactionSchema.parse({
        sale_id: 'sale-1',
        receipt_number: 'OR-0001',
        total_amount: 100,
        amount_paid: 90,
        change_amount: 0,
        created_by: 'cashier-1',
        created_at: CURRENT_TIMESTAMP,
      }),
    ).toThrow(/cannot be less than total_amount/);

    expect(() =>
      SalesTransactionWithItemsSchema.parse({
        sale_id: 'sale-1',
        receipt_number: 'OR-0001',
        total_amount: 15,
        amount_paid: 20,
        change_amount: 5,
        created_by: 'cashier-1',
        created_at: CURRENT_TIMESTAMP,
        items: [
          {
            sale_item_id: 'item-1',
            sale_id: 'sale-OTHER',
            product_id: 'prod-1',
            option_id: null,
            option_name_snapshot: 'piece',
            quantity: 1,
            base_quantity: 1,
            unit_price: 15,
            unit_cost: 10.5,
            subtotal: 15,
          },
        ],
      }),
    ).toThrow(/must match parent sale_id/);
  });
});

describe('Inventory & Selling Models - Spec Scenarios (Section 4)', () => {
  it('Scenario 1: Regular product without custom selling options (nullable option_id)', () => {
    const product = ProductWithOptionsSchema.parse({
      ...buildProduct({
        product_id: 'prod-water',
        product_name: 'Bottled Water',
        base_unit: 'piece',
        current_stock: 100,
        selling_price: 15,
      }),
      selling_options: [],
    });

    const sale = SalesTransactionWithItemsSchema.parse({
      sale_id: 'sale-water-1',
      receipt_number: 'OR-1001',
      total_amount: 15,
      amount_paid: 20,
      change_amount: 5,
      created_by: 'cashier-1',
      created_at: CURRENT_TIMESTAMP,
      items: [
        {
          sale_item_id: 'si-1',
          sale_id: 'sale-water-1',
          product_id: product.product_id,
          option_id: null,
          option_name_snapshot: 'piece',
          quantity: 1,
          base_quantity: 1,
          unit_price: 15,
          unit_cost: 10.5,
          subtotal: 15,
        },
      ],
    });

    expect(product.selling_options).toHaveLength(0);
    expect(sale.items[0].option_id).toBeNull();
  });

  it('Scenario 2: Quantity-based / bundle pricing (Candy: 1 pc, 3 for ₱5, 10 for ₱15)', () => {
    const candy = ProductWithOptionsSchema.parse({
      ...buildProduct({
        product_id: 'prod-candy',
        product_name: 'Candy',
        base_unit: 'piece',
        current_stock: 100,
        cost_price: 1,
        selling_price: 2,
      }),
      selling_options: [
        buildSellingOption({ option_id: 'c-1', product_id: 'prod-candy', option_name: '1 Piece', quantity: 1, price: 2 }),
        buildSellingOption({ option_id: 'c-3', product_id: 'prod-candy', option_name: '3 for ₱5', quantity: 3, price: 5 }),
        buildSellingOption({ option_id: 'c-10', product_id: 'prod-candy', option_name: '10 for ₱15', quantity: 10, price: 15 }),
      ],
    });

    const item = SalesItemSchema.parse({
      sale_item_id: 'si-candy',
      sale_id: 'sale-2',
      product_id: candy.product_id,
      option_id: 'c-3',
      option_name_snapshot: '3 for ₱5',
      quantity: 2,
      base_quantity: 6,
      unit_price: 5,
      unit_cost: 1,
      subtotal: 10,
    });

    expect(candy.selling_options).toHaveLength(3);
    expect(item.base_quantity).toBe(6);
  });

  it('Scenario 3: Amount-based ("tingi") selling with presets and custom amount support (Cooking Oil in ml)', () => {
    const cookingOil = ProductWithOptionsSchema.parse({
      ...buildProduct({
        product_id: 'prod-oil',
        product_name: 'Cooking Oil',
        base_unit: 'ml',
        current_stock: 10000,
        cost_price: 0.15,
        selling_price: 0.2,
        allow_custom_amount: true,
      }),
      selling_options: [
        buildSellingOption({ option_id: 'oil-5', product_id: 'prod-oil', option_name: '₱5 Worth', quantity: 25, price: 5 }),
        buildSellingOption({ option_id: 'oil-10', product_id: 'prod-oil', option_name: '₱10 Worth', quantity: 50, price: 10 }),
        buildSellingOption({ option_id: 'oil-20', product_id: 'prod-oil', option_name: '₱20 Worth', quantity: 100, price: 20 }),
      ],
    });

    expect(cookingOil.allow_custom_amount).toBe(true);
    expect(cookingOil.selling_options.map((option) => option.quantity)).toEqual([25, 50, 100]);
  });

  it('Scenario 4: Flexible pricing for the same base quantity (Tomato)', () => {
    const tomato = ProductWithOptionsSchema.parse({
      ...buildProduct({
        product_id: 'prod-tomato',
        product_name: 'Tomato',
        base_unit: 'piece',
        current_stock: 50,
        cost_price: 3,
        selling_price: 5,
      }),
      selling_options: [
        buildSellingOption({ option_id: 'tom-1', product_id: 'prod-tomato', option_name: 'Price Option 1', quantity: 1, price: 5 }),
        buildSellingOption({ option_id: 'tom-2', product_id: 'prod-tomato', option_name: 'Price Option 2', quantity: 1, price: 8 }),
        buildSellingOption({ option_id: 'tom-3', product_id: 'prod-tomato', option_name: 'Price Option 3', quantity: 1, price: 12 }),
      ],
    });

    expect(tomato.selling_options.map((option) => option.price)).toEqual([5, 8, 12]);
  });

  it('Scenario 5 & 8: Weight-based & fractional quantity selling (Rice & Onion in kg)', () => {
    const rice = ProductWithOptionsSchema.parse({
      ...buildProduct({
        product_id: 'prod-rice',
        product_name: 'Rice',
        base_unit: 'kg',
        current_stock: 50,
        cost_price: 48,
        selling_price: 60,
      }),
      selling_options: [
        buildSellingOption({ option_id: 'r-250', product_id: 'prod-rice', option_name: '250 grams', quantity: 0.25, price: 15 }),
        buildSellingOption({ option_id: 'r-500', product_id: 'prod-rice', option_name: '500 grams', quantity: 0.5, price: 30 }),
        buildSellingOption({ option_id: 'r-1k', product_id: 'prod-rice', option_name: '1 kilogram', quantity: 1, price: 60 }),
      ],
    });

    const onion = ProductWithOptionsSchema.parse({
      ...buildProduct({
        product_id: 'prod-onion',
        product_name: 'Onion',
        base_unit: 'kg',
        current_stock: 20,
        cost_price: 90,
        selling_price: 120,
      }),
      selling_options: [
        buildSellingOption({ option_id: 'on-100', product_id: 'prod-onion', option_name: '100 grams', quantity: 0.1, price: 12 }),
        buildSellingOption({ option_id: 'on-250', product_id: 'prod-onion', option_name: '250 grams', quantity: 0.25, price: 30 }),
        buildSellingOption({ option_id: 'on-500', product_id: 'prod-onion', option_name: '500 grams', quantity: 0.5, price: 60 }),
      ],
    });

    expect(rice.selling_options[0].quantity).toBe(0.25);
    expect(onion.selling_options[0].quantity).toBe(0.1);
  });

  it('Scenario 6: Multiple selling units with option-level barcodes and bulk STOCK_IN reference', () => {
    const noodles = ProductWithOptionsSchema.parse({
      ...buildProduct({
        product_id: 'prod-noodles',
        product_name: 'Instant Noodles',
        barcode: '4800011111111',
        base_unit: 'piece',
        current_stock: 100,
        cost_price: 11,
        selling_price: 15,
      }),
      selling_options: [
        buildSellingOption({ option_id: 'n-pc', product_id: 'prod-noodles', option_name: '1 Piece', barcode: '4800011111111', quantity: 1, price: 15 }),
        buildSellingOption({ option_id: 'n-pk', product_id: 'prod-noodles', option_name: '1 Pack', barcode: '4800011111128', quantity: 5, price: 70 }),
        buildSellingOption({ option_id: 'n-bx', product_id: 'prod-noodles', option_name: '1 Box', barcode: '4800011111135', quantity: 40, price: 500 }),
      ],
    });

    const bulkStockIn = InventoryTransactionSchema.parse({
      transaction_id: 'tx-stockin-box',
      product_id: noodles.product_id,
      supplier_id: 'sup-1',
      option_id: 'n-bx',
      transaction_type: 'STOCK_IN',
      quantity: 80, // 2 boxes * 40 pieces
      unit_cost: 11,
      reference_number: 'INV-2026-01',
      remarks: '2 Boxes stocked in',
      created_by: 'owner-1',
      created_at: CURRENT_TIMESTAMP,
    });

    expect(noodles.selling_options[2].barcode).toBe('4800011111135');
    expect(bulkStockIn.option_id).toBe('n-bx');
    expect(bulkStockIn.quantity).toBe(80);
  });

  it('Scenario 7: Volume-based selling (Liquid Detergent in ml)', () => {
    const detergent = ProductWithOptionsSchema.parse({
      ...buildProduct({
        product_id: 'prod-detergent',
        product_name: 'Liquid Detergent',
        base_unit: 'ml',
        current_stock: 5000,
        cost_price: 0.07,
        selling_price: 0.1,
      }),
      selling_options: [
        buildSellingOption({ option_id: 'det-100', product_id: 'prod-detergent', option_name: '100 ml', quantity: 100, price: 10 }),
        buildSellingOption({ option_id: 'det-250', product_id: 'prod-detergent', option_name: '250 ml', quantity: 250, price: 25 }),
        buildSellingOption({ option_id: 'det-500', product_id: 'prod-detergent', option_name: '500 ml', quantity: 500, price: 50 }),
      ],
    });

    expect(detergent.base_unit).toBe('ml');
    expect(detergent.selling_options.map((option) => option.quantity)).toEqual([100, 250, 500]);
  });
});
