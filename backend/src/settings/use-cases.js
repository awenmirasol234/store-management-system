import { validateStoreSettings } from "./domain.js";

export function createGetSettingsUseCase(dependencies) {
  const settingsRepository = dependencies.settingsRepository;
  async function getSettings() {
    return settingsRepository.getSettings();
  }
  getSettings.execute = getSettings;
  return getSettings;
}

export function createUpdateSettingsUseCase(dependencies) {
  const settingsRepository = dependencies.settingsRepository;
  const clock = dependencies.clock;

  async function updateSettings(input) {
    validateStoreSettings(input);
    const current = await settingsRepository.getSettings();

    let nowIso = new Date().toISOString();
    if (clock && typeof clock.now === "function") {
      nowIso = clock.now().toISOString();
    }

    const updated = Object.assign({}, current, { updated_at: nowIso });

    const stringFields = [
      "store_name",
      "tagline",
      "address",
      "phone",
      "tax_number",
      "receipt_header",
      "receipt_footer"
    ];
    for (let i = 0; i < stringFields.length; i = i + 1) {
      const field = stringFields[i];
      if (input[field] !== undefined) {
        if (input[field] === null) {
          updated[field] = "";
        } else {
          updated[field] = input[field].trim();
        }
      }
    }

    if (input.default_low_stock_threshold !== undefined) {
      updated.default_low_stock_threshold = Number(input.default_low_stock_threshold);
    }

    const toggleFields = ["sound_enabled", "show_cashier_on_receipt"];
    for (let i = 0; i < toggleFields.length; i = i + 1) {
      const field = toggleFields[i];
      if (input[field] !== undefined) {
        if (typeof input[field] === "boolean") {
          if (input[field]) {
            updated[field] = 1;
          } else {
            updated[field] = 0;
          }
        } else {
          updated[field] = Number(input[field]);
        }
      }
    }

    await settingsRepository.saveSettings(updated);
    return updated;
  }

  updateSettings.execute = updateSettings;
  return updateSettings;
}
