# Product Inventory & Selling Options Specification

Authoritative domain specification for retail inventory, packaging options, sales calculations, and stock movements.

---

## 1. Domain Architecture & Core Invariants

1. **Single Canonical Inventory**:
   - Stock is maintained exclusively at the parent `Product` level in its defined `base_unit`.
   - `ProductSellingOption` represents packaging, volume/weight presets, promotional deals, or flexible pricing tiers. Selling options never maintain independent stock.
2. **Numeric Precision Standards**:
   - Currency: 2 decimals, stored in SQLite as integer centavos (`× 100`).
   - Inventory & Multipliers: Up to 4 decimals, stored in SQLite as scaled ten-thousandths (`× 10,000`).
3. **Snapshot Invariants**:
   - Sales items snapshot `unit_price`, `unit_cost`, `base_quantity`, and `option_name_snapshot` at checkout. Historical sales records remain immutable when product prices or supplier costs change.

---

## 2. Entity Schemas & Rules

### 2.1 Product
Stores canonical catalog items and physical inventory.

- `product_id`: Unique identifier (string).
- `category_id`: Foreign key referencing `product_categories`.
- `product_name`: Descriptive item name (required).
- `barcode`: Barcode string (nullable, unique across products and selling options).
- `description`: Optional notes.
- `image_url`: Relative path or URL to product image.
- `base_unit`: Canonical unit of measurement (e.g., `Piece (pc)`, `Kilogram (kg)`, `Liter (L)`).
- `current_stock_int`: Integer scaled stock quantity (`× 10,000`).
- `cost_price_int`: Current purchase cost per 1 base unit in integer centavos (`× 100`).
- `selling_price_int`: Default selling price for 1 base unit in integer centavos (`× 100`).
- `reorder_level_int`: Low-stock alert threshold in scaled quantity (`× 10,000`).
- `allow_custom_amount`: Boolean flag enabling ad-hoc peso "tingi" purchases.
- `is_active`: Boolean status flag (default `1`).
- `deleted_at`: ISO timestamp for soft deletion (nullable).

### 2.2 ProductSellingOption
Defines additional packaging, promotional bundles, or pricing options under a product.

- `option_id`: Unique identifier.
- `product_id`: Foreign key referencing parent `products.product_id`.
- `option_name`: Display label (e.g., `3 for ₱5`, `Pack of 10`, `250g`).
- `barcode`: Optional barcode specific to this packaging option (must be globally unique).
- `quantity_int`: Base unit multiplier deducted per option sold (`× 10,000`).
- `price_int`: Selling price for this option in integer centavos (`× 100`).
- `is_active`: Boolean status flag.

### 2.3 InventoryTransaction
Maintains the audit ledger of all physical stock movements.

- `transaction_id`: Unique identifier.
- `product_id`: Foreign key referencing `products.product_id`.
- `supplier_id`: Foreign key referencing `suppliers` (nullable, used for `STOCK_IN`).
- `option_id`: Foreign key referencing `product_selling_options` (nullable reference if restocked by pack/box).
- `transaction_type`: `STOCK_IN`, `SALE`, `RETURN`, `ADJUSTMENT`, `DAMAGED`, `EXPIRED`.
- `quantity_int`: Signed quantity in `base_unit` (`× 10,000`). Positive for additions, negative for deductions.
- `unit_cost_int`: Purchase cost per base unit at the time of transaction (`× 100`).
- `reference_number`: Optional document or receipt reference.
- `remarks`: Human-readable reason.
- `created_by`: User or system ID.
- `created_at`: ISO timestamp.

### 2.4 SalesTransaction & SalesItem
Stores completed checkout transactions and line-item snapshots.

- `SalesTransaction`:
  - `sale_id`, `receipt_number`, `shift_id`, `customer_id`, `payment_method` (`CASH`, `CREDIT`, `SPLIT`).
  - `subtotal_amount_int`, `discount_amount_int`, `total_amount_int`, `cash_amount_int`, `credit_amount_int`, `amount_paid_int`, `change_amount_int`.
  - Invariant: `cash_amount + credit_amount == total_amount`.
- `SalesItem`:
  - `sale_item_id`, `sale_id`, `product_id`, `option_id` (nullable).
  - `option_name_snapshot`: Option name or base unit label.
  - `quantity_int`: Number of options or base units sold (`× 10,000`).
  - `base_quantity_int`: Actual inventory deducted in `base_unit` (`× 10,000`).
  - `unit_price_int`: Selling price per option/unit charged (`× 100`).
  - `unit_cost_int`: Snapshotted cost per base unit (`× 100`).
  - `subtotal_int`: Line item subtotal (`× 100`).

---

## 3. Selling Modes & Mathematical Calculations

### Mode 1: Default Base-Unit Sale
Used when selling directly in the product's base unit (`option_id = null`):
- $\text{base\_quantity} = 1 \times \text{sold\_quantity}$
- $\text{line\_subtotal} = \text{sold\_quantity} \times \text{product.selling\_price}$

### Mode 2: Preset Selling Option Sale
Used when customer selects a packaging option, bundle, or preset:
- $\text{base\_quantity} = \text{option.quantity} \times \text{sold\_quantity}$
- $\text{line\_subtotal} = \text{sold\_quantity} \times \text{option.price}$

### Mode 3: Ad-Hoc Custom Peso Amount ("Tingi") Sale
Used when customer buys a custom peso amount (e.g., ₱10 worth of cooking oil) and `allow_custom_amount = true`:
- $\text{base\_quantity} = \text{round\_half\_up}\left(\frac{\text{custom\_peso\_amount}}{\text{product.selling\_price}}, 4\right)$
- $\text{sold\_quantity} = 1$
- $\text{unit\_price} = \text{custom\_peso\_amount}$
- $\text{line\_subtotal} = \text{custom\_peso\_amount}$
- Snapshot name: `"Custom Amount (₱<amount>)"`.

---

## 4. Stock Movement & Profit Calculations

1. **Inventory Deduction**:
   $$\text{remaining\_stock} = \text{current\_stock} - \text{base\_quantity}$$
2. **Item Gross Profit**:
   $$\text{profit} = \text{subtotal} - (\text{base\_quantity} \times \text{unit\_cost})$$
3. **Bulk Restocking Multiplier**:
   When receiving goods using a pack or box option:
   $$\text{added\_stock} = \text{entered\_packs} \times \text{option.quantity}$$
   $$\text{new\_stock} = \text{current\_stock} + \text{added\_stock}$$
4. **Cost Price Update Policy**:
   On `STOCK_IN`, if a unit cost is supplied, update `Product.cost_price` to the latest unit cost. Historical snapshots on past sales items and past stock transactions remain unchanged.

---

## 5. Business Invariants & Constraints

- **Barcode Uniqueness**: Barcodes must be unique across all active, non-deleted `Product.barcode` and `ProductSellingOption.barcode` values.
- **Stock Validation**: Sales must be rejected if `current_stock < base_quantity`.
- **Soft Deletions**: Deleting a product sets `deleted_at = current_timestamp`. Products with `deleted_at IS NOT NULL` are excluded from POS search, catalog listings, and low-stock queries.
- **Deactivation**: Setting `is_active = false` disables products, options, categories, or suppliers without breaking relational references.
