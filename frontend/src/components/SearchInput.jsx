import { Search, X } from "lucide-react";

export function SearchInput(props) {
  let currentValue = "";
  if (props.value !== undefined && props.value !== null) {
    currentValue = String(props.value);
  }

  const hasValue = currentValue.length > 0;

  let wrapperClass = "relative";
  if (props.className) {
    wrapperClass = wrapperClass + " " + props.className;
  }

  let iconClass = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]";
  let inputSizeClass = "py-2.5 pl-10 pr-9 text-sm";
  let clearButtonClass =
    "absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] cursor-pointer transition-colors";

  if (props.size === "sm") {
    iconClass = "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#777777]";
    inputSizeClass = "py-1.5 pl-8 pr-8 text-xs";
    clearButtonClass =
      "absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] cursor-pointer transition-colors";
  } else if (!hasValue && props.shortcutHint) {
    inputSizeClass = "py-2.5 pl-10 pr-20 text-sm";
  }

  let computedAriaLabel = "Search";
  if (props.ariaLabel) {
    computedAriaLabel = props.ariaLabel;
  } else if (props.placeholder) {
    computedAriaLabel = props.placeholder;
  }

  function handleChange(event) {
    if (typeof props.onChange === "function") {
      props.onChange(event.target.value);
    }
  }

  function handleClear() {
    if (typeof props.onChange === "function") {
      props.onChange("");
    }
    if (props.inputRef && props.inputRef.current && typeof props.inputRef.current.focus === "function") {
      props.inputRef.current.focus();
    }
  }

  let trailingElement = null;
  if (hasValue) {
    trailingElement = (
      <button
        type="button"
        onClick={handleClear}
        className={clearButtonClass}
        title="Clear search"
        aria-label="Clear search"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    );
  } else if (props.shortcutHint) {
    trailingElement = (
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-[#E9E9E9] bg-[#EEEEED] px-2 py-0.5 font-mono text-tiny text-[#777777]">
        {props.shortcutHint}
      </span>
    );
  }

  return (
    <div className={wrapperClass}>
      <Search className={iconClass} />
      <input
        ref={props.inputRef}
        type="text"
        value={currentValue}
        onChange={handleChange}
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder}
        aria-label={computedAriaLabel}
        className={
          "w-full rounded-xl border border-[#E9E9E9] bg-white text-[#151515] placeholder:text-[#777777] focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors " +
          inputSizeClass
        }
      />
      {trailingElement}
    </div>
  );
}
