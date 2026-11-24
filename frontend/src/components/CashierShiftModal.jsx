import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Plus,
  Wallet
} from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatSmartDateTime } from "../format.js";
import { Badge } from "./Badge.jsx";
import { Button } from "./Button.jsx";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";

const PRESET_OPENING_FUNDS = [0, 500, 1000, 2000];

export function CashierShiftModal(props) {
  const [mode, setMode] = useState("OVERVIEW");
  const [openingCashInput, setOpeningCashInput] = useState("1000");
  const [openingNotesInput, setOpeningNotesInput] = useState("");
  const [movementType, setMovementType] = useState("CASH_IN");
  const [movementAmountInput, setMovementAmountInput] = useState("");
  const [movementRemarksInput, setMovementRemarksInput] = useState("");
  const [actualCashInput, setActualCashInput] = useState("");
  const [closingNotesInput, setClosingNotesInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(
    function resetOnOpen() {
      if (props.open) {
        setMode("OVERVIEW");
        setErrorMessage("");
        setMovementAmountInput("");
        setMovementRemarksInput("");
        setActualCashInput("");
        setClosingNotesInput("");
        if (!props.activeShift) {
          setOpeningCashInput("1000");
          setOpeningNotesInput("");
        }
      }
    },
    [props.open, props.activeShift]
  );

  async function handleOpenShiftSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    const amount = Number(openingCashInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setErrorMessage("Starting change fund must be a valid non-negative amount.");
      return;
    }

    setSubmitting(true);
    try {
      await api.openShift({
        opening_cash: amount,
        notes: openingNotesInput
      });
      if (props.onShiftChange) {
        await props.onShiftChange();
      }
      props.onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordMovementSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    const amount = Number(movementAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Movement amount must be greater than zero.");
      return;
    }
    if (!movementRemarksInput.trim()) {
      setErrorMessage("Please enter a reason or remarks for this cash movement.");
      return;
    }

    setSubmitting(true);
    try {
      await api.recordCashMovement(props.activeShift.shift_id, {
        type: movementType,
        amount: amount,
        remarks: movementRemarksInput.trim()
      });
      if (props.onShiftChange) {
        await props.onShiftChange();
      }
      setMode("OVERVIEW");
      setMovementAmountInput("");
      setMovementRemarksInput("");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseShiftSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    const actual = Number(actualCashInput);
    if (!Number.isFinite(actual) || actual < 0) {
      setErrorMessage("Actual counted cash must be a valid non-negative amount.");
      return;
    }

    setSubmitting(true);
    try {
      await api.closeShift(props.activeShift.shift_id, {
        actual_cash: actual,
        notes: closingNotesInput
      });
      if (props.onShiftChange) {
        await props.onShiftChange();
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

  let modalContent = null;

  // 1. OPEN SHIFT FORM (No active shift)
  if (!props.activeShift) {
    modalContent = (
      <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
        {errorElement}

        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 leading-relaxed">
          Starting a shift begins cash drawer tracking. Enter your initial change fund to ensure
          accurate end-of-day cash reconciliation.
        </div>

        <div>
          <Input
            label="Starting Change Fund (₱)"
            type="number"
            step="0.01"
            min="0"
            value={openingCashInput}
            onChange={function (e) {
              setOpeningCashInput(e.target.value);
            }}
            placeholder="1000.00"
            required={true}
          />

          <div className="mt-2.5 flex flex-wrap gap-2">
            {PRESET_OPENING_FUNDS.map(function renderPreset(presetAmount) {
              const isSelected = Number(openingCashInput) === presetAmount;
              let buttonTone = "border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED] hover:text-[#171717]";
              if (isSelected) {
                buttonTone = "border-[#171717] bg-[#171717] text-white font-semibold";
              }
              return (
                <button
                  key={presetAmount}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={function () {
                    setOpeningCashInput(String(presetAmount));
                  }}
                  className={
                    "rounded-xl border px-3 py-1.5 text-xs font-mono transition cursor-pointer " +
                    buttonTone
                  }
                >
                  {formatPeso(presetAmount)}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Shift Notes (Optional)"
          value={openingNotesInput}
          onChange={function (e) {
            setOpeningNotesInput(e.target.value);
          }}
          placeholder="e.g. Morning counter shift"
        />

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            <Wallet className="h-4 w-4" />
            <span>Open Shift & Drawer</span>
          </Button>
        </div>
      </form>
    );
  } else if (mode === "MOVEMENT") {
    // 2. CASH MOVEMENT FORM
    let cashInSelected = movementType === "CASH_IN";
    let inButtonClass = "border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED]";
    if (cashInSelected) {
      inButtonClass = "border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold";
    }

    let outButtonClass = "border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED]";
    if (!cashInSelected) {
      outButtonClass = "border-rose-600 bg-rose-50 text-rose-700 font-semibold";
    }

    modalContent = (
      <form onSubmit={handleRecordMovementSubmit} className="space-y-4">
        {errorElement}

        <div className="text-xs text-[#777777]">
          Record cash added into or removed from the drawer during this shift.
        </div>

        <div>
          <span className="block text-xs font-medium text-[#171717] mb-1.5">
            Movement Type
          </span>
          <div role="group" aria-label="Movement Type" className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              aria-pressed={cashInSelected}
              onClick={function () {
                setMovementType("CASH_IN");
              }}
              className={
                "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs transition cursor-pointer " +
                inButtonClass
              }
            >
              <ArrowDownRight className="h-4 w-4 text-emerald-600" />
              <span>Cash In (Add Funds)</span>
            </button>
            <button
              type="button"
              aria-pressed={!cashInSelected}
              onClick={function () {
                setMovementType("CASH_OUT");
              }}
              className={
                "flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs transition cursor-pointer " +
                outButtonClass
              }
            >
              <ArrowUpRight className="h-4 w-4 text-rose-600" />
              <span>Cash Out (Drop / Payout)</span>
            </button>
          </div>
        </div>

        <Input
          label="Amount (₱)"
          type="number"
          step="0.01"
          min="0.01"
          value={movementAmountInput}
          onChange={function (e) {
            setMovementAmountInput(e.target.value);
          }}
          placeholder="e.g. 500.00"
          required={true}
        />

        <Input
          label="Reason / Remarks"
          value={movementRemarksInput}
          onChange={function (e) {
            setMovementRemarksInput(e.target.value);
          }}
          placeholder="e.g. Paid delivery rider, petty cash ice, change topup"
          required={true}
        />

        <div className="flex justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={function () {
              setMode("OVERVIEW");
            }}
          >
            Back
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            Record Movement
          </Button>
        </div>
      </form>
    );
  } else if (mode === "CLOSE") {
    // 3. CLOSE SHIFT & RECONCILIATION FORM
    const summary = props.activeShift.summary || {};
    let expectedCash = 0;
    if (summary.expected_cash !== undefined && summary.expected_cash !== null) {
      expectedCash = summary.expected_cash;
    } else if (props.activeShift.expected_cash !== undefined && props.activeShift.expected_cash !== null) {
      expectedCash = props.activeShift.expected_cash;
    }

    let varianceElement = null;
    if (actualCashInput.trim() !== "") {
      const counted = Number(actualCashInput);
      if (Number.isFinite(counted)) {
        const variance = Math.round((counted - expectedCash) * 100) / 100;
        let tone = "green";
        let label = "Balanced (Exact)";
        if (variance < 0) {
          tone = "red";
          label = "Shortage: " + formatPeso(Math.abs(variance));
        } else if (variance > 0) {
          tone = "blue";
          label = "Overage: +" + formatPeso(variance);
        }
        varianceElement = (
          <div className="rounded-xl border border-[#E9E9E9] bg-[#EEEEED]/40 p-3 flex items-center justify-between">
            <span className="text-2xs font-medium text-[#777777]">Calculated Variance</span>
            <Badge tone={tone}>{label}</Badge>
          </div>
        );
      }
    }

    modalContent = (
      <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
        {errorElement}

        <div className="rounded-xl border border-[#E9E9E9] bg-[#EEEEED]/40 p-3.5 space-y-1">
          <div className="text-2xs font-medium text-[#777777]">Expected Cash in Drawer</div>
          <div className="text-xl font-bold font-mono text-[#171717]">
            {formatPeso(expectedCash)}
          </div>
        </div>

        <Input
          label="Actual Counted Cash in Drawer (₱)"
          type="number"
          step="0.01"
          min="0"
          value={actualCashInput}
          onChange={function (e) {
            setActualCashInput(e.target.value);
          }}
          placeholder="Count all banknotes and coins"
          required={true}
        />

        {varianceElement}

        <Input
          label="Closing Remarks / Variance Notes (Optional)"
          value={closingNotesInput}
          onChange={function (e) {
            setClosingNotesInput(e.target.value);
          }}
          placeholder="e.g. Small coin roundoff difference"
        />

        <div className="flex justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={function () {
              setMode("OVERVIEW");
            }}
          >
            Back
          </Button>
          <Button type="submit" variant="danger" disabled={submitting}>
            Confirm & Close Shift
          </Button>
        </div>
      </form>
    );
  } else {
    // 4. ACTIVE SHIFT OVERVIEW
    const shift = props.activeShift;
    const summary = shift.summary || {};
    let openingCash = shift.opening_cash;
    let cashSales = summary.cash_sales || 0;
    let utangCollected = summary.cash_utang_payments || 0;
    let cashIn = summary.cash_in || 0;
    let cashOut = summary.cash_out || 0;
    let cashRefunds = summary.cash_refunds || 0;
    let expectedCash = summary.expected_cash;
    if (expectedCash === undefined || expectedCash === null) {
      expectedCash = openingCash + cashSales + utangCollected + cashIn - cashOut - cashRefunds;
    }

    modalContent = (
      <div className="space-y-4">
        {errorElement}

        {/* Shift Header Status */}
        <div className="flex items-center justify-between rounded-xl border border-[#E9E9E9] bg-[#EEEEED] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171717] text-white">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#171717]">
                Active Cashier Drawer
              </div>
              <div className="text-2xs text-[#777777]">
                Opened {formatSmartDateTime(shift.opened_at)}
              </div>
            </div>
          </div>
          <Badge tone="green">OPEN</Badge>
        </div>

        {/* Big Expected Balance Card */}
        <div className="rounded-2xl border border-[#E9E9E9] bg-[#F5F5F4] p-4 text-center">
          <div className="text-2xs font-semibold uppercase tracking-wider text-[#777777]">
            Expected Cash in Drawer
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#171717] sm:text-3xl">
            {formatPeso(expectedCash)}
          </div>
          <div className="mt-1 text-3xs text-[#777777]">
            Current calculated drawer balance based on sales and cash events
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-xl border border-[#E9E9E9] bg-white p-2.5">
            <div className="text-3xs text-[#777777] font-medium">Starting Fund</div>
            <div className="font-mono font-semibold text-[#171717]">
              {formatPeso(openingCash)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E9E9E9] bg-white p-2.5">
            <div className="text-3xs text-[#777777] font-medium">Cash Sales</div>
            <div className="font-mono font-semibold text-emerald-600">
              {"+" + formatPeso(cashSales)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E9E9E9] bg-white p-2.5">
            <div className="text-3xs text-[#777777] font-medium">Utang Collected</div>
            <div className="font-mono font-semibold text-emerald-600">
              {"+" + formatPeso(utangCollected)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E9E9E9] bg-white p-2.5">
            <div className="text-3xs text-[#777777] font-medium">Cash In (Topups)</div>
            <div className="font-mono font-semibold text-[#171717]">
              {"+" + formatPeso(cashIn)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E9E9E9] bg-white p-2.5">
            <div className="text-3xs text-[#777777] font-medium">Cash Out (Payouts)</div>
            <div className="font-mono font-semibold text-rose-600">
              {"-" + formatPeso(cashOut)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E9E9E9] bg-white p-2.5">
            <div className="text-3xs text-[#777777] font-medium">Cash Refunds</div>
            <div className="font-mono font-semibold text-rose-600">
              {"-" + formatPeso(cashRefunds)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={function () {
              setMode("MOVEMENT");
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Add Cash In / Out</span>
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={function () {
              setMode("CLOSE");
            }}
          >
            <span>End Shift & Reconcile</span>
          </Button>
        </div>
      </div>
    );
  }

  let modalTitle = "Cash Drawer & Shifts";
  if (!props.activeShift) {
    modalTitle = "Start Shift & Open Drawer";
  } else if (mode === "MOVEMENT") {
    modalTitle = "Record Cash Movement";
  } else if (mode === "CLOSE") {
    modalTitle = "End Shift & Drawer Reconciliation";
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title={modalTitle} size="md">
      {modalContent}
    </Modal>
  );
}
