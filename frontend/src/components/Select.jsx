import { ChevronDown } from "lucide-react";

export function Select(props) {
  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  let labelElement = null;
  if (props.label) {
    labelElement = (
      <label className="mb-1.5 block text-xs font-medium text-[#151515]">
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
          className="w-full appearance-none rounded-xl border border-[#E9E9E9] bg-white py-2.5 pl-3.5 pr-10 text-sm text-[#151515] focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 cursor-pointer transition-colors"
        >
          {props.children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
      </div>
    </div>
  );
}
