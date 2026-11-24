import { useId } from "react";
import { ChevronDown } from "lucide-react";

export function Select(props) {
  const generatedId = useId();
  let selectId = generatedId;
  if (props.id) {
    selectId = props.id;
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
    labelElement = (
      <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium text-[#151515]">
        {props.label}
      </label>
    );
  }

  return (
    <div className={extraClass}>
      {labelElement}
      <div className="relative">
        <select
          id={selectId}
          value={props.value}
          onChange={props.onChange}
          required={props.required}
          disabled={props.disabled}
          aria-label={props.ariaLabel}
          className={
            "w-full appearance-none rounded-xl border border-[#E9E9E9] bg-white text-[#151515] focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors " +
            sizeClasses
          }
        >
          {props.children}
        </select>
        <ChevronDown
          className={
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#777777] " +
            iconClasses
          }
        />
      </div>
    </div>
  );
}
