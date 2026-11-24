function getVariantClasses(variant) {
  if (variant === "primary") {
    return "bg-[#B9F36B] text-[#151515] font-semibold border border-[#A2E84D] border-b-2 border-b-[#8FD838] shadow-xs hover:bg-[#A8E65A] hover:border-[#97DF43] hover:border-b-[#84CE30]";
  }
  if (variant === "secondary") {
    return "bg-white text-[#151515] border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] shadow-xs hover:bg-[#F9F9F8] hover:border-[#DCDCDA] hover:border-b-[#CECECA]";
  }
  if (variant === "soft") {
    return "bg-[#EEEEED] text-[#151515] border border-[#E2E1DF] border-b-2 border-b-[#D0CFCB] shadow-xs hover:bg-[#E6E6E5]";
  }
  if (variant === "danger") {
    return "bg-rose-50 text-rose-700 border border-rose-200/80 border-b-2 border-b-rose-200 shadow-xs hover:bg-rose-100 hover:border-rose-200 hover:border-b-rose-300";
  }
  if (variant === "ghost") {
    return "bg-transparent text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] border border-transparent";
  }
  return "bg-white text-[#151515] border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] shadow-xs hover:bg-[#F9F9F8]";
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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-100 cursor-pointer active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-xs " +
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
