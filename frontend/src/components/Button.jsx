function getVariantClasses(variant) {
  if (variant === "primary") {
    return "bg-[#B9F36B] text-[#151515] hover:bg-[#A8E65A] border-transparent shadow-xs active:scale-[0.99]";
  }
  if (variant === "secondary") {
    return "bg-white text-[#151515] hover:bg-[#EEEEED] border-[#E9E9E9]";
  }
  if (variant === "soft") {
    return "bg-[#EEEEED] text-[#151515] hover:bg-[#E2E2E1] border-transparent";
  }
  if (variant === "danger") {
    return "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200";
  }
  if (variant === "ghost") {
    return "bg-transparent text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] border-transparent";
  }
  return "bg-white text-[#151515] hover:bg-[#EEEEED] border-[#E9E9E9]";
}

function getSizeClasses(size) {
  if (size === "sm") {
    return "px-3 py-2 text-xs";
  }
  if (size === "lg") {
    return "px-5 py-3.5 text-sm";
  }
  return "px-4 py-2.5 text-sm";
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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed " +
    getVariantClasses(props.variant) +
    " " +
    getSizeClasses(props.size) +
    extraClass;

  return (
    <button
      type={buttonType}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      className={classes}
    >
      {props.children}
    </button>
  );
}
