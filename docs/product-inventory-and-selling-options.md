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
- barcode (nullable, unique)
- description
- base_unit
- current_stock
- cost_price
- selling_price
- reorder_level
- allow_custom_amount (boolean, default false – for ad-hoc peso/weight "tingi" sales)
- is_active
- created_at
- updated_at

Rules:
- Every product must have one base unit.
- Inventory is maintained using the base unit.
- `selling_price` represents the default price per 1 base unit.
- `cost_price` represents the current cost per 1 base unit.
- Products can have multiple additional selling options.
- Products without custom selling options are sold directly using `1 base_unit` at `selling_price`.

### 2.2 ProductSellingOption

Stores optional selling configurations (packs, bundles, promos, weight/volume presets, flexible prices) under a product.

Fields:
- option_id
- product_id
- option_name
- barcode (nullable, unique)
- quantity
- price
- is_active
- created_at
- updated_at

Field descriptions:
- `option_name`: Display name of the selling option (e.g., "3 for ₱5", "1 Pack (5 pcs)", "250g", "₱10 Worth").
- `barcode`: Optional barcode specific to this pack/box/option.
- `quantity`: Base quantity deducted when one option is sold (or added when used as a unit multiplier during stock-in).
- `price`: Selling price for the option.
- `is_active`: Controls whether the option can be used.

Rules:
- Selling options always belong to a parent product.
- The parent product's `base_unit` and `selling_price` always serve as the default selling method (`1 base_unit` at `Product.selling_price`); `ProductSellingOption` stores additional options.
- Each option has its own `quantity` (in the product's base unit) and `price`.
- Fractional quantities must be supported (e.g., `0.25` kg).
- Selling options do not maintain separate inventory.
- Selling options can also be used as unit multipliers during `STOCK_IN` (e.g., stocking in 2 Boxes where 1 Box = 40 pieces adds 80 pieces to `current_stock`).

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
- supplier_id (nullable, used for `STOCK_IN` purchases)
- option_id (nullable, optional reference when stocking in by pack/box)
- transaction_type
- quantity (always stored in `base_unit`)
- unit_cost (cost per `base_unit` at the time of transaction)
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
- All quantities must be stored in the product's base unit (if a pack/box option is selected during stock-in, convert `entered_qty × option.quantity` into `base_unit`).
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
- option_id (nullable)
- option_name_snapshot (stores the option name or base unit name at the time of sale)
- quantity
- base_quantity
- unit_price
- unit_cost
- subtotal

Rules:
- `option_id` is nullable when selling directly using the product's default base unit and price, or when making an ad-hoc custom weight/amount sale.
- `quantity` represents the number of selling options (or base units) purchased.
- `base_quantity` stores the actual total inventory quantity deducted in `base_unit`.
- `unit_price` stores the actual selling price per unit/option at the time of sale.
- `unit_cost` snapshots `Product.cost_price` (cost per `base_unit`) at the time of sale so historical profit calculations (`subtotal - (base_quantity × unit_cost)`) remain accurate even when supplier costs change.
- Preserve historical prices, costs, and quantities even when product configurations change.

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

## 5. Inventory & Profit Calculations

Use one consistent calculation for all selling methods.

### 5.1 Option-Based or Base-Unit Sale
- When a `ProductSellingOption` is selected:
  - `base_quantity = option.quantity × sold_quantity`
  - `subtotal = sold_quantity × option.price`
- When selling directly in the product's default base unit (`option_id = null`):
  - `base_quantity = 1 × sold_quantity`
  - `subtotal = sold_quantity × product.selling_price`

### 5.2 Ad-Hoc Custom Peso Amount ("Tingi") Sale
- When a customer buys a custom peso amount (e.g., ₱7 worth of cooking oil) and `allow_custom_amount = true`:
  - `base_quantity = custom_peso_amount / product.selling_price`
  - `subtotal = custom_peso_amount`

### 5.3 Stock Deduction & Profit
- Remaining inventory:
  - `remaining_stock = current_stock - base_quantity`
- Item profit (using snapshotted `unit_cost` per base unit):
  - `item_profit = subtotal - (base_quantity × unit_cost)`

### 5.4 Bulk Stock-In Conversion
- When stocking in using a pack/box option:
  - `stock_added_in_base_unit = entered_pack_quantity × option.quantity`
  - `new_stock = current_stock + stock_added_in_base_unit`

---

## 6. Important Business Rules

1. Each product must have one base unit.
2. Each product must have a default selling price per 1 base unit (eliminating ambiguity between product default price and option default flags).
3. Selling options are optional and represent additional ways to sell or restock the product.
4. Selling options can have different prices, quantities, and optional barcodes.
5. All selling-option quantities must use the parent's base unit.
6. Support fractional quantities (e.g., `DECIMAL(12, 4)`) for weight and volume.
7. Keep inventory strictly at the parent product level.
8. Validate available stock before completing a sale.
9. Deduct inventory only after a successful sale.
10. Save actual selling prices (`unit_price`), base unit cost (`unit_cost`), option name snapshot (`option_name_snapshot`), and deducted quantities (`base_quantity`) in `SalesItem` records.
11. Record all inventory movements in `InventoryTransaction` (with optional `supplier_id` and `option_id`).
12. Use database transactions when processing sales and inventory deductions together.
13. Use `DECIMAL(12, 2)` for monetary values and `DECIMAL(12, 4)` for fractional inventory quantities.
14. Prevent negative inventory unless explicitly allowed by business rules.
15. Preserve historical sales and profit records when product prices, costs, or selling options change.

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