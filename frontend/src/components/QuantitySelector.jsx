import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

export function QuantitySelector(props) {
  let min = 1;
  if (props.min !== undefined) {
    min = props.min;
  }

  let step = 1;
  if (props.step !== undefined) {
    step = props.step;
  }

  const [localInput, setLocalInput] = useState(String(props.value));

  useEffect(
    function syncValue() {
      setLocalInput(String(props.value));
    },
    [props.value]
  );

  function commitValue(candidate) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= min) {
      let allowed = true;
      if (props.max !== undefined && parsed > props.max) {
        allowed = false;
      }
      if (allowed) {
        if (typeof props.onChange === "function") {
          const result = props.onChange(parsed);
          if (result === false) {
            setLocalInput(String(props.value));
            return;
          }
        }
        setLocalInput(String(parsed));
        return;
      }
    }
    setLocalInput(String(props.value));
  }

  function handleInputChange(event) {
    const sanitized = event.target.value.replace(/[^0-9]/g, "");
    setLocalInput(sanitized);
  }

  function handleBlur() {
    commitValue(localInput);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitValue(localInput);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      handleIncrement();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      handleDecrement();
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !/^[0-9]$/.test(event.key)
    ) {
      event.preventDefault();
    }
  }

  function handleFocus(event) {
    event.target.select();
  }

  function handleDecrement() {
    if (props.disabled) {
      return;
    }
    if (typeof props.onDecrement === "function") {
      props.onDecrement();
      return;
    }
    const current = Number(props.value);
    const nextVal = current - step;
    if (nextVal >= min) {
      commitValue(nextVal);
    }
  }

  function handleIncrement() {
    if (props.disabled) {
      return;
    }
    if (typeof props.onIncrement === "function") {
      props.onIncrement();
      return;
    }
    const current = Number(props.value);
    const nextVal = current + step;
    commitValue(nextVal);
  }

  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  const isMinReached = Number(props.value) <= min;

  return (
    <div
      className={
        "inline-flex items-center rounded-lg border border-[#E9E9E9] bg-white transition-colors focus-within:border-[#171717]" +
        extraClass
      }
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={props.disabled || isMinReached}
        className="flex h-7 w-7 items-center justify-center text-[#777777] hover:bg-[#EEEEED] hover:text-[#171717] disabled:opacity-30 disabled:pointer-events-none rounded-l-lg cursor-pointer transition-colors"
        title="Decrease quantity"
        aria-label="Decrease quantity"
      >
        <Minus className="h-3 w-3" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={localInput}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        disabled={props.disabled}
        aria-label={props.ariaLabel || "Quantity"}
        className="w-10 sm:w-12 text-center font-mono text-xs font-semibold text-[#171717] bg-transparent py-0.5 focus:outline-none focus:bg-[#EEEEED]/40 transition-colors selection:bg-[#B9F36B]"
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={props.disabled}
        className="flex h-7 w-7 items-center justify-center text-[#171717] hover:bg-[#B9F36B]/40 disabled:opacity-30 disabled:pointer-events-none rounded-r-lg cursor-pointer transition-colors"
        title="Increase quantity"
        aria-label="Increase quantity"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
