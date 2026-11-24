import { useState } from "react";
import { UserPlus, AlertCircle } from "lucide-react";
import { api } from "../api.js";
import { formatPeso } from "../format.js";
import { Button } from "./Button.jsx";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";
import { PaymentMethodToggle } from "./PaymentMethodToggle.jsx";
import { Select } from "./Select.jsx";

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

  let customerSection = null;
  if (props.paymentMethod !== "CASH") {
    if (isCreatingCustomer) {
      let customerErrorBanner = null;
      if (customerError.length > 0) {
        customerErrorBanner = <ErrorBanner message={customerError} />;
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
          <div className="rounded-xl border border-[#E9E9E9] bg-[#EEEEED]/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#151515]">{selectedCustomer.full_name}</span>
                <span className="ml-2 text-tiny text-[#777777] font-mono">{phoneDisplay}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-[#E9E9E9]">
              <div>
                <span className="text-[#777777]">Current Utang: </span>
                <span className="font-mono font-bold text-[#151515]">
                  {formatPeso(selectedCustomer.current_balance)}
                </span>
              </div>
              <div>
                <span className="text-[#777777]">Credit Limit: </span>
                <span className="font-mono font-medium text-[#151515]">
                  {limitDisplay}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#E9E9E9]">
              <span className="text-[#777777] font-medium">Projected New Utang:</span>
              <span className="font-mono font-bold text-[#151515] text-sm">
                {formatPeso(projectedBalance)}
              </span>
            </div>
            {limitAlert}
          </div>
        );
      }

      customerSection = (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#151515]">
            Customer (Utang Account) <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <Select
              className="flex-1"
              value={props.customerId}
              onChange={function onCustomerChange(event) {
                props.onCustomerIdChange(event.target.value);
              }}
              required={true}
            >
              <option value="">— Select Customer —</option>
              {customerList.map(function renderCustomerOption(customer) {
                return (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.full_name} (Utang: {formatPeso(customer.current_balance)})
                  </option>
                );
              })}
            </Select>
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
      <div className="space-y-3 rounded-xl border border-[#E9E9E9] bg-[#EEEEED]/40 p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#151515]">
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
            <span className="block text-xs font-semibold uppercase tracking-wider text-[#151515] mb-1.5">
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
      { key: "200", label: formatPeso(200), amount: 200 },
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
        <div className="grid grid-cols-3 gap-2">
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
                className="font-mono text-xs justify-center"
              >
                {bill.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[#B9F36B] bg-[#B9F36B]/15 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#151515]">Change</span>
          <span className="font-mono text-xl font-bold text-[#151515]">
            {formatPeso(props.changePreview)}
          </span>
        </div>
      </div>
    );
  } else {
    let customerBalanceDisplay = "—";
    let projectedUtangDisplay = formatPeso(props.total);
    if (selectedCustomer) {
      customerBalanceDisplay = formatPeso(selectedCustomer.current_balance);
      projectedUtangDisplay = formatPeso(projectedBalance);
    }

    cashTenderedSection = (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-[#E9E9E9] bg-[#EEEEED] p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#151515]">
              Total Charged to Utang
            </div>
            <div className="text-tiny text-[#777777] mt-0.5">
              Will be added to customer's ledger upon confirmation
            </div>
          </div>
          <span className="font-mono text-xl font-bold text-[#151515]">
            {formatPeso(props.total)}
          </span>
        </div>

        <div className="rounded-xl border border-[#E9E9E9] bg-white p-4 space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#151515]">
            Utang Settlement Overview
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#777777]">Current Balance:</span>
              <span className="font-mono font-medium text-[#151515]">
                {customerBalanceDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#777777]">Sale Charge:</span>
              <span className="font-mono font-bold text-[#151515]">
                +{formatPeso(props.total)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#E9E9E9]">
              <span className="font-semibold text-[#151515]">Projected New Utang:</span>
              <span className="font-mono text-sm font-bold text-[#151515]">
                {projectedUtangDisplay}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let cashInfoCard = null;
  if (props.paymentMethod === "CASH") {
    cashInfoCard = (
      <div className="rounded-xl border border-[#E9E9E9] bg-white p-3.5 space-y-1.5 text-xs text-[#777777]">
        <div className="font-semibold text-[#151515]">Cash Transaction</div>
        <div className="leading-relaxed">
          Enter the cash amount received or select a quick banknote preset to calculate customer change.
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Complete Checkout"
      size="xl"
    >
      <form onSubmit={props.onSubmit} className="space-y-5">
        <ErrorBanner message={props.errorMessage} />
        {/* Payment Method Switcher */}
        <PaymentMethodToggle
          paymentMethod={props.paymentMethod}
          onChange={props.onPaymentMethodChange}
        />

        {/* Balanced Responsive Two-Column Cockpit Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* Left Column: Transaction Summary & Customer Context */}
          <div className="space-y-4">
            {/* Total Due Banner */}
            <div className="flex flex-col justify-between rounded-xl bg-[#F5F5F4] p-4 border border-[#E9E9E9] gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#777777]">
                  Total Due
                </span>
                <span className="text-2xs font-medium text-[#777777]">Philippine Peso (PHP)</span>
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-[#151515]">
                {formatPeso(props.total)}
              </div>
            </div>

            {/* Customer Utang Selection */}
            {customerSection}

            {cashInfoCard}
          </div>

          {/* Right Column: Tender & Settlement */}
          <div className="space-y-4">
            {/* Split Breakdown */}
            {splitCashSection}

            {/* Tendered / Change Section */}
            {cashTenderedSection}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E9E9E9]">
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
