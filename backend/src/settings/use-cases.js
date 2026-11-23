import { validateStoreSettings } from "./domain.js";

export function createGetSettingsUseCase(dependencies) {
  const settingsRepository = dependencies.settingsRepository;
  return {
    async execute() {
      return await settingsRepository.getSettings();
    }
  };
}

export function createUpdateSettingsUseCase(dependencies) {
  const settingsRepository = dependencies.settingsRepository;
  const clock = dependencies.clock;

  return {
    async execute(input) {
      validateStoreSettings(input);
      const current = await settingsRepository.getSettings();

      let nowIso = new Date().toISOString();
      if (clock && typeof clock.now === "function") {
        nowIso = clock.now().toISOString();
      }

      let soundVal = current.sound_enabled;
      if (input.sound_enabled !== undefined) {
        if (typeof input.sound_enabled === "boolean") {
          if (input.sound_enabled) {
            soundVal = 1;
          } else {
            soundVal = 0;
          }
        } else {
          soundVal = Number(input.sound_enabled);
        }
      }

      let cashierVal = current.show_cashier_on_receipt;
      if (input.show_cashier_on_receipt !== undefined) {
        if (typeof input.show_cashier_on_receipt === "boolean") {
          if (input.show_cashier_on_receipt) {
            cashierVal = 1;
          } else {
            cashierVal = 0;
          }
        } else {
          cashierVal = Number(input.show_cashier_on_receipt);
        }
      }

      let thresholdVal = current.default_low_stock_threshold;
      if (input.default_low_stock_threshold !== undefined) {
        thresholdVal = Number(input.default_low_stock_threshold);
      }

      let storeNameVal = current.store_name;
      if (input.store_name !== undefined) {
        storeNameVal = input.store_name.trim();
      }

      let taglineVal = current.tagline;
      if (input.tagline !== undefined) {
        if (input.tagline === null) {
          taglineVal = "";
        } else {
          taglineVal = input.tagline.trim();
        }
      }

      let addressVal = current.address;
      if (input.address !== undefined) {
        if (input.address === null) {
          addressVal = "";
        } else {
          addressVal = input.address.trim();
        }
      }

      let phoneVal = current.phone;
      if (input.phone !== undefined) {
        if (input.phone === null) {
          phoneVal = "";
        } else {
          phoneVal = input.phone.trim();
        }
      }

      let taxNumberVal = current.tax_number;
      if (input.tax_number !== undefined) {
        if (input.tax_number === null) {
          taxNumberVal = "";
        } else {
          taxNumberVal = input.tax_number.trim();
        }
      }

      let receiptHeaderVal = current.receipt_header;
      if (input.receipt_header !== undefined) {
        if (input.receipt_header === null) {
          receiptHeaderVal = "";
        } else {
          receiptHeaderVal = input.receipt_header.trim();
        }
      }

      let receiptFooterVal = current.receipt_footer;
      if (input.receipt_footer !== undefined) {
        if (input.receipt_footer === null) {
          receiptFooterVal = "";
        } else {
          receiptFooterVal = input.receipt_footer.trim();
        }
      }

      const updated = {
        id: "default",
        store_name: storeNameVal,
        tagline: taglineVal,
        address: addressVal,
        phone: phoneVal,
        tax_number: taxNumberVal,
        receipt_header: receiptHeaderVal,
        receipt_footer: receiptFooterVal,
        default_low_stock_threshold: thresholdVal,
        sound_enabled: soundVal,
        show_cashier_on_receipt: cashierVal,
        updated_at: nowIso
      };

      await settingsRepository.saveSettings(updated);
      return updated;
    }
  };
}
