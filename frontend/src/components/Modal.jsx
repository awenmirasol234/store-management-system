import { useId, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal(props) {
  if (!props.open) {
    return null;
  }
  return (
    <OpenModal
      title={props.title}
      size={props.size}
      maxWidth={props.maxWidth}
      onClose={props.onClose}
      dismissDisabled={props.dismissDisabled}
    >
      {props.children}
    </OpenModal>
  );
}

function OpenModal(props) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useLayoutEffect(
    function openDialog() {
      const dialog = dialogRef.current;
      dialog.showModal();
      return function cleanup() {
        dialog.close();
      };
    },
    []
  );

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !props.dismissDisabled) {
      props.onClose();
    }
  }

  function handleCancel(event) {
    event.preventDefault();
    if (!props.dismissDisabled) {
      props.onClose();
    }
  }

  function keepTabInside(event) {
    if (event.key !== "Tab" || event.defaultPrevented) {
      return;
    }
    const controls = dialogRef.current.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]'
    );
    const focusable = Array.from(controls).filter(function canTabTo(control) {
      return control.tabIndex >= 0 &&
        !control.matches(":disabled") &&
        control.getClientRects().length > 0;
    });
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onKeyDown={keepTabInside}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-0 h-full w-full max-h-none max-w-none bg-[#171717]/40 backdrop-blur-[2px] p-3 open:flex items-center justify-center sm:p-6 backdrop:bg-transparent"
    >
      <div
        className={
          "w-full rounded-2xl bg-white shadow-xl border border-[#E9E9E9] max-h-[92vh] flex flex-col " +
          widthClass
        }
      >
        <div className="flex items-center justify-between border-b border-[#E9E9E9] px-5 py-3.5 sm:px-6 sm:py-4">
          <h2 id={titleId} className="text-base font-semibold text-[#171717]">
            {props.title}
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.dismissDisabled}
            title="Close"
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#777777] hover:bg-[#EEEEED] hover:text-[#171717] cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">{props.children}</div>
      </div>
    </dialog>
  );
}
