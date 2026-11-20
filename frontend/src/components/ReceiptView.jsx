import { Printer } from "lucide-react";
import { formatPeso, formatQuantity, formatSmartDateTime } from "../format.js";
import { Button } from "./Button.jsx";

export function ReceiptView(props) {
  const sale = props.sale;
  const items = props.items;
  if (!sale) {
    return null;
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

  return (
    <div className="space-y-5">
      <div
        id="thermal-receipt"
        className="mx-auto w-full max-w-[300px] rounded-lg border border-slate-200 bg-white p-5 font-mono text-xs text-slate-900"
      >
        <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3 space-y-0.5">
          <div className="text-sm font-bold">STOREFLOW POS</div>
          <div>OR #{sale.receipt_number}</div>
          <div className="text-tiny text-slate-600">{formatSmartDateTime(sale.created_at)}</div>
        </div>

        <div className="space-y-2 border-b border-dashed border-slate-300 pb-3 mb-3">
          {items.map(function renderItem(item) {
            return (
              <div key={item.sale_item_id}>
                <div className="flex justify-between">
                  <span className="truncate pr-2">{item.option_name_snapshot}</span>
                  <span>{formatPeso(item.subtotal)}</span>
                </div>
                <div className="text-tiny text-slate-500">
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
          <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-300 pt-2">
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
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="primary"
          onClick={function printReceipt() {
            window.print();
          }}
        >
          <Printer className="h-4 w-4" />
          <span>Print Receipt</span>
        </Button>
      </div>
    </div>
  );
}
