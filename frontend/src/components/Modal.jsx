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
  } else if (props.size === "md") {
    widthClass = "max-w-md";
  } else if (props.size === "lg") {
    widthClass = "max-w-lg";
  } else if (props.size === "xl") {
    widthClass = "max-w-2xl";
  } else if (props.size === "2xl") {
    widthClass = "max-w-3xl";
  }

  if (props.maxWidth) {
    widthClass = props.maxWidth;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-3 sm:p-6">
      <div
        className={
          "w-full rounded-2xl bg-white shadow-xl border border-[#E9E9E9] max-h-[92vh] flex flex-col " +
          widthClass
        }
      >
        <div className="flex items-center justify-between border-b border-[#E9E9E9] px-5 py-3.5 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-[#151515]">{props.title}</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">{props.children}</div>
      </div>
    </div>
  );
}
