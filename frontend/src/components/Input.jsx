import { useId } from "react";

export function Input(props) {
  const generatedId = useId();
  let inputId = generatedId;
  if (props.id) {
    inputId = props.id;
  }

  let inputType = "text";
  if (props.type) {
    inputType = props.type;
  }

  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  let fontClass = "";
  if (props.mono || inputType === "number" || inputType === "date") {
    fontClass = " font-mono";
  }

  let customInputClass = "";
  if (props.inputClassName) {
    customInputClass = " " + props.inputClassName;
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
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-[#171717]">
        {labelContent}
      </label>
    );
  }

  let borderClass = " border-[#E9E9E9] focus:border-[#171717] focus:ring-[#B9F36B]/30";
  if (props.error) {
    borderClass = " border-[#E0533C] focus:border-[#E0533C] focus:ring-[#E0533C]/20";
  }

  let helperElement = null;
  if (props.helper && !props.error) {
    helperElement = (
      <div className="mt-1.5 font-mono text-xs text-[#777777]">{props.helper}</div>
    );
  }

  let errorElement = null;
  let describedBy = undefined;
  if (props.error) {
    describedBy = inputId + "-error";
    errorElement = (
      <div id={describedBy} className="mt-1.5 text-xs text-[#E0533C]">
        {props.error}
      </div>
    );
  }

  return (
    <div className={extraClass}>
      {labelElement}
      <input
        id={inputId}
        ref={props.inputRef}
        type={inputType}
        step={props.step}
        min={props.min}
        max={props.max}
        maxLength={props.maxLength}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        aria-label={props.ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={Boolean(props.error)}
        name={props.name}
        value={props.value}
        onChange={props.onChange}
        onBlur={props.onBlur}
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder}
        required={props.required}
        disabled={props.disabled}
        className={
          "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#171717] placeholder:text-[#777777] focus:outline-none focus:ring-2 transition-colors" +
          borderClass +
          fontClass +
          customInputClass
        }
      />
      {errorElement}
      {helperElement}
    </div>
  );
}
