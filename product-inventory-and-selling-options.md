# Reusable Product Inventory and Flexible Selling Module

## 1. Overview

A reusable inventory management module designed for Sari-Sari Stores and small retail businesses.

The module supports different product selling methods using a simple product and selling-option structure.

It can be reused across different projects without requiring separate implementations for each pricing method.

### Supported Features

1. Regular Product Selling – Sell products using their default unit and price.
2. Flexible Pricing – Allow multiple selling prices for the same product and base quantity.
3. Quantity-Based Pricing – Support promotional deals such as 3 candies for ₱5.
4. Amount-Based Selling – Allow customers to purchase products based on a peso amount, such as ₱10 worth of cooking oil.
5. Multiple Selling Units – Sell products by piece, pack, box, bundle, and other units.
6. Weight-Based Selling – Support kilograms and grams with fractional quantities.
7. Volume-Based Selling – Support liters and milliliters.
8. Inventory Tracking – Automatically deduct stock based on the actual quantity sold.

---

## 2. Database Models

### 2.1 Product

Stores the main product information and available inventory.

Fields:
- product_id
- category_id
- product_name
- description
- base_unit
- current_stock
- cost_price
- selling_price
- reorder_level
- is_active
- created_at
- updated_at

Rules:
- Every product must have one base unit.
- Inventory is maintained using the base unit.
- `selling_price` represents the default price per base unit.
- Products can have multiple selling options.
- Products without custom selling options can be sold directly.

### 2.2 ProductSellingOption

Stores optional selling configurations under a product.

Fields:
- option_id
- product_id
- option_name
- quantity
- price
- is_default
- is_active
- created_at
- updated_at

Field descriptions:
- `option_name`: Display name of the selling option.
- `quantity`: Base quantity deducted when one option is sold.
- `price`: Selling price for the option.
- `is_default`: Identifies the default selling option.
- `is_active`: Controls whether the option can be used.

Rules:
- Selling options always belong to a parent product.
- Each option can have its own quantity and selling price.
- Quantity must use the product's base unit.
- Fractional quantities must be supported.
- Selling options do not maintain separate inventory.
- Selling options can represent bundles, promotions, peso-based amounts, or custom prices.

### 2.3 ProductCategory

Stores product categories.

Fields:
- category_id
- category_name
- description
- is_active

### 2.4 Supplier

Stores supplier information.

Fields:
- supplier_id
- supplier_name
- contact_person
- phone
- address
- is_active

### 2.5 InventoryTransaction

Records all inventory movements.

Fields:
- transaction_id
- product_id
- transaction_type
- quantity
- unit_cost
- reference_number
- remarks
- created_by
- created_at

Transaction types:
- STOCK_IN
- SALE
- RETURN
- ADJUSTMENT
- DAMAGED
- EXPIRED

Rules:
- Record every inventory movement.
- Use positive quantities for stock additions and negative quantities for deductions.
- All quantities must use the product's base unit.
- Maintain transaction history for auditing.

### 2.6 SalesTransaction

Stores completed sales and payment information.

Fields:
- sale_id
- receipt_number
- total_amount
- amount_paid
- change_amount
- created_by
- created_at

### 2.7 SalesItem

Stores individual products and selling options included in a sale.

Fields:
- sale_item_id
- sale_id
- product_id
- option_id
- quantity
- base_quantity
- unit_price
- subtotal

Rules:
- `option_id` can be nullable when selling directly using the product's default price.
- `quantity` represents the number of selling options purchased.
- `base_quantity` stores the actual total inventory quantity deducted.
- `unit_price` stores the actual selling price at the time of sale.
- Preserve historical prices and quantities even when product configurations change.

---

## 3. Model Relationships

- ProductCategory (1:N) Product
- Product (1:N) ProductSellingOption
- Product (1:N) InventoryTransaction
- SalesTransaction (1:N) SalesItem
- Product (1:N) SalesItem
- ProductSellingOption (1:N) SalesItem
- Supplier (1:N) InventoryTransaction (optional, for stock purchases)

---

## 4. Supported Selling Scenarios

### Scenario 1: Regular Product – Fixed Pricing

Product: Bottled Water  
Base Unit: Piece  
Current Stock: 100 pieces

Default Selling Price:
- 1 piece = ₱15

Expected:
- Sell 1 piece → Deduct 1 piece.

### Scenario 2: Quantity-Based Pricing

Product: Candy  
Base Unit: Piece  
Current Stock: 100 pieces

Selling Options:

| Option | Quantity | Price |
|---|---:|---:|
| 1 Piece | 1 | ₱2 |
| 3 for ₱5 | 3 | ₱5 |
| 10 for ₱15 | 10 | ₱15 |

Expected:
- Sell 3 for ₱5 → Deduct 3 pieces.
- Sell 2 bundles of 3 → Deduct 6 pieces.

### Scenario 3: Amount-Based Selling

Product: Cooking Oil  
Base Unit: ml  
Current Stock: 10,000 ml  
Selling Rate: ₱200 per liter

Selling Options:

| Option | Quantity | Price |
|---|---:|---:|
| ₱5 Worth | 25 ml | ₱5 |
| ₱10 Worth | 50 ml | ₱10 |
| ₱20 Worth | 100 ml | ₱20 |

Expected:
- Sell ₱10 worth → Deduct 50 ml.

### Scenario 4: Flexible Pricing

Product: Tomato  
Base Unit: Piece  
Current Stock: 50 pieces

Selling Options:

| Option | Quantity | Price |
|---|---:|---:|
| Price Option 1 | 1 | ₱5 |
| Price Option 2 | 1 | ₱8 |
| Price Option 3 | 1 | ₱12 |

Expected:
- Sell 1 piece at ₱5 → Deduct 1 piece.
- Sell 1 piece at ₱8 → Deduct 1 piece.
- Sell 1 piece at ₱12 → Deduct 1 piece.

### Scenario 5: Weight-Based Selling

Product: Rice  
Base Unit: kg  
Current Stock: 50 kg  
Selling Rate: ₱60 per kg

Selling Options:

| Option | Quantity | Price |
|---|---:|---:|
| 250 grams | 0.25 kg | ₱15 |
| 500 grams | 0.50 kg | ₱30 |
| 1 kilogram | 1 kg | ₱60 |

Expected:
- Sell 250 grams → Deduct 0.25 kg.
- Sell 500 grams → Deduct 0.50 kg.

### Scenario 6: Multiple Selling Units

Product: Instant Noodles  
Base Unit: Piece  
Current Stock: 100 pieces

Selling Options:

| Option | Quantity | Price |
|---|---:|---:|
| 1 Piece | 1 | ₱15 |
| 1 Pack | 5 | ₱70 |
| 1 Box | 40 | ₱500 |

Expected:
- Sell 1 pack → Deduct 5 pieces.
- Sell 1 box → Deduct 40 pieces.

### Scenario 7: Volume-Based Selling

Product: Liquid Detergent  
Base Unit: ml  
Current Stock: 5,000 ml  
Selling Rate: ₱100 per liter

Selling Options:

| Option | Quantity | Price |
|---|---:|---:|
| 100 ml | 100 | ₱10 |
| 250 ml | 250 | ₱25 |
| 500 ml | 500 | ₱50 |

Expected:
- Sell 250 ml → Deduct 250 ml.

### Scenario 8: Fractional Quantity Selling

Product: Onion  
Base Unit: kg  
Current Stock: 20 kg  
Selling Rate: ₱120 per kg

Selling Options:

| Option | Quantity | Price |
|---|---:|---:|
| 100 grams | 0.10 | ₱12 |
| 250 grams | 0.25 | ₱30 |
| 500 grams | 0.50 | ₱60 |

Expected:
- Sell 250 grams → Deduct 0.25 kg.

---

## 5. Inventory Calculation

Use one consistent calculation for all selling methods.

Total inventory deduction:

`base_quantity = option.quantity × sold_quantity`

Remaining inventory:

`remaining_stock = current_stock - base_quantity`

Sales subtotal:

`subtotal = sold_quantity × option.price`

For regular products without a selected selling option, use the product's default selling price and base unit.

---

## 6. Important Business Rules

1. Each product must have one base unit.
2. Each product must have a default selling price.
3. Selling options are optional.
4. Selling options can have different prices and quantities.
5. All selling-option quantities must use the parent's base unit.
6. Support fractional quantities for weight and volume.
7. Keep inventory at the parent product level.
8. Validate available stock before completing a sale.
9. Deduct inventory only after a successful sale.
10. Save actual selling prices and deducted quantities in sales records.
11. Record all inventory movements.
12. Use database transactions when processing sales and inventory deductions together.
13. Use DECIMAL for monetary values and fractional inventory quantities.
14. Prevent negative inventory unless explicitly allowed by business rules.
15. Preserve historical sales records when product prices or selling options change.

---

## 7. Technical Requirements

- Keep the implementation simple and reusable.
- Follow the existing project's architecture and coding conventions.
- Separate product management, selling options, sales processing, and inventory tracking responsibilities.
- Avoid separate pricing models for each selling method.
- Avoid unnecessary tables and abstractions.
- Use database transactions for reliable sales processing.
- Add appropriate foreign keys, indexes, and constraints.
- Validate all quantities and prices on the backend.
- Keep documentation synchronized with the implementation.

## 8. Expected Result

A reusable inventory module where store owners can:

- Create and manage products.
- Assign categories and suppliers.
- Define a base measurement unit.
- Set default selling prices.
- Create custom selling options.
- Sell by piece, pack, box, weight, volume, or peso amount.
- Apply promotional and quantity-based pricing.
- Track available inventory automatically.
- View stock movement history.
- Track completed sales and payments.

The module should work for Sari-Sari Stores, small grocery stores, convenience stores, and other small retail businesses without requiring separate implementations for different selling methods.