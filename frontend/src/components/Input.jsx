export function Input(props) {
  let inputType = "text";
  if (props.type) {
    inputType = props.type;
  }

  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  let fontClass = "";
  if (props.mono || inputType === "number") {
    fontClass = " font-mono";
  }

  let labelElement = null;
  if (props.label) {
    labelElement = (
      <label className="mb-1.5 block text-xs font-medium text-[#151515]">
        {props.label}
      </label>
    );
  }

  let helperElement = null;
  if (props.helper) {
    helperElement = (
      <div className="mt-1.5 font-mono text-xs text-[#777777]">{props.helper}</div>
    );
  }

  return (
    <div className={extraClass}>
      {labelElement}
      <input
        ref={props.inputRef}
        type={inputType}
        step={props.step}
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder}
        required={props.required}
        disabled={props.disabled}
        className={
          "w-full rounded-xl border border-[#E9E9E9] bg-white px-3.5 py-2.5 text-sm text-[#151515] placeholder:text-[#777777] focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors" +
          fontClass
        }
      />
      {helperElement}
    </div>
  );
}
