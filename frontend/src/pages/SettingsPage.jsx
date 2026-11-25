import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  Printer,
  Receipt,
  Save,
  Sliders,
  Store,
  Users
} from "lucide-react";
import { api } from "../api.js";
import { Button } from "../components/Button.jsx";
import { Input } from "../components/Input.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";

function normalizeSettings(data) {
  let settings = data;
  if (!settings) {
    settings = {};
  }

  let threshold = Number(settings.default_low_stock_threshold);
  if (!Number.isInteger(threshold) || threshold < 0) {
    threshold = 5;
  }

  let soundEnabled = Number(settings.sound_enabled);
  if (soundEnabled !== 0 && soundEnabled !== 1) {
    soundEnabled = 1;
  }

  let showCashier = Number(settings.show_cashier_on_receipt);
  if (showCashier !== 0 && showCashier !== 1) {
    showCashier = 1;
  }

  return {
    store_name: settings.store_name || "",
    tagline: settings.tagline || "",
    address: settings.address || "",
    phone: settings.phone || "",
    tax_number: settings.tax_number || "",
    receipt_header: settings.receipt_header || "",
    receipt_footer: settings.receipt_footer || "",
    default_low_stock_threshold: threshold,
    sound_enabled: soundEnabled,
    show_cashier_on_receipt: showCashier
  };
}

export function SettingsPage(props) {
  const currentUser = props.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    store_name: "StoreFlow POS",
    tagline: "",
    address: "",
    phone: "",
    tax_number: "",
    receipt_header: "",
    receipt_footer: "",
    default_low_stock_threshold: 5,
    sound_enabled: 1,
    show_cashier_on_receipt: 1
  });

  useEffect(function loadSettings() {
    let isMounted = true;
    setLoading(true);

    api.getSettings()
      .then(function (result) {
        if (!isMounted) {
          return;
        }
        let data = result;
        if (result && result.data) {
          data = result.data;
        }
        if (data) {
          setFormData(normalizeSettings(data));
        }
        setLoading(false);
      })
      .catch(function (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error.message || "Failed to load store settings");
        setLoading(false);
      });

    return function cleanup() {
      isMounted = false;
    };
  }, []);

  function handleFieldChange(field, value) {
    setSuccessMessage("");
    setErrorMessage("");
    setFormData(function (prev) {
      const next = Object.assign({}, prev);
      next[field] = value;
      return next;
    });
  }

  async function handleSave(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    if (saving || loading) {
      return;
    }
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.store_name || formData.store_name.trim().length === 0) {
      setErrorMessage("Store name is required");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        store_name: formData.store_name.trim(),
        tagline: formData.tagline.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        tax_number: formData.tax_number.trim(),
        receipt_header: formData.receipt_header.trim(),
        receipt_footer: formData.receipt_footer.trim(),
        default_low_stock_threshold: Number(formData.default_low_stock_threshold),
        sound_enabled: formData.sound_enabled,
        show_cashier_on_receipt: formData.show_cashier_on_receipt
      };

      const result = await api.updateSettings(payload);
      let saved = result;
      if (result && result.data) {
        saved = result.data;
      }
      if (saved) {
        setFormData(normalizeSettings(saved));
      }
      setSuccessMessage("Settings saved successfully");
    } catch (error) {
      setErrorMessage(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadBackup() {
    setDownloadingBackup(true);
    setErrorMessage("");
    try {
      await api.downloadBackup();
      setSuccessMessage("Database backup downloaded successfully");
    } catch (error) {
      setErrorMessage(error.message || "Failed to download backup");
    } finally {
      setDownloadingBackup(false);
    }
  }

  let errorBanner = null;
  if (errorMessage) {
    errorBanner = (
      <ErrorBanner
        message={errorMessage}
        className="mb-4 sm:mb-5"
        onDismiss={function () {
          setErrorMessage("");
        }}
      />
    );
  }

  let successBanner = null;
  if (successMessage) {
    successBanner = (
      <div
        role="status"
        className="mb-4 sm:mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>{successMessage}</span>
      </div>
    );
  }

  let previewTagline = null;
  if (formData.tagline) {
    previewTagline = <div className="text-2xs text-[#777777]">{formData.tagline}</div>;
  }

  let previewAddress = null;
  if (formData.address) {
    previewAddress = <div className="text-2xs text-[#777777]">{formData.address}</div>;
  }

  let previewContact = null;
  if (formData.phone || formData.tax_number) {
    let phoneRow = null;
    if (formData.phone) {
      phoneRow = <div>{"Tel: " + formData.phone}</div>;
    }
    let taxRow = null;
    if (formData.tax_number) {
      taxRow = <div>{"TIN: " + formData.tax_number}</div>;
    }
    previewContact = (
      <div className="text-2xs text-[#777777] space-y-0.5">
        {phoneRow}
        {taxRow}
      </div>
    );
  }

  let previewHeaderNote = null;
  if (formData.receipt_header) {
    previewHeaderNote = (
      <div className="text-2xs text-[#171717] italic pt-1">{formData.receipt_header}</div>
    );
  }

  let previewCashier = null;
  if (formData.show_cashier_on_receipt === 1) {
    let cashierName = "Staff";
    if (currentUser && (currentUser.full_name || currentUser.username)) {
      cashierName = currentUser.full_name || currentUser.username;
    }
    previewCashier = <div className="text-tiny text-[#171717]">{"Cashier: " + cashierName}</div>;
  }

  let previewFooterNote = null;
  if (formData.receipt_footer) {
    previewFooterNote = (
      <div className="text-center border-t border-dashed border-[#E9E9E9] pt-2 mt-2 text-2xs text-[#777777]">
        {formData.receipt_footer}
      </div>
    );
  }

  let saveButtonText = "Save Settings";
  if (saving) {
    saveButtonText = "Saving Changes...";
  }

  let downloadButtonText = "Download Backup";
  if (downloadingBackup) {
    downloadButtonText = "Preparing...";
  }

  return (
    <PageLayout scroll={true}>
      <PageHeader title="Store Settings" stackOnMobile={true}>
        <Button
          type="submit"
          form="settings-form"
          variant="primary"
          disabled={loading || saving}
        >
          <Save className="h-4 w-4" />
          <span>{saveButtonText}</span>
        </Button>
      </PageHeader>

      {errorBanner}
      {successBanner}

      <form id="settings-form" onSubmit={handleSave} className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
          {/* Left Column: Profile, Preferences, Disaster Recovery */}
          <div className="space-y-4 sm:space-y-5 lg:col-span-7">
            {/* Section 1: Store Profile */}
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
              <div className="mb-3.5 flex items-center gap-2">
                <Store className="h-4 w-4 text-[#171717]" />
                <h2 className="text-base font-semibold text-[#171717]">Store Profile</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Store Name *"
                    value={formData.store_name}
                    onChange={function (e) {
                      handleFieldChange("store_name", e.target.value);
                    }}
                    placeholder="Store Name"
                    required={true}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    label="Tagline"
                    value={formData.tagline}
                    onChange={function (e) {
                      handleFieldChange("tagline", e.target.value);
                    }}
                    placeholder="Optional tagline"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    label="Phone"
                    value={formData.phone}
                    onChange={function (e) {
                      handleFieldChange("phone", e.target.value);
                    }}
                    placeholder="Phone number"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    label="TIN"
                    value={formData.tax_number}
                    onChange={function (e) {
                      handleFieldChange("tax_number", e.target.value);
                    }}
                    placeholder="Tax Identification Number"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    label="Address"
                    value={formData.address}
                    onChange={function (e) {
                      handleFieldChange("address", e.target.value);
                    }}
                    placeholder="Store address"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: POS & Inventory Preferences */}
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
              <div className="mb-3.5 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#171717]" />
                <h2 className="text-base font-semibold text-[#171717]">POS & Inventory Preferences</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    label="Low Stock Threshold"
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    value={formData.default_low_stock_threshold}
                    onChange={function (e) {
                      handleFieldChange("default_low_stock_threshold", e.target.value);
                    }}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center pt-2 sm:pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sound_enabled === 1}
                      onChange={function (e) {
                        let val = 0;
                        if (e.target.checked) {
                          val = 1;
                        }
                        handleFieldChange("sound_enabled", val);
                      }}
                      disabled={loading}
                      className="h-4 w-4 rounded border-[#E9E9E9] text-[#171717] focus:ring-[#B9F36B]/30 accent-[#171717]"
                    />
                    <span className="text-sm text-[#171717]">Play sound on checkout</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Staff & Access */}
            {(!props.capabilities || props.capabilities.staff_management) && (
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
              <div className="mb-3.5 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#171717]" />
                <h2 className="text-base font-semibold text-[#171717]">Staff & Access</h2>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm text-[#777777]">
                  Manage cashier and owner accounts with terminal PIN access
                </span>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={function openStaff() {
                    if (typeof props.onOpenUserModal === "function") {
                      props.onOpenUserModal();
                    }
                  }}
                  className="shrink-0"
                >
                  <Users className="h-4 w-4" />
                  <span>Manage Staff</span>
                </Button>
              </div>
            </div>
            )}

            {/* Section 4: Database & Disaster Recovery */}
            {(!props.capabilities || props.capabilities.database_backup) && (
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
              <div className="mb-3.5 flex items-center gap-2">
                <Database className="h-4 w-4 text-[#171717]" />
                <h2 className="text-base font-semibold text-[#171717]">Database & Disaster Recovery</h2>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm text-[#777777]">
                  Download a copy of the SQLite database (.db)
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadBackup}
                  disabled={downloadingBackup}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4" />
                  <span>{downloadButtonText}</span>
                </Button>
              </div>
            </div>
            )}
          </div>

          {/* Right Column: Receipt Customization & Thermal Printer Preview */}
          <div className="space-y-4 sm:space-y-5 lg:col-span-5">
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
              <div className="mb-3.5 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#171717]" />
                <h2 className="text-base font-semibold text-[#171717]">Receipt & Thermal Printing</h2>
              </div>

              <div className="space-y-4">
                <Input
                  label="Receipt Header Note"
                  value={formData.receipt_header}
                  onChange={function (e) {
                    handleFieldChange("receipt_header", e.target.value);
                  }}
                  placeholder="e.g. Thank you for shopping with us!"
                  disabled={loading}
                />

                <Input
                  label="Receipt Footer Note"
                  value={formData.receipt_footer}
                  onChange={function (e) {
                    handleFieldChange("receipt_footer", e.target.value);
                  }}
                  placeholder="e.g. Please keep receipt for returns"
                  disabled={loading}
                />

                <div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_cashier_on_receipt === 1}
                      onChange={function (e) {
                        let val = 0;
                        if (e.target.checked) {
                          val = 1;
                        }
                        handleFieldChange("show_cashier_on_receipt", val);
                      }}
                      disabled={loading}
                      className="h-4 w-4 rounded border-[#E9E9E9] text-[#171717] focus:ring-[#B9F36B]/30 accent-[#171717]"
                    />
                    <span className="text-sm text-[#171717]">Print cashier name on receipt</span>
                  </label>
                </div>

                {/* Live Mini Thermal Receipt Preview */}
                <div className="pt-1">
                  <div className="rounded-xl border border-dashed border-[#E9E9E9] bg-[#EEEEED]/40 p-3.5">
                    <div className="mb-2 flex items-center justify-between text-2xs font-semibold text-[#777777] uppercase tracking-wider">
                      <span>Thermal Receipt Preview</span>
                      <Printer className="h-3.5 w-3.5" />
                    </div>
                    <div className="mx-auto max-w-[240px] rounded-lg border border-[#E9E9E9] bg-white p-3 font-mono text-3xs text-[#171717] shadow-xs">
                      <div className="border-b border-dashed border-[#E9E9E9] pb-2 text-center space-y-0.5">
                        <div className="text-xs font-bold uppercase">
                          {formData.store_name || "STOREFLOW POS"}
                        </div>
                        {previewTagline}
                        {previewAddress}
                        {previewContact}
                        {previewHeaderNote}
                        <div className="pt-1 font-semibold">OR #000124</div>
                        <div className="text-[#777777]">23 Nov 2026, 09:30 AM</div>
                        {previewCashier}
                      </div>

                      <div className="border-b border-dashed border-[#E9E9E9] py-2 space-y-1">
                        <div className="flex justify-between">
                          <span>Lucky Me Pancit Canton</span>
                          <span>₱18.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Coca-Cola Mismo 290ml</span>
                          <span>₱20.00</span>
                        </div>
                      </div>

                      <div className="pt-2 space-y-0.5">
                        <div className="flex justify-between font-bold">
                          <span>TOTAL</span>
                          <span>₱38.00</span>
                        </div>
                        <div className="flex justify-between text-[#777777]">
                          <span>Cash</span>
                          <span>₱50.00</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Change</span>
                          <span>₱12.00</span>
                        </div>
                      </div>

                      {previewFooterNote}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}
