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
      <label className="mb-1 block text-xs font-medium text-slate-700">
        {props.label}
      </label>
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
        value={props.value}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder}
        required={props.required}
        disabled={props.disabled}
        className={
          "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" +
          fontClass
        }
      />
    </div>
  );
}
