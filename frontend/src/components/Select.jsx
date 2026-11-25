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

  return (
    <div className={extraClass}>
      {labelElement}
      <div className="relative">
        <select
          id={selectId}
          value={props.value}
          onChange={props.onChange}
          onBlur={props.onBlur}
          required={props.required}
          disabled={props.disabled}
          aria-label={props.ariaLabel}
          className={
            "w-full appearance-none rounded-xl border bg-white text-[#171717] focus:outline-none focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors " +
            borderClass +
            " " +
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
      {errorElement}
    </div>
  );
}
