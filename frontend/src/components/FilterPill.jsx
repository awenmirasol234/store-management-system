export function FilterPill(props) {
  const isActive = Boolean(props.active);

  let buttonClass =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 ";
  if (isActive) {
    buttonClass = buttonClass + "bg-[#151515] font-semibold text-white border border-[#151515] border-b-2 border-b-[#2B2B2B] shadow-xs active:translate-y-[1px] active:shadow-none";
  } else {
    buttonClass =
      buttonClass +
      "border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] bg-white text-[#777777] shadow-xs hover:bg-[#F9F9F8] hover:text-[#151515] active:translate-y-[1px] active:shadow-none";
  }
  if (props.className) {
    buttonClass = buttonClass + " " + props.className;
  }

  let countElement = null;
  if (props.count !== undefined && props.count !== null) {
    let countClass = "rounded-full px-1.5 py-0.5 font-mono text-2xs ";
    if (isActive) {
      countClass = countClass + "bg-[#B9F36B] font-semibold text-[#151515]";
    } else {
      countClass = countClass + "bg-[#EEEEED] text-[#777777]";
    }
    countElement = <span className={countClass}>{props.count}</span>;
  }

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={props.onClick}
      className={buttonClass}
    >
      <span>{props.label}</span>
      {countElement}
    </button>
  );
}
