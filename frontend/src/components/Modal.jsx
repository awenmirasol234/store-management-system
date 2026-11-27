import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function Modal(props) {
  const [shouldRender, setShouldRender] = useState(props.open);
  const [isClosing, setIsClosing] = useState(false);
  const wasOpenRef = useRef(props.open);
  const closeTimerRef = useRef(null);
  const lastContentRef = useRef({
    title: props.title,
    children: props.children
  });

  if (props.open) {
    lastContentRef.current = {
      title: props.title,
      children: props.children
    };
  }

  useEffect(
    function handleOpenChange() {
      if (props.open) {
        wasOpenRef.current = true;
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        setIsClosing(false);
        setShouldRender(true);
      } else if (wasOpenRef.current) {
        wasOpenRef.current = false;
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }

        let duration = 150;
        if (typeof window !== "undefined" && window.matchMedia) {
          const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
          if (reducedMotionQuery.matches) {
            duration = 0;
          }
        }

        if (duration === 0) {
          setShouldRender(false);
          setIsClosing(false);
        } else {
          setIsClosing(true);
          closeTimerRef.current = setTimeout(function finishClosing() {
            setShouldRender(false);
            setIsClosing(false);
            closeTimerRef.current = null;
          }, duration);
        }
      }

      return function cleanup() {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
      };
    },
    [props.open]
  );

  if (!shouldRender) {
    return null;
  }

  let renderTitle = props.title;
  let renderChildren = props.children;
  if (isClosing) {
    renderTitle = lastContentRef.current.title;
    renderChildren = lastContentRef.current.children;
  }

  return (
    <OpenModal
      title={renderTitle}
      size={props.size}
      maxWidth={props.maxWidth}
      panelClassName={props.panelClassName}
      onClose={props.onClose}
      dismissDisabled={props.dismissDisabled}
      isClosing={isClosing}
    >
      {renderChildren}
    </OpenModal>
  );
}

function OpenModal(props) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const backdropRef = useRef(null);
  const openerRef = useRef(null);

  useLayoutEffect(
    function openDialog() {
      const dialog = dialogRef.current;
      openerRef.current = document.activeElement;
      dialog.showModal();
      const preferred = dialog.querySelector("[data-autofocus]");
      if (preferred && !preferred.matches(":disabled")) {
        preferred.focus();
        if (typeof preferred.select === "function") {
          preferred.select();
        }
      } else {
        const focusable = dialog.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
      return function cleanup() {
        dialog.close();
        if (openerRef.current && typeof openerRef.current.focus === "function") {
          openerRef.current.focus();
        }
      };
    },
    []
  );

  function handleBackdropClick(event) {
    if (props.dismissDisabled || props.isClosing) {
      return;
    }
    if (event.target === event.currentTarget || event.target === backdropRef.current) {
      event.stopPropagation();
      props.onClose();
    }
  }

  function handleCancel(event) {
    event.preventDefault();
    if (!props.dismissDisabled && !props.isClosing) {
      props.onClose();
    }
  }

  function keepTabInside(event) {
    if (event.key !== "Tab" || event.defaultPrevented || props.isClosing) {
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
  } else if (props.size === "3xl") {
    widthClass = "max-w-4xl";
  } else if (props.size === "4xl") {
    widthClass = "max-w-5xl";
  }

  if (props.maxWidth) {
    widthClass = props.maxWidth;
  }

  let backdropAnimClass = "modal-backdrop-animate-in";
  let panelAnimClass = "modal-panel-animate-in";
  let dialogPointerClass = "";
  if (props.isClosing) {
    backdropAnimClass = "modal-backdrop-animate-out";
    panelAnimClass = "modal-panel-animate-out";
    dialogPointerClass = " pointer-events-none select-none";
  }

  let panelRadiusClass = "rounded-2xl";
  if (props.panelClassName) {
    panelRadiusClass = props.panelClassName;
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
      className={
        "fixed inset-0 m-0 h-full w-full max-h-none max-w-none bg-transparent p-3 open:flex items-center justify-center sm:p-6 backdrop:bg-transparent" +
        dialogPointerClass
      }
    >
      <div
        ref={backdropRef}
        aria-hidden="true"
        onClick={handleBackdropClick}
        className={
          "fixed inset-0 bg-[#171717]/40 backdrop-blur-[2px] " +
          backdropAnimClass
        }
      />
      <div
        className={
          "relative z-10 w-full " +
          panelRadiusClass +
          " bg-white shadow-xl border border-[#E9E9E9] max-h-[92vh] flex flex-col " +
          widthClass +
          " " +
          panelAnimClass
        }
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E9E9E9] px-5 py-3.5 sm:px-6 sm:py-4">
          <h2 id={titleId} className="text-base font-semibold text-[#171717]">
            {props.title}
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.dismissDisabled || props.isClosing}
            title="Close"
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#777777] hover:bg-[#EEEEED] hover:text-[#171717] cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto p-4 sm:p-6">{props.children}</div>
      </div>
    </dialog>
  );
}
