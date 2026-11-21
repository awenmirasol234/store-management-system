import { ChevronDown } from "lucide-react";

export function Select(props) {
  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  let labelElement = null;
  if (props.label) {
    labelElement = (
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {props.label}
      </label>
    );
  }

  return (
    <div className={extraClass}>
      {labelElement}
      <div className="relative">
        <select
          value={props.value}
          onChange={props.onChange}
          required={props.required}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          {props.children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}
