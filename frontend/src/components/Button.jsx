function getVariantClasses(variant) {
  if (variant === "primary") {
    return "btn-glossy btn-glossy-primary bg-[#B9F36B] text-[#171717] hover:bg-[#A8E65A] border-transparent shadow-xs";
  }
  if (variant === "secondary") {
    return "btn-glossy btn-glossy-secondary bg-white text-[#171717] hover:bg-[#EEEEED] border-[#E9E9E9]";
  }
  if (variant === "soft") {
    return "btn-glossy btn-glossy-soft bg-[#EEEEED] text-[#171717] hover:bg-[#E2E2E1] border-transparent";
  }
  if (variant === "danger") {
    return "btn-glossy btn-glossy-danger bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200";
  }
  if (variant === "danger-solid") {
    return "bg-rose-600 text-white hover:bg-rose-700 border-transparent shadow-xs";
  }
  if (variant === "ghost") {
    return "btn-glossy btn-glossy-ghost bg-transparent text-[#777777] hover:bg-[#EEEEED] hover:text-[#171717] border-transparent";
  }
  return "btn-glossy btn-glossy-secondary bg-white text-[#171717] hover:bg-[#EEEEED] border-[#E9E9E9]";
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

  let ariaHaspopup = props.ariaHaspopup;
  if (ariaHaspopup === undefined) {
    ariaHaspopup = props["aria-haspopup"];
  }
  let ariaExpanded = props.ariaExpanded;
  if (ariaExpanded === undefined) {
    ariaExpanded = props["aria-expanded"];
  }
  let ariaControls = props.ariaControls;
  if (ariaControls === undefined) {
    ariaControls = props["aria-controls"];
  }

  return (
    <button
      type={buttonType}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      aria-haspopup={ariaHaspopup}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      title={props.title}
      form={props.form}
      name={props.name}
      value={props.value}
      id={props.id}
      tabIndex={props.tabIndex}
      className={"focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 " + classes}
    >
      {props.children}
    </button>
  );
}
