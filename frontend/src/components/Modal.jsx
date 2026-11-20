import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal(props) {
  useEffect(
    function bindEscapeKey() {
      if (!props.open) {
        return;
      }
      function handleKeyDown(event) {
        if (event.key === "Escape") {
          props.onClose();
        }
      }
      window.addEventListener("keydown", handleKeyDown);
      return function cleanup() {
        window.removeEventListener("keydown", handleKeyDown);
      };
    },
    [props.open, props.onClose]
  );

  if (!props.open) {
    return null;
  }

  let widthClass = "max-w-lg";
  if (props.size === "sm") {
    widthClass = "max-w-sm";
  } else if (props.size === "xl") {
    widthClass = "max-w-2xl";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6">
      <div
        className={
          "w-full rounded-xl bg-white shadow-xl border border-slate-200 max-h-[92vh] flex flex-col " +
          widthClass
        }
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 sm:px-6 sm:py-4">
          <h2 className="text-base font-bold text-slate-900">{props.title}</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">{props.children}</div>
      </div>
    </div>
  );
}
