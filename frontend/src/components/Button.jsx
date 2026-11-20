function getVariantClasses(variant) {
  if (variant === "primary") {
    return "bg-blue-600 text-white hover:bg-blue-700 border-transparent";
  }
  if (variant === "soft") {
    return "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100";
  }
  if (variant === "danger") {
    return "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200";
  }
  if (variant === "ghost") {
    return "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent";
  }
  if (variant === "secondary") {
    return "bg-white text-slate-800 hover:bg-slate-50 border-slate-200";
  }
  return "bg-white text-slate-800 hover:bg-slate-50 border-slate-200";
}

function getSizeClasses(size) {
  if (size === "sm") {
    return "px-2.5 py-1.5 text-xs";
  }
  if (size === "lg") {
    return "px-4 py-3 text-sm";
  }
  return "px-3.5 py-2 text-sm";
}

export function Button(props) {
  let buttonType = "button";
  if (props.type) {
    buttonType = props.type;
  }

  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }

  const classes =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed " +
    getVariantClasses(props.variant) +
    " " +
    getSizeClasses(props.size) +
    extraClass;

  return (
    <button
      type={buttonType}
      onClick={props.onClick}
      disabled={props.disabled}
      className={classes}
    >
      {props.children}
    </button>
  );
}
