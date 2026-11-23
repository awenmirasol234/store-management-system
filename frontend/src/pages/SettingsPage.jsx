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
  Volume2
} from "lucide-react";
import { api } from "../api.js";
import { Button } from "../components/Button.jsx";
import { Input } from "../components/Input.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";

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
        if (result && result.data) {
          const data = result.data;
          setFormData({
            store_name: data.store_name || "",
            tagline: data.tagline || "",
            address: data.address || "",
            phone: data.phone || "",
            tax_number: data.tax_number || "",
            receipt_header: data.receipt_header || "",
            receipt_footer: data.receipt_footer || "",
            default_low_stock_threshold: Number(data.default_low_stock_threshold),
            sound_enabled: Number(data.sound_enabled),
            show_cashier_on_receipt: Number(data.show_cashier_on_receipt)
          });
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
      if (result && result.data) {
        const saved = result.data;
        setFormData({
          store_name: saved.store_name || "",
          tagline: saved.tagline || "",
          address: saved.address || "",
          phone: saved.phone || "",
          tax_number: saved.tax_number || "",
          receipt_header: saved.receipt_header || "",
          receipt_footer: saved.receipt_footer || "",
          default_low_stock_threshold: Number(saved.default_low_stock_threshold),
          sound_enabled: Number(saved.sound_enabled),
          show_cashier_on_receipt: Number(saved.show_cashier_on_receipt)
        });
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
        className="mb-5 sm:mb-6"
        onDismiss={function () {
          setErrorMessage("");
        }}
      />
    );
  }

  let successBanner = null;
  if (successMessage) {
    successBanner = (
      <div className="mb-5 sm:mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>{successMessage}</span>
      </div>
    );
  }

  let previewTagline = null;
  if (formData.tagline) {
    previewTagline = <div className="text-2xs text-slate-500">{formData.tagline}</div>;
  }

  let previewAddress = null;
  if (formData.address) {
    previewAddress = <div className="text-2xs text-slate-500">{formData.address}</div>;
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
      <div className="text-2xs text-slate-500 space-y-0.5">
        {phoneRow}
        {taxRow}
      </div>
    );
  }

  let previewHeaderNote = null;
  if (formData.receipt_header) {
    previewHeaderNote = (
      <div className="text-2xs text-slate-600 italic pt-1">{formData.receipt_header}</div>
    );
  }

  let previewCashier = null;
  if (formData.show_cashier_on_receipt === 1) {
    let cashierName = "Staff";
    if (currentUser && (currentUser.full_name || currentUser.username)) {
      cashierName = currentUser.full_name || currentUser.username;
    }
    previewCashier = <div className="text-tiny text-slate-600">{"Cashier: " + cashierName}</div>;
  }

  let previewFooterNote = null;
  if (formData.receipt_footer) {
    previewFooterNote = (
      <div className="text-center border-t border-dashed border-slate-300 pt-2 mt-2 text-2xs text-slate-500">
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
        <div className="flex items-center gap-2.5">
          <Button
            type="submit"
            form="settings-form"
            variant="primary"
            disabled={loading || saving}
          >
            <Save className="h-4 w-4" />
            <span>{saveButtonText}</span>
          </Button>
        </div>
      </PageHeader>

      {errorBanner}
      {successBanner}

      <form id="settings-form" onSubmit={handleSave} className="space-y-5 sm:space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
          {/* Left Column: Profile, Preferences, Disaster Recovery */}
          <div className="space-y-5 sm:space-y-6 lg:col-span-7">
            {/* Section 1: Store Identity */}
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2.5 border-b border-[#F0F0F0] pb-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEEEED] text-[#151515]">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#151515]">Store Profile</h2>
                  <p className="text-xs text-[#737373]">
                    Business name and official contact info displayed across POS and printed receipts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Store Name *"
                    value={formData.store_name}
                    onChange={function (e) {
                      handleFieldChange("store_name", e.target.value);
                    }}
                    placeholder="e.g. Aling Nena Sari-Sari Store"
                    required={true}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    label="Tagline / Slogan"
                    value={formData.tagline}
                    onChange={function (e) {
                      handleFieldChange("tagline", e.target.value);
                    }}
                    placeholder="e.g. Quality goods & daily essentials"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    label="Phone / Mobile Number"
                    value={formData.phone}
                    onChange={function (e) {
                      handleFieldChange("phone", e.target.value);
                    }}
                    placeholder="e.g. 0917-123-4567"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    label="Tax Identification Number (TIN)"
                    value={formData.tax_number}
                    onChange={function (e) {
                      handleFieldChange("tax_number", e.target.value);
                    }}
                    placeholder="e.g. TIN: 123-456-789-000"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    label="Store Physical Address"
                    value={formData.address}
                    onChange={function (e) {
                      handleFieldChange("address", e.target.value);
                    }}
                    placeholder="e.g. 123 Rizal St., Brgy. San Antonio"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: POS & Inventory Preferences */}
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2.5 border-b border-[#F0F0F0] pb-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEEEED] text-[#151515]">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#151515]">POS & Inventory Preferences</h2>
                  <p className="text-xs text-[#737373]">
                    Configure global stock reorder thresholds and interactive feedback.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Input
                    label="Default Low Stock Threshold"
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    value={formData.default_low_stock_threshold}
                    onChange={function (e) {
                      handleFieldChange("default_low_stock_threshold", e.target.value);
                    }}
                    helper="Items with stock at or below this number trigger low-stock alerts."
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center pt-2 sm:pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
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
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-[#B9F36B]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#151515]">
                        <Volume2 className="h-3.5 w-3.5 text-slate-500" />
                        <span>Audio Feedback on Checkout</span>
                      </div>
                      <div className="text-tiny text-[#737373]">
                        Play subtle audio cue when scanning barcodes or completing transactions.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Database & Disaster Recovery */}
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2.5 border-b border-[#F0F0F0] pb-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEEEED] text-[#151515]">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#151515]">Database & Disaster Recovery</h2>
                  <p className="text-xs text-[#737373]">
                    Download a complete, offline-ready copy of your store's SQLite database.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-xs text-[#737373]">
                  <div className="font-medium text-[#151515]">
                    Single-File Complete Store Backup (.db)
                  </div>
                  <p>
                    Contains all inventory records, historical sales, customer credit accounts, and audit movements.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  onClick={handleDownloadBackup}
                  disabled={downloadingBackup}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4" />
                  <span>{downloadButtonText}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Receipt Customization & Thermal Printer Preview */}
          <div className="space-y-5 sm:space-y-6 lg:col-span-5">
            <div className="rounded-2xl border border-[#E9E9E9] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2.5 border-b border-[#F0F0F0] pb-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEEEED] text-[#151515]">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#151515]">Receipt & Thermal Printing</h2>
                  <p className="text-xs text-[#737373]">
                    Customize header notes, policy disclaimers, and staff visibility on receipts.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Receipt Header Note"
                  value={formData.receipt_header}
                  onChange={function (e) {
                    handleFieldChange("receipt_header", e.target.value);
                  }}
                  placeholder="e.g. Welcome! Thank you for shopping with us!"
                  helper="Appears right under store contact details."
                  disabled={loading}
                />

                <Input
                  label="Receipt Footer Note / Return Policy"
                  value={formData.receipt_footer}
                  onChange={function (e) {
                    handleFieldChange("receipt_footer", e.target.value);
                  }}
                  placeholder="e.g. Items sold subject to 7-day exchange policy."
                  helper="Appears at the very bottom of printed receipts."
                  disabled={loading}
                />

                <div className="pt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
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
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-[#B9F36B]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-[#151515]">Print Cashier Name</div>
                      <div className="text-tiny text-[#737373]">
                        Show staff member on the printed receipt.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Live Mini Thermal Receipt Preview */}
                <div className="pt-2">
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span>Thermal Receipt Preview</span>
                      <Printer className="h-3.5 w-3.5" />
                    </div>
                    <div className="mx-auto max-w-[240px] rounded-lg border border-slate-200 bg-white p-3 font-mono text-3xs text-slate-800 shadow-xs">
                      <div className="border-b border-dashed border-slate-300 pb-2 text-center space-y-0.5">
                        <div className="text-xs font-bold uppercase">
                          {formData.store_name || "STOREFLOW POS"}
                        </div>
                        {previewTagline}
                        {previewAddress}
                        {previewContact}
                        {previewHeaderNote}
                        <div className="pt-1 font-semibold">OR #000124</div>
                        <div className="text-slate-500">23 Nov 2026, 09:30 AM</div>
                        {previewCashier}
                      </div>

                      <div className="border-b border-dashed border-slate-300 py-2 space-y-1">
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
                        <div className="flex justify-between text-slate-600">
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

        {/* Bottom Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-6">
          <Button
            type="submit"
            variant="primary"
            disabled={loading || saving}
            className="px-6 py-2.5 font-semibold"
          >
            <Save className="h-4 w-4" />
            <span>{saveButtonText}</span>
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
