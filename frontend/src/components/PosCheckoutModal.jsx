import { useState } from "react";
import { Banknote, CreditCard, Wallet, UserPlus, AlertCircle } from "lucide-react";
import { api } from "../api.js";
import { formatPeso } from "../format.js";
import { Button } from "./Button.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";

export function PosCheckoutModal(props) {
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerLimit, setNewCustomerLimit] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");

  const customerList = props.customers || [];
  let selectedCustomer = null;
  for (let index = 0; index < customerList.length; index++) {
    if (customerList[index].customer_id === props.customerId) {
      selectedCustomer = customerList[index];
      break;
    }
  }

  let chargeAmount = 0;
  if (props.paymentMethod === "CREDIT") {
    chargeAmount = props.total;
  } else if (props.paymentMethod === "SPLIT") {
    const parsedCash = Number(props.cashPart);
    if (Number.isFinite(parsedCash) && parsedCash >= 0 && parsedCash <= props.total) {
      chargeAmount = Math.round((props.total - parsedCash) * 100) / 100;
    }
  }

  let projectedBalance = 0;
  let isCreditLimitExceeded = false;
  let limitExcessAmount = 0;
  let limitDisplay = "No limit";
  let remainingCreditDisplay = "Unlimited";

  if (selectedCustomer) {
    projectedBalance = Math.round((selectedCustomer.current_balance + chargeAmount) * 100) / 100;
    if (selectedCustomer.credit_limit !== null && selectedCustomer.credit_limit !== undefined) {
      limitDisplay = formatPeso(selectedCustomer.credit_limit);
      const remainingCredit = selectedCustomer.credit_limit - projectedBalance;
      if (projectedBalance > selectedCustomer.credit_limit) {
        isCreditLimitExceeded = true;
        limitExcessAmount = Math.round((projectedBalance - selectedCustomer.credit_limit) * 100) / 100;
      }
      remainingCreditDisplay = formatPeso(remainingCredit);
    }
  }

  async function handleCreateCustomer(event) {
    event.preventDefault();
    const trimmedName = newCustomerName.trim();
    if (trimmedName.length === 0) {
      setCustomerError("Customer name is required");
      return;
    }
    setSavingCustomer(true);
    setCustomerError("");
    try {
      const payload = {
        full_name: trimmedName
      };
      const trimmedPhone = newCustomerPhone.trim();
      if (trimmedPhone.length > 0) {
        payload.phone = trimmedPhone;
      }
      const trimmedLimit = newCustomerLimit.trim();
      if (trimmedLimit.length > 0) {
        payload.credit_limit = Number(trimmedLimit);
      }
      const created = await api.createCustomer(payload);
      if (props.onCustomerCreated) {
        props.onCustomerCreated(created);
      }
      props.onCustomerIdChange(created.customer_id);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerLimit("");
      setIsCreatingCustomer(false);
    } catch (error) {
      setCustomerError(error.message);
    } finally {
      setSavingCustomer(false);
    }
  }

  function cancelNewCustomer() {
    setIsCreatingCustomer(false);
    setCustomerError("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerLimit("");
  }

  let submitDisabled = false;
  if (props.submitting || savingCustomer) {
    submitDisabled = true;
  } else if (props.paymentMethod === "CASH") {
    const paid = Number(props.amountPaid);
    if (!Number.isFinite(paid) || paid < props.total) {
      submitDisabled = true;
    }
  } else if (props.paymentMethod === "CREDIT") {
    if (!props.customerId || props.customerId.trim().length === 0) {
      submitDisabled = true;
    } else if (isCreditLimitExceeded) {
      submitDisabled = true;
    }
  } else if (props.paymentMethod === "SPLIT") {
    const cashPartNum = Number(props.cashPart);
    const paidNum = Number(props.amountPaid);
    if (!props.customerId || props.customerId.trim().length === 0) {
      submitDisabled = true;
    } else if (!Number.isFinite(cashPartNum) || cashPartNum <= 0 || cashPartNum >= props.total) {
      submitDisabled = true;
    } else if (!Number.isFinite(paidNum) || paidNum < cashPartNum) {
      submitDisabled = true;
    } else if (isCreditLimitExceeded) {
      submitDisabled = true;
    }
  }

  const paymentMethods = [
    { key: "CASH", label: "Cash", icon: Banknote },
    { key: "CREDIT", label: "Utang", icon: CreditCard }
  ];

  let customerSection = null;
  if (props.paymentMethod !== "CASH") {
    if (isCreatingCustomer) {
      let customerErrorBanner = null;
      if (customerError.length > 0) {
        customerErrorBanner = (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {customerError}
          </div>
        );
      }

      customerSection = (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              New Customer Account
            </span>
          </div>
          {customerErrorBanner}
          <div className="space-y-2.5">
            <Input
              label="Full Name"
              value={newCustomerName}
              onChange={function onNameChange(event) {
                setNewCustomerName(event.target.value);
              }}
              placeholder="e.g. Mang Tomas"
              required={true}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Phone (Optional)"
                value={newCustomerPhone}
                onChange={function onPhoneChange(event) {
                  setNewCustomerPhone(event.target.value);
                }}
                placeholder="0917..."
              />
              <Input
                label="Credit Limit (₱)"
                type="number"
                step="1"
                min="0"
                value={newCustomerLimit}
                onChange={function onLimitChange(event) {
                  setNewCustomerLimit(event.target.value);
                }}
                placeholder="Blank = no limit"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={cancelNewCustomer}
              disabled={savingCustomer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCreateCustomer}
              disabled={savingCustomer}
            >
              Save Customer
            </Button>
          </div>
        </div>
      );
    } else {
      let selectedCustomerCard = null;
      if (selectedCustomer) {
        let phoneDisplay = "No contact number";
        if (selectedCustomer.phone) {
          phoneDisplay = selectedCustomer.phone;
        }

        let limitAlert = null;
        if (isCreditLimitExceeded) {
          limitAlert = (
            <div className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <span className="font-semibold">Exceeds Credit Limit:</span> Sale of {formatPeso(chargeAmount)} pushes balance to {formatPeso(projectedBalance)}, which exceeds the {limitDisplay} limit by {formatPeso(limitExcessAmount)}.
              </div>
            </div>
          );
        } else if (selectedCustomer.credit_limit !== null && selectedCustomer.credit_limit !== undefined) {
          limitAlert = (
            <div className="text-tiny text-emerald-700 font-medium">
              Remaining limit after sale: <span className="font-mono font-bold">{remainingCreditDisplay}</span>
            </div>
          );
        }

        selectedCustomerCard = (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">{selectedCustomer.full_name}</span>
                <span className="ml-2 text-tiny text-slate-500 font-mono">{phoneDisplay}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200/80">
              <div>
                <span className="text-slate-500">Current Utang: </span>
                <span className="font-mono font-bold text-slate-800">
                  {formatPeso(selectedCustomer.current_balance)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Credit Limit: </span>
                <span className="font-mono font-medium text-slate-700">
                  {limitDisplay}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/80">
              <span className="text-slate-600 font-medium">Projected New Utang:</span>
              <span className="font-mono font-bold text-blue-700 text-sm">
                {formatPeso(projectedBalance)}
              </span>
            </div>
            {limitAlert}
          </div>
        );
      }

      customerSection = (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Customer (Utang Account) <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={props.customerId}
              onChange={function onCustomerChange(event) {
                props.onCustomerIdChange(event.target.value);
              }}
              required={true}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="">— Select Customer —</option>
              {customerList.map(function renderCustomerOption(customer) {
                return (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.full_name} (Utang: {formatPeso(customer.current_balance)})
                  </option>
                );
              })}
            </select>
            <Button
              type="button"
              variant="secondary"
              onClick={function openNewCustomerForm() {
                setIsCreatingCustomer(true);
              }}
              className="shrink-0 text-xs gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>New</span>
            </Button>
          </div>
          {selectedCustomerCard}
        </div>
      );
    }
  }

  let splitCashSection = null;
  if (props.paymentMethod === "SPLIT") {
    const cashPartNumber = Number(props.cashPart);
    let creditPartCalculated = 0;
    if (Number.isFinite(cashPartNumber) && cashPartNumber >= 0 && cashPartNumber <= props.total) {
      creditPartCalculated = Math.round((props.total - cashPartNumber) * 100) / 100;
    }

    splitCashSection = (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Payment Breakdown
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={function setHalfSplit() {
              const half = Math.round((props.total / 2) * 100) / 100;
              props.onCashPartChange(String(half));
              props.onAmountPaidChange(String(half));
            }}
            className="text-2xs text-blue-600 hover:text-blue-700"
          >
            50/50 Split
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cash Portion (₱)"
            type="number"
            step="0.01"
            min="0.01"
            max={String(props.total)}
            value={props.cashPart}
            onChange={function onCashPartChange(event) {
              const val = event.target.value;
              props.onCashPartChange(val);
              props.onAmountPaidChange(val);
            }}
            required={true}
          />
          <div className="flex flex-col justify-end">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Utang Portion
            </span>
            <div className="flex h-11 items-center rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 font-mono text-sm font-bold text-amber-800">
              {formatPeso(creditPartCalculated)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  let cashTenderedSection = null;
  if (props.paymentMethod !== "CREDIT") {
    let cashTargetAmount = props.total;
    if (props.paymentMethod === "SPLIT") {
      const parsedPart = Number(props.cashPart);
      if (Number.isFinite(parsedPart) && parsedPart > 0) {
        cashTargetAmount = parsedPart;
      }
    }

    const quickBills = [
      { key: "exact", label: "Exact", amount: cashTargetAmount },
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
                type="button"
                variant="secondary"
                size="sm"
                onClick={function fillBill() {
                  props.onAmountPaidChange(String(bill.amount));
                }}
                className="font-mono text-xs"
              >
                {bill.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center justify-between rounded-lg border-2 border-emerald-200 bg-emerald-50/50 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-emerald-800">Change</span>
          <span className="font-mono text-xl font-bold text-emerald-700">
            {formatPeso(props.changePreview)}
          </span>
        </div>
      </div>
    );
  } else {
    cashTenderedSection = (
      <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-900">
            Total Charged to Utang
          </div>
          <div className="text-tiny text-blue-700 mt-0.5">
            Will be added to customer's ledger upon confirmation
          </div>
        </div>
        <span className="font-mono text-xl font-bold text-blue-800">
          {formatPeso(props.total)}
        </span>
      </div>
    );
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Complete Checkout"
      size="sm"
    >
      <form onSubmit={props.onSubmit} className="space-y-4">
        {/* Payment Method Switcher */}
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map(function renderMethodButton(method) {
            const Icon = method.icon;
            const isSelected = props.paymentMethod === method.key;
            let tabClass =
              "flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-medium cursor-pointer transition-colors ";
            if (isSelected) {
              tabClass = tabClass + "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-sm";
            } else {
              tabClass = tabClass + "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
            }
            return (
              <button
                key={method.key}
                type="button"
                onClick={function selectMethod() {
                  props.onPaymentMethodChange(method.key);
                }}
                className={tabClass}
              >
                <Icon className="h-4 w-4" />
                <span>{method.label}</span>
              </button>
            );
          })}
        </div>

        {/* Total Due Banner */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-200/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Due
          </span>
          <span className="font-mono text-xl font-bold text-slate-900">
            {formatPeso(props.total)}
          </span>
        </div>

        {/* Customer Utang Selection */}
        {customerSection}

        {/* Split Breakdown */}
        {splitCashSection}

        {/* Tendered / Change Section */}
        {cashTenderedSection}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={props.onClose}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitDisabled}
            className="flex-1 sm:flex-initial"
          >
            Confirm Sale
          </Button>
        </div>
      </form>
    </Modal>
  );
}
