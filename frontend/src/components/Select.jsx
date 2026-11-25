import { Children, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

function extractOptions(children, optionsProp) {
  let options = [];
  if (Array.isArray(optionsProp)) {
    for (let i = 0; i < optionsProp.length; i = i + 1) {
      let item = optionsProp[i];
      if (typeof item === "string" || typeof item === "number") {
        options.push({
          value: String(item),
          label: String(item),
          disabled: false
        });
      } else if (item && typeof item === "object") {
        let val = "";
        if (item.value !== undefined) {
          val = String(item.value);
        }
        let lbl = val;
        if (item.label !== undefined) {
          lbl = String(item.label);
        }
        options.push({
          value: val,
          label: lbl,
          disabled: Boolean(item.disabled)
        });
      }
    }
    return options;
  }

  if (children) {
    let childList = Children.toArray(children);
    for (let i = 0; i < childList.length; i = i + 1) {
      let child = childList[i];
      if (child && child.props) {
        let val = "";
        if (child.props.value !== undefined) {
          val = String(child.props.value);
        }
        let lbl = val;
        if (typeof child.props.children === "string" || typeof child.props.children === "number") {
          lbl = String(child.props.children);
        } else if (Array.isArray(child.props.children)) {
          lbl = child.props.children.join("");
        }
        options.push({
          value: val,
          label: lbl,
          disabled: Boolean(child.props.disabled)
        });
      }
    }
  }
  return options;
}

export function Select(props) {
  const generatedId = useId();
  let selectId = generatedId;
  if (props.id) {
    selectId = props.id;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);

  const options = extractOptions(props.children, props.options);

  let currentValue = "";
  if (props.value !== undefined && props.value !== null) {
    currentValue = String(props.value);
  }

  let selectedOption = null;
  for (let i = 0; i < options.length; i = i + 1) {
    if (options[i].value === currentValue) {
      selectedOption = options[i];
      break;
    }
  }

  let displayLabel = "";
  if (selectedOption) {
    displayLabel = selectedOption.label;
  } else if (props.placeholder) {
    displayLabel = props.placeholder;
  } else if (options.length > 0) {
    displayLabel = options[0].label;
  }

  useEffect(
    function bindOutsideClick() {
      if (!isOpen) {
        return;
      }
      function handlePointerDown(event) {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
      return function cleanup() {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
      };
    },
    [isOpen]
  );

  useEffect(
    function scrollToHighlighted() {
      if (!isOpen || highlightedIndex < 0 || !listRef.current) {
        return;
      }
      const items = listRef.current.querySelectorAll('[role="option"]');
      const item = items[highlightedIndex];
      if (item && typeof item.scrollIntoView === "function") {
        item.scrollIntoView({ block: "nearest" });
      }
    },
    [isOpen, highlightedIndex]
  );

  function selectOption(option) {
    if (option.disabled || props.disabled) {
      return;
    }
    setIsOpen(false);
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
    if (typeof props.onChange === "function") {
      let syntheticEvent = {
        target: {
          id: selectId,
          name: props.name || "",
          value: option.value
        },
        currentTarget: {
          id: selectId,
          name: props.name || "",
          value: option.value
        },
        preventDefault: function () {},
        stopPropagation: function () {}
      };
      props.onChange(syntheticEvent);
    }
  }

  function handleKeyDown(event) {
    if (props.disabled) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        let selectedIdx = -1;
        for (let i = 0; i < options.length; i = i + 1) {
          if (options[i].value === currentValue) {
            selectedIdx = i;
            break;
          }
        }
        if (selectedIdx >= 0) {
          setHighlightedIndex(selectedIdx);
        } else {
          setHighlightedIndex(0);
        }
        return;
      }
      let nextIndex = highlightedIndex + 1;
      if (nextIndex >= options.length) {
        nextIndex = 0;
      }
      setHighlightedIndex(nextIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        let selectedIdx = -1;
        for (let i = 0; i < options.length; i = i + 1) {
          if (options[i].value === currentValue) {
            selectedIdx = i;
            break;
          }
        }
        if (selectedIdx >= 0) {
          setHighlightedIndex(selectedIdx);
        } else {
          let lastIdx = options.length - 1;
          if (lastIdx < 0) {
            lastIdx = 0;
          }
          setHighlightedIndex(lastIdx);
        }
        return;
      }
      let prevIndex = highlightedIndex - 1;
      if (prevIndex < 0) {
        prevIndex = options.length - 1;
      }
      setHighlightedIndex(prevIndex);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          selectOption(options[highlightedIndex]);
        }
      } else {
        setIsOpen(true);
        let selectedIdx = -1;
        for (let i = 0; i < options.length; i = i + 1) {
          if (options[i].value === currentValue) {
            selectedIdx = i;
            break;
          }
        }
        if (selectedIdx >= 0) {
          setHighlightedIndex(selectedIdx);
        } else {
          setHighlightedIndex(0);
        }
      }
    } else if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    } else if (event.key === "Tab") {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  }

  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  let sizeClasses = "py-2.5 pl-3.5 pr-10 text-sm";
  let iconClasses = "right-3 h-4 w-4";
  if (props.size === "sm") {
    sizeClasses = "py-1.5 pl-3 pr-8 text-xs";
    iconClasses = "right-2.5 h-3.5 w-3.5";
  }

  let labelElement = null;
  if (props.label) {
    let labelContent = props.label;
    let isRequired = Boolean(props.required);
    let cleanLabel = props.label;

    if (typeof props.label === "string") {
      if (props.label.trim().endsWith("*")) {
        isRequired = true;
      }
      cleanLabel = props.label.replace(/\s*\*+\s*$/, "");
    }

    if (isRequired) {
      labelContent = (
        <>
          {cleanLabel}{" "}
          <span className="text-rose-500">*</span>
        </>
      );
    }

    labelElement = (
      <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium text-[#171717]">
        {labelContent}
      </label>
    );
  }

  let borderClass = " border-[#E9E9E9] focus:border-[#171717] focus:ring-[#B9F36B]/30";
  if (props.error) {
    borderClass = " border-[#E0533C] focus:border-[#E0533C] focus:ring-[#E0533C]/20";
  }

  let errorElement = null;
  if (props.error) {
    errorElement = (
      <div className="mt-1.5 text-xs text-[#E0533C]">{props.error}</div>
    );
  }

  let listboxId = selectId + "-listbox";

  return (
    <div ref={containerRef} className={"relative" + extraClass}>
      {labelElement}
      <div className="relative">
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-label={props.ariaLabel}
          disabled={props.disabled}
          onClick={function handleToggle() {
            if (props.disabled) {
              return;
            }
            const nextOpen = !isOpen;
            setIsOpen(nextOpen);
            if (nextOpen) {
              let selectedIdx = -1;
              for (let i = 0; i < options.length; i = i + 1) {
                if (options[i].value === currentValue) {
                  selectedIdx = i;
                  break;
                }
              }
              if (selectedIdx >= 0) {
                setHighlightedIndex(selectedIdx);
              } else {
                setHighlightedIndex(0);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={props.onBlur}
          className={
            "relative flex w-full items-center justify-between appearance-none rounded-xl border bg-white text-[#171717] text-left focus:outline-none focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors select-none " +
            borderClass +
            " " +
            sizeClasses
          }
        >
          <span className="block truncate">{displayLabel || "\u00A0"}</span>
          <ChevronDown
            className={
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#777777] transition-transform duration-200 " +
              iconClasses +
              (isOpen ? " rotate-180" : " rotate-0")
            }
          />
        </button>

        {isOpen && (
          <div
            id={listboxId}
            ref={listRef}
            role="listbox"
            aria-label={props.label || props.ariaLabel}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-[#E9E9E9] bg-white p-1.5 shadow-xl animate-in fade-in duration-100"
          >
            {options.map(function renderOption(opt, index) {
              const isSelected = opt.value === currentValue;
              const isHighlighted = index === highlightedIndex;

              let itemClass =
                "flex w-full items-center justify-between rounded-lg transition-colors cursor-pointer text-left select-none ";
              if (props.size === "sm") {
                itemClass = itemClass + "px-2.5 py-1.5 text-xs ";
              } else {
                itemClass = itemClass + "px-3 py-2 text-sm ";
              }

              if (isSelected) {
                itemClass = itemClass + "bg-[#EEEEED] font-semibold text-[#171717] ";
              } else if (isHighlighted) {
                itemClass = itemClass + "bg-[#EEEEED] text-[#171717] ";
              } else {
                itemClass = itemClass + "text-[#171717] hover:bg-[#EEEEED] ";
              }

              if (opt.disabled) {
                itemClass = itemClass + "opacity-40 cursor-not-allowed ";
              }

              return (
                <button
                  key={opt.value + "-" + index}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onClick={function handleOptionClick() {
                    selectOption(opt);
                  }}
                  onMouseEnter={function handleMouseEnter() {
                    setHighlightedIndex(index);
                  }}
                  className={itemClass}
                >
                  <span className="truncate">{opt.label || "\u00A0"}</span>
                  {isSelected && (
                    <Check
                      className={
                        "flex-shrink-0 text-[#171717] " +
                        (props.size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")
                      }
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Hidden native select for form serialization, SSR queries, and accessibility fallbacks */}
        <select
          tabIndex={-1}
          aria-hidden="true"
          value={props.value}
          onChange={props.onChange}
          required={props.required}
          disabled={props.disabled}
          className="sr-only pointer-events-none absolute h-0 w-0 opacity-0"
        >
          {props.children}
        </select>
      </div>
      {errorElement}
    </div>
  );
}
