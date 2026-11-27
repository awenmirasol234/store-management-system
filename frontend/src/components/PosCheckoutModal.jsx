import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Search, UserPlus, X } from "lucide-react";
import { evaluateCashTendered, getSmartCashPresets } from "../cart.js";
import { formatPeso, formatQuantity } from "../format.js";
import { Button } from "./Button.jsx";
import { saveCustomerRecord } from "./CustomerModal.jsx";
import { ErrorBanner } from "./ErrorBanner.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";
import { PaymentMethodToggle } from "./PaymentMethodToggle.jsx";

export function PosCheckoutModal(props) {
  const formId = useId();
  const comboboxId = useId();
  const listboxId = comboboxId + "-listbox";

  const [showAllItems, setShowAllItems] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerLimit, setNewCustomerLimit] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");

  const cashReceivedRef = useRef(null);
  const customerInputRef = useRef(null);
  const newCustomerNameRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const comboboxContainerRef = useRef(null);
  const prevMethodRef = useRef(props.paymentMethod);

  const customerList = props.customers || [];
  let selectedCustomer = null;
  for (let index = 0; index < customerList.length; index++) {
    if (customerList[index].customer_id === props.customerId) {
      selectedCustomer = customerList[index];
      break;
    }
  }

  useEffect(
    function resetOnOpenChange() {
      if (!props.open) {
        setShowAllItems(false);
        setDropdownOpen(false);
        setCustomerQuery("");
        setHighlightedIndex(0);
        setIsCreatingCustomer(false);
        setCustomerError("");
        setNewCustomerName("");
        setNewCustomerPhone("");
        setNewCustomerLimit("");
      }
      prevMethodRef.current = props.paymentMethod;
    },
    [props.open]
  );

  useEffect(
    function syncQueryToSelectedCustomer() {
      if (selectedCustomer && !dropdownOpen && !isCreatingCustomer) {
        setCustomerQuery(selectedCustomer.full_name);
      } else if (!props.customerId && !dropdownOpen && !isCreatingCustomer) {
        setCustomerQuery("");
      }
    },
    [props.customerId, selectedCustomer, dropdownOpen, isCreatingCustomer]
  );

  useEffect(
    function focusOnMethodChange() {
      if (!props.open) {
        return;
      }
      if (prevMethodRef.current === props.paymentMethod) {
        return;
      }
      prevMethodRef.current = props.paymentMethod;
      setIsCreatingCustomer(false);
      setCustomerError("");
      setDropdownOpen(false);

      if (props.paymentMethod === "CASH") {
        if (cashReceivedRef.current) {
          cashReceivedRef.current.focus();
          if (typeof cashReceivedRef.current.select === "function") {
            cashReceivedRef.current.select();
          }
        }
      } else if (!props.customerId || props.customerId.trim().length === 0) {
        if (customerInputRef.current) {
          customerInputRef.current.focus();
        }
      }
    },
    [props.open, props.paymentMethod, props.customerId]
  );

  useEffect(
    function focusInlineCustomerName() {
      if (props.open && isCreatingCustomer && newCustomerNameRef.current) {
        newCustomerNameRef.current.focus();
      }
    },
    [props.open, isCreatingCustomer]
  );

  useEffect(
    function bindComboboxOutsideClick() {
      if (!dropdownOpen) {
        return;
      }
      function handlePointerDown(event) {
        if (comboboxContainerRef.current && !comboboxContainerRef.current.contains(event.target)) {
          setDropdownOpen(false);
          if (selectedCustomer) {
            setCustomerQuery(selectedCustomer.full_name);
          }
        }
      }
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
      return function cleanup() {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
      };
    },
    [dropdownOpen, selectedCustomer]
  );

  const itemList = props.items || [];
  let totalUnitsCount = 0;
  for (let index = 0; index < itemList.length; index++) {
    const qty = Number(itemList[index].quantity);
    if (Number.isFinite(qty) && qty > 0) {
      totalUnitsCount = totalUnitsCount + qty;
    } else {
      totalUnitsCount = totalUnitsCount + 1;
    }
  }

  let itemCountLabel = formatQuantity(totalUnitsCount) + " items";
  if (totalUnitsCount === 1) {
    itemCountLabel = "1 item";
  }

  const hasMoreItems = itemList.length > 3;
  let visibleItems = itemList;
  if (hasMoreItems && !showAllItems) {
    visibleItems = itemList.slice(0, 3);
  }

  const discountNumber = Number(props.discount);
  const subtotalNumber = Number(props.subtotal);
  const hasDiscount = Number.isFinite(discountNumber) && discountNumber > 0 && Number.isFinite(subtotalNumber);

  const cashEvaluation = evaluateCashTendered(props.amountPaid, props.total);
  const cashPresets = getSmartCashPresets(props.total);

  const normalizedCustomerQuery = customerQuery.trim().toLowerCase();
  const filteredCustomers = [];
  for (let index = 0; index < customerList.length; index++) {
    const customer = customerList[index];
    if (normalizedCustomerQuery.length === 0) {
      filteredCustomers.push(customer);
    } else {
      const matchesName = String(customer.full_name || "").toLowerCase().includes(normalizedCustomerQuery);
      const matchesPhone = String(customer.phone || "").toLowerCase().includes(normalizedCustomerQuery);
      if (matchesName || matchesPhone) {
        filteredCustomers.push(customer);
      }
    }
  }

  let projectedBalance = 0;
  let isCreditLimitExceeded = false;
  let limitExcessAmount = 0;
  let limitDisplay = "No limit";
  if (selectedCustomer) {
    projectedBalance = Math.round((selectedCustomer.current_balance + props.total) * 100) / 100;
    if (selectedCustomer.credit_limit !== null && selectedCustomer.credit_limit !== undefined) {
      limitDisplay = formatPeso(selectedCustomer.credit_limit);
      if (projectedBalance > selectedCustomer.credit_limit) {
        isCreditLimitExceeded = true;
        limitExcessAmount = Math.round((projectedBalance - selectedCustomer.credit_limit) * 100) / 100;
      }
    }
  }

  const hasCustomerSelected = Boolean(props.customerId && props.customerId.trim().length > 0);

  let submitDisabled = false;
  if (props.submitting || savingCustomer || isCreatingCustomer) {
    submitDisabled = true;
  } else if (props.paymentMethod === "CASH") {
    if (cashEvaluation.status !== "sufficient") {
      submitDisabled = true;
    }
  } else if (!hasCustomerSelected || isCreditLimitExceeded) {
    submitDisabled = true;
  }

  function openInlineCreateCustomer(prefillName) {
    setDropdownOpen(false);
    setCustomerError("");
    let initialName = "";
    if (prefillName && (!selectedCustomer || prefillName.toLowerCase() !== selectedCustomer.full_name.toLowerCase())) {
      initialName = prefillName;
    }
    setNewCustomerName(initialName);
    setNewCustomerPhone("");
    setNewCustomerLimit("");
    setIsCreatingCustomer(true);
  }

  function cancelNewCustomer() {
    setIsCreatingCustomer(false);
    setCustomerError("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerLimit("");
    if (customerInputRef.current) {
      customerInputRef.current.focus();
    }
  }

  async function handleCreateCustomer(event) {
    if (event) {
      event.preventDefault();
    }
    if (savingCustomer) {
      return;
    }
    setSavingCustomer(true);
    setCustomerError("");
    try {
      const created = await saveCustomerRecord({
        fullName: newCustomerName,
        phone: newCustomerPhone,
        creditLimit: newCustomerLimit
      });
      if (props.onCustomerCreated) {
        props.onCustomerCreated(created);
      }
      if (props.onCustomerIdChange) {
        props.onCustomerIdChange(created.customer_id);
      }
      setCustomerQuery(created.full_name);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerLimit("");
      setIsCreatingCustomer(false);
      setTimeout(function focusConfirm() {
        if (confirmButtonRef.current && !confirmButtonRef.current.disabled) {
          confirmButtonRef.current.focus();
        }
      }, 0);
    } catch (error) {
      setCustomerError(error.message);
    } finally {
      setSavingCustomer(false);
    }
  }

  function handleInlineCustomerKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (!savingCustomer && newCustomerName.trim().length > 0) {
        handleCreateCustomer(null);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelNewCustomer();
    }
  }

  function selectCustomer(customer) {
    if (props.onCustomerIdChange) {
      props.onCustomerIdChange(customer.customer_id);
    }
    setCustomerQuery(customer.full_name);
    setDropdownOpen(false);
    const nextProjected = Math.round((customer.current_balance + props.total) * 100) / 100;
    const overLimit =
      customer.credit_limit !== null &&
      customer.credit_limit !== undefined &&
      nextProjected > customer.credit_limit;
    if (!overLimit) {
      setTimeout(function focusConfirm() {
        if (confirmButtonRef.current && !confirmButtonRef.current.disabled) {
          confirmButtonRef.current.focus();
        }
      }, 0);
    }
  }

  const totalComboboxOptions = filteredCustomers.length + 1;

  function handleComboboxKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!dropdownOpen) {
        setDropdownOpen(true);
        setHighlightedIndex(0);
        return;
      }
      setHighlightedIndex((highlightedIndex + 1) % totalComboboxOptions);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!dropdownOpen) {
        setDropdownOpen(true);
        setHighlightedIndex(totalComboboxOptions - 1);
        return;
      }
      setHighlightedIndex((highlightedIndex - 1 + totalComboboxOptions) % totalComboboxOptions);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (dropdownOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredCustomers.length) {
          selectCustomer(filteredCustomers[highlightedIndex]);
        } else {
          openInlineCreateCustomer(customerQuery.trim());
        }
      } else if (hasCustomerSelected && !submitDisabled && confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      } else {
        setDropdownOpen(true);
      }
    } else if (event.key === "Escape") {
      if (dropdownOpen) {
        event.preventDefault();
        event.stopPropagation();
        setDropdownOpen(false);
        if (selectedCustomer) {
          setCustomerQuery(selectedCustomer.full_name);
        }
      }
    }
  }

  function handleCashKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (cashEvaluation.status === "sufficient" && confirmButtonRef.current && !confirmButtonRef.current.disabled) {
        confirmButtonRef.current.focus();
      }
    }
  }

  function handleFormSubmit(event) {
    if (submitDisabled) {
      event.preventDefault();
      return;
    }
    if (props.onSubmit) {
      props.onSubmit(event);
    }
  }

  let productListClass = "divide-y divide-[#E9E9E9]";
  if (showAllItems) {
    productListClass = productListClass + " max-h-44 sm:max-h-none sm:flex-1 sm:min-h-0 overflow-y-auto pr-1";
  } else {
    productListClass = productListClass + " max-h-44 sm:max-h-none overflow-y-auto sm:overflow-visible";
  }

  let viewMoreButton = null;
  if (hasMoreItems) {
    let toggleLabel = "View more items (" + String(itemList.length - 3) + " more)";
    if (showAllItems) {
      toggleLabel = "Show fewer items";
    }
    viewMoreButton = (
      <button
        type="button"
        onClick={function toggleItems() {
          setShowAllItems(!showAllItems);
        }}
        className="mt-1.5 text-xs font-medium text-[#171717] underline underline-offset-2 hover:text-[#777777] cursor-pointer"
      >
        {toggleLabel}
      </button>
    );
  }

  let discountRows = null;
  if (hasDiscount) {
    discountRows = (
      <div className="space-y-1 border-t border-[#E9E9E9] pt-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#777777]">Subtotal</span>
          <span className="font-mono text-[#171717]">{formatPeso(subtotalNumber)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#777777]">Discount</span>
          <span className="font-mono font-medium text-[#171717]">
            {"-" + formatPeso(discountNumber)}
          </span>
        </div>
      </div>
    );
  }

  const leftOrderSummary = (
    <section
      aria-label="Order Summary"
      className="flex min-h-0 flex-col justify-between gap-3 rounded-2xl border border-[#E9E9E9] bg-[#FAFAFA] p-4"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-[#E9E9E9] pb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
            Order Summary
          </h3>
          <span className="font-mono text-xs text-[#777777]">{itemCountLabel}</span>
        </div>

        {itemList.length === 0 ? (
          <p className="py-4 text-xs text-[#777777]">No items in current sale.</p>
        ) : (
          <div className={productListClass}>
            {visibleItems.map(function renderItem(item, index) {
              let itemKey = String(index);
              if (item.key) {
                itemKey = item.key;
              } else if (item.product_id) {
                itemKey = item.product_id + "-" + String(index);
              }
              const qty = Number(item.quantity) || 1;
              const unitPrice = Number(item.unit_price) || 0;
              const lineTotal = Math.round(unitPrice * qty * 100) / 100;

              let rowTitle = formatQuantity(qty) + " × " + item.product_name;
              if (item.custom_amount !== null && item.custom_amount !== undefined) {
                rowTitle = item.product_name;
              }

              return (
                <div key={itemKey} className="flex items-start justify-between gap-3 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[#171717]">{rowTitle}</div>
                    {item.option_label && (item.option_id || item.custom_amount !== null) && (
                      <div className="truncate text-2xs text-[#777777]">{item.option_label}</div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono font-semibold text-[#171717]">
                    {formatPeso(lineTotal)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {viewMoreButton}
      </div>

      <div className="mt-auto space-y-2.5">
        {discountRows}
        <div className="flex items-center justify-between rounded-xl bg-[#F2F2F2] px-3.5 py-3">
          <span className="text-sm font-semibold text-[#171717]">Total Due</span>
          <span className="font-mono text-2xl font-bold text-[#171717]">
            {formatPeso(props.total)}
          </span>
        </div>
      </div>
    </section>
  );

  let paymentBody = null;
  if (props.paymentMethod === "CASH") {
    let cashSummaryBox = (
      <div
        role="status"
        className="rounded-xl border border-[#E9E9E9] bg-[#F5F5F4] px-4 py-3 text-xs text-[#777777]"
      >
        Enter cash received or select a preset to calculate change.
      </div>
    );

    if (cashEvaluation.status === "invalid") {
      cashSummaryBox = (
        <div
          role="status"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
        >
          {cashEvaluation.errorMessage}
        </div>
      );
    } else if (cashEvaluation.status === "short") {
      cashSummaryBox = (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Amount Short
          </span>
          <span className="font-mono text-lg font-bold text-amber-800">
            {formatPeso(cashEvaluation.shortAmount)}
          </span>
        </div>
      );
    } else if (cashEvaluation.status === "sufficient") {
      cashSummaryBox = (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-[#B9F36B] bg-[#F4FBE9] px-4 py-3"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-[#171717]">
            Change
          </span>
          <span className="font-mono text-xl font-bold text-[#171717]">
            {formatPeso(cashEvaluation.changeAmount)}
          </span>
        </div>
      );
    }

    let inputBorderClass = "border-[#E9E9E9] focus:border-[#171717] focus:ring-[#B9F36B]/30";
    if (cashEvaluation.status === "invalid") {
      inputBorderClass = "border-[#E0533C] focus:border-[#E0533C] focus:ring-[#E0533C]/20";
    }

    const cashInputId = formId + "-cash-received";

    paymentBody = (
      <div className="flex flex-1 flex-col justify-between gap-3.5">
        <div className="space-y-3.5">
          <div>
            <label htmlFor={cashInputId} className="mb-1.5 block text-xs font-medium text-[#171717]">
              Cash Received
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-lg font-semibold text-[#777777]">
                ₱
              </span>
              <input
                id={cashInputId}
                ref={cashReceivedRef}
                type="text"
                inputMode="decimal"
                data-autofocus=""
                aria-invalid={cashEvaluation.status === "invalid"}
                value={props.amountPaid}
                onChange={function onAmountChange(event) {
                  props.onAmountPaidChange(event.target.value);
                }}
                onKeyDown={handleCashKeyDown}
                placeholder="0.00"
                className={
                  "w-full rounded-xl border bg-white py-2.5 pl-8 pr-3.5 font-mono text-lg font-semibold text-[#171717] placeholder:text-[#777777] focus:outline-none focus:ring-2 transition-colors " +
                  inputBorderClass
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick cash presets">
            {cashPresets.map(function renderPreset(preset) {
              const isMatching =
                cashEvaluation.amount !== null &&
                Math.abs(cashEvaluation.amount - preset.amount) < 0.005;
              let presetClass =
                "flex-1 min-w-[72px] rounded-xl border px-3 py-2 font-mono text-xs transition-colors cursor-pointer ";
              if (isMatching) {
                presetClass =
                  presetClass + "border-[#171717] bg-[#171717] text-white font-semibold shadow-xs";
              } else {
                presetClass =
                  presetClass +
                  "btn-glossy btn-glossy-secondary border-[#E9E9E9] bg-white text-[#171717] font-medium hover:bg-[#EEEEED]";
              }
              return (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={isMatching}
                  onClick={function applyPreset() {
                    props.onAmountPaidChange(preset.amount.toFixed(2));
                  }}
                  className={presetClass}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {cashSummaryBox}
      </div>
    );
  } else if (isCreatingCustomer) {
    let customerErrorBanner = null;
    if (customerError.length > 0) {
      customerErrorBanner = <ErrorBanner message={customerError} />;
    }

    paymentBody = (
      <div className="flex flex-1 flex-col justify-between gap-3 rounded-xl border border-[#E9E9E9] bg-[#F5F5F4] p-3.5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
              New Customer Account
            </span>
          </div>
          {customerErrorBanner}
          <div className="space-y-2.5">
          <Input
            inputRef={newCustomerNameRef}
            label="Full Name *"
            value={newCustomerName}
            onChange={function onNameChange(event) {
              setNewCustomerName(event.target.value);
              if (customerError.length > 0) {
                setCustomerError("");
              }
            }}
            onKeyDown={handleInlineCustomerKeyDown}
            placeholder="e.g. Mang Tomas"
            required={true}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              label="Phone (optional)"
              value={newCustomerPhone}
              onChange={function onPhoneChange(event) {
                setNewCustomerPhone(event.target.value);
              }}
              onKeyDown={handleInlineCustomerKeyDown}
              placeholder="0917..."
            />
            <Input
              label="Credit Limit (₱)"
              type="number"
              step="0.01"
              min="0"
              value={newCustomerLimit}
              onChange={function onLimitChange(event) {
                setNewCustomerLimit(event.target.value);
                if (customerError.length > 0) {
                  setCustomerError("");
                }
              }}
              onKeyDown={handleInlineCustomerKeyDown}
              placeholder="No limit"
            />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelNewCustomer}
            disabled={savingCustomer}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCreateCustomer}
            disabled={savingCustomer || newCustomerName.trim().length === 0}
            className="font-semibold"
          >
            Create Customer
          </Button>
        </div>
      </div>
    );
  } else {
    let activeDescendant = undefined;
    if (dropdownOpen && highlightedIndex >= 0) {
      if (highlightedIndex < filteredCustomers.length) {
        activeDescendant = comboboxId + "-opt-" + String(highlightedIndex);
      } else {
        activeDescendant = comboboxId + "-opt-new";
      }
    }

    let balanceSummary = (
      <div className="rounded-xl border border-dashed border-[#E9E9E9] bg-[#F5F5F4]/60 px-3.5 py-3 text-xs text-[#777777]">
        Search and select a customer account or choose <span className="font-semibold text-[#171717]">+ New Customer</span>.
      </div>
    );

    if (selectedCustomer) {
      let projectedRowClass =
        "flex items-center justify-between rounded-lg bg-[#F4FBE9] px-3 py-2 text-xs";
      if (isCreditLimitExceeded) {
        projectedRowClass =
          "flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-xs";
      }

      let limitAlert = null;
      if (isCreditLimitExceeded) {
        limitAlert = (
          <div className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <span className="font-semibold">Exceeds Credit Limit:</span> New balance{" "}
              {formatPeso(projectedBalance)} exceeds {limitDisplay} limit by{" "}
              {formatPeso(limitExcessAmount)}.
            </div>
          </div>
        );
      }

      balanceSummary = (
        <div className="rounded-xl border border-[#E9E9E9] bg-white p-3 space-y-2">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-[#777777]">Current Utang Balance</span>
            <span className="font-mono font-semibold text-[#171717]">
              {formatPeso(selectedCustomer.current_balance)}
            </span>
          </div>
          <div className={projectedRowClass}>
            <span className="font-medium text-[#171717]">New Utang Balance</span>
            <span className="font-mono text-sm font-bold text-[#171717]">
              {formatPeso(projectedBalance)}
            </span>
          </div>
          {limitAlert}
        </div>
      );
    }

    let newOptionClass =
      "mt-1 flex w-full items-center gap-2 rounded-lg border-t border-[#E9E9E9] px-3 py-2 text-left text-xs font-semibold text-[#171717] cursor-pointer transition-colors ";
    if (highlightedIndex === filteredCustomers.length) {
      newOptionClass = newOptionClass + "bg-[#EEEEED]";
    } else {
      newOptionClass = newOptionClass + "hover:bg-[#EEEEED]";
    }

    let newOptionLabel = "+ New Customer";
    if (customerQuery.trim().length > 0 && (!selectedCustomer || customerQuery.trim().toLowerCase() !== selectedCustomer.full_name.toLowerCase())) {
      newOptionLabel = '+ New Customer "' + customerQuery.trim() + '"';
    }

    paymentBody = (
      <div className="flex flex-1 flex-col justify-between gap-3.5">
        <div ref={comboboxContainerRef} className="relative">
          <label htmlFor={comboboxId} className="mb-1.5 block text-xs font-medium text-[#171717]">
            Customer (Utang Account)
          </label>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#777777]" />
            <input
              id={comboboxId}
              ref={customerInputRef}
              type="text"
              role="combobox"
              data-autofocus={!hasCustomerSelected ? "" : undefined}
              aria-expanded={dropdownOpen}
              aria-controls={listboxId}
              aria-activedescendant={activeDescendant}
              aria-autocomplete="list"
              value={customerQuery}
              placeholder="Search customer or add new..."
              onFocus={function onComboFocus() {
                setDropdownOpen(true);
                setHighlightedIndex(0);
              }}
              onChange={function onComboChange(event) {
                const nextVal = event.target.value;
                setCustomerQuery(nextVal);
                setDropdownOpen(true);
                setHighlightedIndex(0);
                if (selectedCustomer && nextVal !== selectedCustomer.full_name && props.onCustomerIdChange) {
                  props.onCustomerIdChange("");
                }
              }}
              onKeyDown={handleComboboxKeyDown}
              className="w-full rounded-xl border border-[#E9E9E9] bg-white py-2.5 pl-9 pr-14 text-sm text-[#171717] placeholder:text-[#777777] focus:border-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors"
            />
            {customerQuery.length > 0 && (
              <button
                type="button"
                aria-label="Clear customer search"
                onClick={function clearCustomerSearch() {
                  setCustomerQuery("");
                  if (props.onCustomerIdChange) {
                    props.onCustomerIdChange("");
                  }
                  setDropdownOpen(true);
                  setHighlightedIndex(0);
                  if (customerInputRef.current) {
                    customerInputRef.current.focus();
                  }
                }}
                className="absolute right-8 flex h-6 w-6 items-center justify-center rounded-md text-[#777777] hover:bg-[#EEEEED] hover:text-[#171717] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Toggle customer list"
              onClick={function toggleComboList() {
                setDropdownOpen(!dropdownOpen);
              }}
              className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-md text-[#777777] hover:text-[#171717] cursor-pointer"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {dropdownOpen && (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Customers"
              className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-[#E9E9E9] bg-white p-1.5 shadow-xl"
            >
              {filteredCustomers.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#777777]">
                  No matching customers found.
                </div>
              ) : (
                filteredCustomers.map(function renderCustomerOption(customer, index) {
                  const isHighlighted = index === highlightedIndex;
                  const isSelected = customer.customer_id === props.customerId;
                  let optionClass =
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer ";
                  if (isHighlighted || isSelected) {
                    optionClass = optionClass + "bg-[#EEEEED] font-semibold text-[#171717]";
                  } else {
                    optionClass = optionClass + "text-[#171717] hover:bg-[#EEEEED]";
                  }

                  return (
                    <button
                      key={customer.customer_id}
                      id={comboboxId + "-opt-" + String(index)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={function onHoverOption() {
                        setHighlightedIndex(index);
                      }}
                      onClick={function onSelectOption() {
                        selectCustomer(customer);
                      }}
                      className={optionClass}
                    >
                      <span className="truncate font-medium">{customer.full_name}</span>
                      <span className="shrink-0 font-mono text-[#777777]">
                        {formatPeso(customer.current_balance)}
                      </span>
                    </button>
                  );
                })
              )}

              <button
                id={comboboxId + "-opt-new"}
                type="button"
                role="option"
                aria-selected={false}
                onMouseEnter={function onHoverNew() {
                  setHighlightedIndex(filteredCustomers.length);
                }}
                onClick={function onClickNew() {
                  openInlineCreateCustomer(customerQuery.trim());
                }}
                className={newOptionClass}
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{newOptionLabel}</span>
              </button>
            </div>
          )}
        </div>

        {balanceSummary}
      </div>
    );
  }

  let confirmLabel = "Confirm Cash Payment";
  if (props.paymentMethod !== "CASH") {
    confirmLabel = "Add " + formatPeso(props.total) + " to Utang";
  }
  if (props.submitting) {
    confirmLabel = "Processing...";
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Complete Checkout"
      maxWidth="max-w-[820px]"
      panelClassName="rounded-[18px] sm:h-[476px]"
      dismissDisabled={Boolean(props.submitting || savingCustomer)}
    >
      <form id={formId} onSubmit={handleFormSubmit} className="flex h-full flex-col gap-4">
        <ErrorBanner message={props.errorMessage} />

        <div className="grid flex-1 min-h-0 grid-cols-1 sm:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] gap-5 items-stretch">
          {leftOrderSummary}

          <section
            aria-label="Payment Details"
            className="flex min-h-0 flex-col justify-between gap-4"
          >
            <div className="flex flex-1 min-h-0 flex-col gap-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                Payment Details
              </h3>

              <PaymentMethodToggle
                paymentMethod={props.paymentMethod}
                onChange={props.onPaymentMethodChange}
                allowCredit={props.allowCredit}
              />

              {paymentBody}
            </div>

            <div className="mt-auto flex items-center justify-end gap-2.5 border-t border-[#E9E9E9] pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={props.onClose}
                disabled={props.submitting}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                buttonRef={confirmButtonRef}
                type="submit"
                variant="primary"
                disabled={submitDisabled}
                className="flex-1 sm:flex-initial font-semibold"
              >
                {confirmLabel}
              </Button>
            </div>
          </section>
        </div>
      </form>
    </Modal>
  );
}
