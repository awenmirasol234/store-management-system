import { DEFAULT_STORE_SETTINGS } from "./domain.js";

export function createSqliteSettingsRepository(database) {
  function mapRowToEntity(row) {
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      store_name: row.store_name,
      tagline: row.tagline || "",
      address: row.address || "",
      phone: row.phone || "",
      tax_number: row.tax_number || "",
      receipt_header: row.receipt_header || "",
      receipt_footer: row.receipt_footer || "",
      default_low_stock_threshold: Number(row.default_low_stock_threshold),
      sound_enabled: Number(row.sound_enabled),
      show_cashier_on_receipt: Number(row.show_cashier_on_receipt),
      updated_at: row.updated_at
    };
  }

  return {
    async getSettings() {
      const statement = database.prepare(
        "SELECT * FROM store_settings WHERE id = 'default' LIMIT 1"
      );
      const row = statement.get();
      if (row) {
        return mapRowToEntity(row);
      }

      const now = new Date().toISOString();
      const insert = database.prepare(`
        INSERT INTO store_settings (
          id, store_name, tagline, address, phone, tax_number,
          receipt_header, receipt_footer, default_low_stock_threshold,
          sound_enabled, show_cashier_on_receipt, updated_at
        ) VALUES (
          'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);
      insert.run(
        DEFAULT_STORE_SETTINGS.store_name,
        DEFAULT_STORE_SETTINGS.tagline,
        DEFAULT_STORE_SETTINGS.address,
        DEFAULT_STORE_SETTINGS.phone,
        DEFAULT_STORE_SETTINGS.tax_number,
        DEFAULT_STORE_SETTINGS.receipt_header,
        DEFAULT_STORE_SETTINGS.receipt_footer,
        DEFAULT_STORE_SETTINGS.default_low_stock_threshold,
        DEFAULT_STORE_SETTINGS.sound_enabled,
        DEFAULT_STORE_SETTINGS.show_cashier_on_receipt,
        now
      );

      return mapRowToEntity(statement.get());
    },

    async saveSettings(settings) {
      const update = database.prepare(`
        INSERT INTO store_settings (
          id, store_name, tagline, address, phone, tax_number,
          receipt_header, receipt_footer, default_low_stock_threshold,
          sound_enabled, show_cashier_on_receipt, updated_at
        ) VALUES (
          'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          store_name = excluded.store_name,
          tagline = excluded.tagline,
          address = excluded.address,
          phone = excluded.phone,
          tax_number = excluded.tax_number,
          receipt_header = excluded.receipt_header,
          receipt_footer = excluded.receipt_footer,
          default_low_stock_threshold = excluded.default_low_stock_threshold,
          sound_enabled = excluded.sound_enabled,
          show_cashier_on_receipt = excluded.show_cashier_on_receipt,
          updated_at = excluded.updated_at
      `);

      update.run(
        settings.store_name,
        settings.tagline || "",
        settings.address || "",
        settings.phone || "",
        settings.tax_number || "",
        settings.receipt_header || "",
        settings.receipt_footer || "",
        settings.default_low_stock_threshold,
        settings.sound_enabled,
        settings.show_cashier_on_receipt,
        settings.updated_at
      );

      return settings;
    }
  };
}
