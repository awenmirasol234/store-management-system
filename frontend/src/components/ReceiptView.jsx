import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { formatPeso, formatQuantity, formatSmartDateTime } from "../format.js";
import { Button } from "./Button.jsx";
import { api } from "../api.js";

export function ReceiptView(props) {
  const sale = props.sale;
  const items = props.items;
  const [internalSettings, setInternalSettings] = useState(props.storeSettings || null);

  useEffect(function syncSettings() {
    if (props.storeSettings) {
      setInternalSettings(props.storeSettings);
      return;
    }

    let isMounted = true;
    api.getSettings()
      .then(function (result) {
        let data = result;
        if (result && result.data) {
          data = result.data;
        }
        if (isMounted && data) {
          setInternalSettings(data);
        }
      })
      .catch(function () {
        // Fallback to default
      });

    return function cleanup() {
      isMounted = false;
    };
  }, [props.storeSettings]);

  if (!sale) {
    return null;
  }

  const settings = internalSettings;
  let storeName = "STOREFLOW POS";
  if (settings && settings.store_name) {
    storeName = settings.store_name;
  }

  let discountRow = null;
  if (sale.discount_amount > 0) {
    discountRow = (
      <div className="flex justify-between">
        <span>Discount</span>
        <span className="font-mono">-{formatPeso(sale.discount_amount)}</span>
      </div>
    );
  }

  let creditRow = null;
  if (sale.credit_amount > 0) {
    creditRow = (
      <div className="flex justify-between">
        <span>Credit (Utang)</span>
        <span className="font-mono">{formatPeso(sale.credit_amount)}</span>
      </div>
    );
  }

  let taglineElement = null;
  if (settings && settings.tagline) {
    taglineElement = <div className="text-2xs text-[#777777]">{settings.tagline}</div>;
  }

  let addressElement = null;
  if (settings && settings.address) {
    addressElement = <div className="text-2xs text-[#777777]">{settings.address}</div>;
  }

  let contactElement = null;
  if (settings && (settings.phone || settings.tax_number)) {
    let phoneRow = null;
    if (settings.phone) {
      phoneRow = <div>{"Tel: " + settings.phone}</div>;
    }
    let taxRow = null;
    if (settings.tax_number) {
      taxRow = <div>{"TIN: " + settings.tax_number}</div>;
    }
    contactElement = (
      <div className="text-2xs text-[#777777] space-y-0.5">
        {phoneRow}
        {taxRow}
      </div>
    );
  }

  let headerNoteElement = null;
  if (settings && settings.receipt_header) {
    headerNoteElement = (
      <div className="text-2xs text-[#151515] italic pt-1">{settings.receipt_header}</div>
    );
  }

  let cashierElement = null;
  let showCashier = true;
  if (settings && settings.show_cashier_on_receipt === 0) {
    showCashier = false;
  }
  if (showCashier) {
    let cashierName = "Staff";
    if (sale.cashier_name) {
      cashierName = sale.cashier_name;
    } else if (sale.created_by) {
      cashierName = sale.created_by;
    }
    cashierElement = <div className="text-tiny text-[#151515]">{"Cashier: " + cashierName}</div>;
  }

  let footerNoteElement = null;
  if (settings && settings.receipt_footer) {
    footerNoteElement = (
      <div className="text-center border-t border-dashed border-[#E9E9E9] pt-3 mt-3 text-2xs text-[#777777]">
        {settings.receipt_footer}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        id="thermal-receipt"
        className="mx-auto w-full max-w-[300px] rounded-xl border border-[#E9E9E9] bg-white p-5 font-mono text-xs text-[#151515]"
      >
        <div className="text-center border-b border-dashed border-[#E9E9E9] pb-3 mb-3 space-y-0.5">
          <div className="text-sm font-bold uppercase">{storeName}</div>
          {taglineElement}
          {addressElement}
          {contactElement}
          {headerNoteElement}
          <div className="pt-1 font-semibold">OR #{sale.receipt_number}</div>
          <div className="text-tiny text-[#777777]">{formatSmartDateTime(sale.created_at)}</div>
          {cashierElement}
        </div>

        <div className="space-y-2 border-b border-dashed border-[#E9E9E9] pb-3 mb-3">
          {items && items.map(function renderItem(item) {
            return (
              <div key={item.sale_item_id}>
                <div className="flex justify-between">
                  <span className="truncate pr-2">{item.option_name_snapshot}</span>
                  <span>{formatPeso(item.subtotal)}</span>
                </div>
                <div className="text-tiny text-[#777777]">
                  {formatQuantity(item.quantity)} x {formatPeso(item.unit_price)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPeso(sale.subtotal_amount)}</span>
          </div>
          {discountRow}
          <div className="flex justify-between text-sm font-bold border-t border-dashed border-[#E9E9E9] pt-2">
            <span>TOTAL</span>
            <span>{formatPeso(sale.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment</span>
            <span>{sale.payment_method}</span>
          </div>
          <div className="flex justify-between">
            <span>Cash Paid</span>
            <span>{formatPeso(sale.amount_paid)}</span>
          </div>
          {creditRow}
          <div className="flex justify-between font-bold">
            <span>Change</span>
            <span>{formatPeso(sale.change_amount)}</span>
          </div>
        </div>

        {footerNoteElement}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="primary"
          onClick={function printReceipt() {
            if (typeof window !== "undefined" && typeof window.print === "function") {
              window.print();
            }
          }}
        >
          <Printer className="h-4 w-4" />
          <span>Print Receipt</span>
        </Button>
      </div>
    </div>
  );
}
