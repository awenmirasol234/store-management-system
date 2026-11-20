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
      { key: "500", label: formatPeso(500), amount: 500 },
      { key: "1000", label: formatPeso(1000), amount: 1000 }
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
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
        <div className="flex items-center justify-between rounded-lg border-2 border-emerald-200 bg-emerald-50/50 px-4 py-3.5">
          <span className="text-xs font-bold uppercase tracking-wide text-emerald-800">Change</span>
          <span className="font-mono text-xl font-bold text-emerald-700">
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
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={props.onClose} className="flex-1 sm:flex-initial">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={props.submitting} className="flex-1 sm:flex-initial">
            Confirm Sale
          </Button>
        </div>
      </form>
    </Modal>
  );
}
