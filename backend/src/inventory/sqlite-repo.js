import { fromMoneyInt, fromQuantityInt, toMoneyInt, toQuantityInt } from "../shared/decimal.js";

function toSqliteBool(booleanValue) {
  if (booleanValue) {
    return 1;
  }
  return 0;
}

function fromSqliteBool(intValue) {
  return intValue === 1;
}

function mapProductRow(row) {
  if (!row) {
    return null;
  }
  return {
    product_id: row.product_id,
    category_id: row.category_id,
    product_name: row.product_name,
    barcode: row.barcode,
    description: row.description,
    image_url: row.image_url,
    base_unit: row.base_unit,
    current_stock: fromQuantityInt(row.current_stock_int),
    cost_price: fromMoneyInt(row.cost_price_int),
    selling_price: fromMoneyInt(row.selling_price_int),
    reorder_level: fromQuantityInt(row.reorder_level_int),
    allow_custom_amount: fromSqliteBool(row.allow_custom_amount),
    is_active: fromSqliteBool(row.is_active),
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapSellingOptionRow(row) {
  if (!row) {
    return null;
  }
  return {
    option_id: row.option_id,
    product_id: row.product_id,
    option_name: row.option_name,
    barcode: row.barcode,
    quantity: fromQuantityInt(row.quantity_int),
    price: fromMoneyInt(row.price_int),
    is_active: fromSqliteBool(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapInventoryTransactionRow(row) {
  if (!row) {
    return null;
  }
  return {
    transaction_id: row.transaction_id,
    product_id: row.product_id,
    supplier_id: row.supplier_id,
    option_id: row.option_id,
    transaction_type: row.transaction_type,
    quantity: fromQuantityInt(row.quantity_int),
    unit_cost: fromMoneyInt(row.unit_cost_int),
    reference_number: row.reference_number,
    remarks: row.remarks,
    created_by: row.created_by,
    created_at: row.created_at
  };
}

function mapCategoryRow(row) {
  if (!row) {
    return null;
  }
  return {
    category_id: row.category_id,
    category_name: row.category_name,
    description: row.description,
    is_active: fromSqliteBool(row.is_active)
  };
}

function mapSupplierRow(row) {
  if (!row) {
    return null;
  }
  return {
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    contact_person: row.contact_person,
    phone: row.phone,
    address: row.address,
    is_active: fromSqliteBool(row.is_active)
  };
}

export function createSqliteProductRepository(database) {
  const findByIdStmt = database.prepare("SELECT * FROM products WHERE product_id = ?");
  const findByBarcodeStmt = database.prepare(
    "SELECT * FROM products WHERE barcode = ? AND deleted_at IS NULL"
  );
  const listAllStmt = database.prepare(
    "SELECT * FROM products WHERE deleted_at IS NULL ORDER BY product_name ASC"
  );
  const upsertStmt = database.prepare(`
    INSERT INTO products (
      product_id, category_id, product_name, barcode, description, image_url,
      base_unit, current_stock_int, cost_price_int, selling_price_int,
      reorder_level_int, allow_custom_amount, is_active, deleted_at, created_at, updated_at
    ) VALUES (
      @product_id, @category_id, @product_name, @barcode, @description, @image_url,
      @base_unit, @current_stock_int, @cost_price_int, @selling_price_int,
      @reorder_level_int, @allow_custom_amount, @is_active, @deleted_at, @created_at, @updated_at
    )
    ON CONFLICT(product_id) DO UPDATE SET
      category_id = excluded.category_id,
      product_name = excluded.product_name,
      barcode = excluded.barcode,
      description = excluded.description,
      image_url = excluded.image_url,
      base_unit = excluded.base_unit,
      current_stock_int = excluded.current_stock_int,
      cost_price_int = excluded.cost_price_int,
      selling_price_int = excluded.selling_price_int,
      reorder_level_int = excluded.reorder_level_int,
      allow_custom_amount = excluded.allow_custom_amount,
      is_active = excluded.is_active,
      deleted_at = excluded.deleted_at,
      updated_at = excluded.updated_at
  `);

  return {
    async findById(productId) {
      return mapProductRow(findByIdStmt.get(productId));
    },
    async findByBarcode(barcode) {
      return mapProductRow(findByBarcodeStmt.get(barcode));
    },
    async listAll() {
      const rows = listAllStmt.all();
      const results = [];
      for (let index = 0; index < rows.length; index++) {
        results.push(mapProductRow(rows[index]));
      }
      return results;
    },
    async save(product) {
      upsertStmt.run({
        product_id: product.product_id,
        category_id: product.category_id,
        product_name: product.product_name,
        barcode: product.barcode,
        description: product.description,
        image_url: product.image_url,
        base_unit: product.base_unit,
        current_stock_int: toQuantityInt(product.current_stock, "current_stock"),
        cost_price_int: toMoneyInt(product.cost_price, "cost_price"),
        selling_price_int: toMoneyInt(product.selling_price, "selling_price"),
        reorder_level_int: toQuantityInt(product.reorder_level, "reorder_level"),
        allow_custom_amount: toSqliteBool(product.allow_custom_amount),
        is_active: toSqliteBool(product.is_active),
        deleted_at: product.deleted_at,
        created_at: product.created_at,
        updated_at: product.updated_at
      });
    }
  };
}

export function createSqliteSellingOptionRepository(database) {
  const findByIdStmt = database.prepare("SELECT * FROM product_selling_options WHERE option_id = ?");
  const findByBarcodeStmt = database.prepare(
    "SELECT * FROM product_selling_options WHERE barcode = ?"
  );
  const listByProductStmt = database.prepare(
    "SELECT * FROM product_selling_options WHERE product_id = ? ORDER BY option_name ASC"
  );
  const upsertStmt = database.prepare(`
    INSERT INTO product_selling_options (
      option_id, product_id, option_name, barcode, quantity_int, price_int,
      is_active, created_at, updated_at
    ) VALUES (
      @option_id, @product_id, @option_name, @barcode, @quantity_int, @price_int,
      @is_active, @created_at, @updated_at
    )
    ON CONFLICT(option_id) DO UPDATE SET
      option_name = excluded.option_name,
      barcode = excluded.barcode,
      quantity_int = excluded.quantity_int,
      price_int = excluded.price_int,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at
  `);

  return {
    async findById(optionId) {
      return mapSellingOptionRow(findByIdStmt.get(optionId));
    },
    async findByBarcode(barcode) {
      return mapSellingOptionRow(findByBarcodeStmt.get(barcode));
    },
    async listByProductId(productId) {
      const rows = listByProductStmt.all(productId);
      const results = [];
      for (let index = 0; index < rows.length; index++) {
        results.push(mapSellingOptionRow(rows[index]));
      }
      return results;
    },
    async save(option) {
      upsertStmt.run({
        option_id: option.option_id,
        product_id: option.product_id,
        option_name: option.option_name,
        barcode: option.barcode,
        quantity_int: toQuantityInt(option.quantity, "quantity"),
        price_int: toMoneyInt(option.price, "price"),
        is_active: toSqliteBool(option.is_active),
        created_at: option.created_at,
        updated_at: option.updated_at
      });
    }
  };
}

export function createSqliteInventoryTransactionRepository(database) {
  const insertStmt = database.prepare(`
    INSERT INTO inventory_transactions (
      transaction_id, product_id, supplier_id, option_id, transaction_type,
      quantity_int, unit_cost_int, reference_number, remarks, created_by, created_at
    ) VALUES (
      @transaction_id, @product_id, @supplier_id, @option_id, @transaction_type,
      @quantity_int, @unit_cost_int, @reference_number, @remarks, @created_by, @created_at
    )
  `);
  const listByProductStmt = database.prepare(
    "SELECT * FROM inventory_transactions WHERE product_id = ? ORDER BY created_at DESC"
  );

  return {
    async save(transaction) {
      insertStmt.run({
        transaction_id: transaction.transaction_id,
        product_id: transaction.product_id,
        supplier_id: transaction.supplier_id,
        option_id: transaction.option_id,
        transaction_type: transaction.transaction_type,
        quantity_int: toQuantityInt(transaction.quantity, "quantity"),
        unit_cost_int: toMoneyInt(transaction.unit_cost, "unit_cost"),
        reference_number: transaction.reference_number,
        remarks: transaction.remarks,
        created_by: transaction.created_by,
        created_at: transaction.created_at
      });
    },
    async listByProductId(productId) {
      const rows = listByProductStmt.all(productId);
      const results = [];
      for (let index = 0; index < rows.length; index++) {
        results.push(mapInventoryTransactionRow(rows[index]));
      }
      return results;
    }
  };
}

export function createSqliteCategoryRepository(database) {
  const listAllStmt = database.prepare(
    "SELECT * FROM product_categories ORDER BY category_name ASC"
  );
  const findByIdStmt = database.prepare("SELECT * FROM product_categories WHERE category_id = ?");
  const upsertStmt = database.prepare(`
    INSERT INTO product_categories (category_id, category_name, description, is_active)
    VALUES (@category_id, @category_name, @description, @is_active)
    ON CONFLICT(category_id) DO UPDATE SET
      category_name = excluded.category_name,
      description = excluded.description,
      is_active = excluded.is_active
  `);

  return {
    async listAll() {
      const rows = listAllStmt.all();
      const results = [];
      for (let index = 0; index < rows.length; index++) {
        results.push(mapCategoryRow(rows[index]));
      }
      return results;
    },
    async findById(categoryId) {
      return mapCategoryRow(findByIdStmt.get(categoryId));
    },
    async save(category) {
      upsertStmt.run({
        category_id: category.category_id,
        category_name: category.category_name,
        description: category.description,
        is_active: toSqliteBool(category.is_active)
      });
    }
  };
}

export function createSqliteSupplierRepository(database) {
  const listAllStmt = database.prepare("SELECT * FROM suppliers ORDER BY supplier_name ASC");
  const findByIdStmt = database.prepare("SELECT * FROM suppliers WHERE supplier_id = ?");
  const upsertStmt = database.prepare(`
    INSERT INTO suppliers (supplier_id, supplier_name, contact_person, phone, address, is_active)
    VALUES (@supplier_id, @supplier_name, @contact_person, @phone, @address, @is_active)
    ON CONFLICT(supplier_id) DO UPDATE SET
      supplier_name = excluded.supplier_name,
      contact_person = excluded.contact_person,
      phone = excluded.phone,
      address = excluded.address,
      is_active = excluded.is_active
  `);

  return {
    async listAll() {
      const rows = listAllStmt.all();
      const results = [];
      for (let index = 0; index < rows.length; index++) {
        results.push(mapSupplierRow(rows[index]));
      }
      return results;
    },
    async findById(supplierId) {
      return mapSupplierRow(findByIdStmt.get(supplierId));
    },
    async save(supplier) {
      upsertStmt.run({
        supplier_id: supplier.supplier_id,
        supplier_name: supplier.supplier_name,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        address: supplier.address,
        is_active: toSqliteBool(supplier.is_active)
      });
    }
  };
}

function mapUnitRow(row) {
  if (!row) {
    return null;
  }
  return {
    unit_id: row.unit_id,
    unit_name: row.unit_name,
    is_active: fromSqliteBool(row.is_active)
  };
}

export function createSqliteUnitRepository(database) {
  const listAllStmt = database.prepare(
    "SELECT unit_id, unit_name, is_active FROM product_units WHERE is_active = 1 ORDER BY rowid ASC"
  );

  return {
    async listAll() {
      const rows = listAllStmt.all();
      const results = [];
      for (let index = 0; index < rows.length; index = index + 1) {
        results.push(mapUnitRow(rows[index]));
      }
      return results;
    }
  };
}
