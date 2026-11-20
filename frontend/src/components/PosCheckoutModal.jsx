import { formatPeso } from "../format.js";
import { Button } from "./Button.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";

export function PosCheckoutModal(props) {
  let customerField = null;
  if (props.paymentMethod !== "CASH") {
    customerField = (
      <Input
        label="Customer ID"
        value={props.customerId}
        onChange={function onCustomerChange(event) {
          props.onCustomerIdChange(event.target.value);
        }}
        placeholder="Enter customer ID"
        required={true}
      />
    );
  }

  let splitCashField = null;
  if (props.paymentMethod === "SPLIT") {
    splitCashField = (
      <Input
        label="Cash Portion (₱)"
        type="number"
        step="0.01"
        min="0.01"
        value={props.cashPart}
        onChange={function onCashPartChange(event) {
          props.onCashPartChange(event.target.value);
        }}
        required={true}
      />
    );
  }

  let cashTenderedSection = null;
  if (props.paymentMethod !== "CREDIT") {
    const quickBills = [
      { key: "exact", label: "Exact", amount: props.total },
      { key: "50", label: formatPeso(50), amount: 50 },
      { key: "100", label: formatPeso(100), amount: 100 },
      { key: "500", label: formatPeso(500), amount: 500 }
    ];

    cashTenderedSection = (
      <div className="space-y-3">
        <Input
          label="Cash Tendered (₱)"
          type="number"
          step="0.01"
          min="0"
          value={props.amountPaid}
          onChange={function onAmountChange(event) {
            props.onAmountPaidChange(event.target.value);
          }}
          required={true}
        />
        <div className="grid grid-cols-4 gap-2">
          {quickBills.map(function renderQuickBill(bill) {
            return (
              <Button
                key={bill.key}
                variant="secondary"
                size="sm"
                onClick={function fillBill() {
                  props.onAmountPaidChange(String(bill.amount));
                }}
                className="font-mono"
              >
                {bill.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <span className="text-xs font-medium text-slate-500">Change</span>
          <span className="font-mono text-base font-bold text-emerald-700">
            {formatPeso(props.changePreview)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={"Checkout — " + props.paymentMethod}
      size="sm"
    >
      <form onSubmit={props.onSubmit} className="space-y-5">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
          <span className="text-sm font-medium text-slate-600">Total Due</span>
          <span className="font-mono text-xl font-bold text-slate-900">
            {formatPeso(props.total)}
          </span>
        </div>
        {customerField}
        {splitCashField}
        {cashTenderedSection}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={props.submitting}>
            Confirm Sale
          </Button>
        </div>
      </form>
    </Modal>
  );
}
