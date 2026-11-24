import { X } from "lucide-react";

export function ErrorBanner(props) {
  if (!props.message) {
    return null;
  }

  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  let dismissButton = null;
  if (typeof props.onDismiss === "function") {
    dismissButton = (
      <button
        type="button"
        onClick={props.onDismiss}
        title="Dismiss"
        aria-label="Dismiss error"
        className="shrink-0 rounded-md p-0.5 text-rose-600 hover:bg-rose-100 hover:text-rose-800 cursor-pointer transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div
      role="alert"
      className={
        "flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700" +
        extraClass
      }
    >
      <span>{props.message}</span>
      {dismissButton}
    </div>
  );
}
