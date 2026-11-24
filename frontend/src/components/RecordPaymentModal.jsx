import { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatPeso } from "../format.js";
import { Button } from "./Button.jsx";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { FormActions } from "./FormActions.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

export function RecordPaymentModal(props) {
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const customer = props.customer;

  useEffect(
    function resetForm() {
      if (!props.open) {
        return;
      }
      setAmount("");
      setRemarks("");
      setErrorMessage("");
    },
    [props.open, customer]
  );

  let currentBalance = 0;
  let customerName = "Customer";
  if (customer) {
    if (customer.full_name) {
      customerName = customer.full_name;
    }
    if (customer.current_balance !== undefined && customer.current_balance !== null) {
      currentBalance = customer.current_balance;
    }
  }

  const parsedAmount = Number(amount);
  let isAmountValid = false;
  if (!Number.isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= currentBalance) {
    isAmountValid = true;
  }

  let remainingBalance = currentBalance;
  if (isAmountValid) {
    remainingBalance = Math.round((currentBalance - parsedAmount) * 100) / 100;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!customer) {
      return;
    }
    if (!isAmountValid) {
      if (parsedAmount > currentBalance) {
        setErrorMessage("Payment amount cannot exceed outstanding balance (" + formatPeso(currentBalance) + ")");
      } else {
        setErrorMessage("Please enter a valid payment amount greater than zero");
      }
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    let createdBy = "cashier";
    if (props.currentUser && props.currentUser.username) {
      createdBy = props.currentUser.username;
    }

    try {
      const payload = {
        amount: parsedAmount,
        created_by: createdBy
      };
      const cleanRemarks = remarks.trim();
      if (cleanRemarks.length > 0) {
        payload.remarks = cleanRemarks;
      }

      const result = await api.recordPayment(customer.customer_id, payload);
      if (props.onPaymentRecorded) {
        props.onPaymentRecorded(result);
      }
      props.onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  let errorElement = null;
  if (errorMessage) {
    errorElement = <ErrorBanner message={errorMessage} className="mb-4" />;
  }

  let balanceStatusElement = null;
  if (isAmountValid) {
    if (remainingBalance === 0) {
      balanceStatusElement = (
        <span className="font-semibold text-emerald-600">₱0.00 (Fully Paid!)</span>
      );
    } else {
      balanceStatusElement = (
        <span className="font-semibold text-[#151515]">{formatPeso(remainingBalance)}</span>
      );
    }
  } else {
    balanceStatusElement = <span className="text-[#777777]">Enter amount above</span>;
  }

  let currentBalanceClass = "font-mono text-base font-bold text-[#151515]";
  if (currentBalance > 0) {
    currentBalanceClass = "font-mono text-base font-bold text-rose-600";
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="Record Utang Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorElement}

        {/* Customer Balance Summary Card */}
        <div className="rounded-xl border border-[#E9E9E9] bg-[#EEEEED]/40 p-4">
          <div className="text-xs font-medium text-[#777777]">Customer</div>
          <div className="text-base font-bold text-[#151515]">{customerName}</div>
          <div className="mt-3 flex items-center justify-between border-t border-[#E9E9E9] pt-3">
            <span className="text-xs text-[#777777]">Current Utang Balance:</span>
            <span className={currentBalanceClass}>
              {formatPeso(currentBalance)}
            </span>
          </div>
        </div>

        {/* Preset Payment Buttons */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#151515]">
            Quick Amount Presets
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={function selectFullBalance() {
                setAmount(String(currentBalance));
              }}
              disabled={currentBalance <= 0}
              className="rounded-full border border-[#151515] border-b-2 border-b-[#2B2B2B] bg-[#151515] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#262626] shadow-xs active:translate-y-[1px] active:shadow-none disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed disabled:active:translate-y-0 transition-all duration-100"
            >
              {"Full Balance (" + formatPeso(currentBalance) + ")"}
            </button>
            {PRESET_AMOUNTS.map(function renderPreset(preset) {
              const isExceeded = preset > currentBalance;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={function selectPreset() {
                    setAmount(String(preset));
                  }}
                  disabled={isExceeded}
                  className="rounded-full border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] bg-white px-3.5 py-1.5 text-xs font-medium text-[#151515] hover:bg-[#F9F9F8] shadow-xs active:translate-y-[1px] active:shadow-none disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed disabled:active:translate-y-0 transition-all duration-100"
                >
                  {"₱" + String(preset)}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Payment Amount (₱) *"
          type="number"
          step="0.01"
          min="0.01"
          max={String(currentBalance)}
          placeholder="0.00"
          value={amount}
          onChange={function handleAmountChange(event) {
            setAmount(event.target.value);
          }}
          required
        />

        {/* Live Remaining Balance Preview */}
        <div className="flex items-center justify-between rounded-xl border border-[#E9E9E9] bg-[#F5F5F4] px-3.5 py-2.5 text-xs">
          <span className="text-[#777777]">Balance After Payment:</span>
          <span className="font-mono text-sm">{balanceStatusElement}</span>
        </div>

        <Input
          label="Remarks / Notes (optional)"
          placeholder="e.g. Paid in cash by daughter"
          value={remarks}
          onChange={function handleRemarksChange(event) {
            setRemarks(event.target.value);
          }}
        />

        <FormActions
          onCancel={props.onClose}
          confirmLabel="Record Payment"
          disabled={submitting || !isAmountValid}
        />
      </form>
    </Modal>
  );
}
