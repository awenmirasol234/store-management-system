function getToneClasses(tone) {
  if (tone === "dark") {
    return "bg-[#171717] text-white border-transparent";
  }
  if (tone === "green") {
    return "bg-[#B9F36B] text-[#151515] border-transparent font-medium";
  }
  if (tone === "amber") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (tone === "red") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (tone === "blue") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (tone === "neutral") {
    return "bg-[#EEEEED] text-[#777777] border-[#E9E9E9]";
  }
  return "bg-[#EEEEED] text-[#777777] border-[#E9E9E9]";
}

export function Badge(props) {
  let extraClass = "";
  if (props.className) {
    extraClass = " " + props.className;
  }
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium " +
        getToneClasses(props.tone) +
        extraClass
      }
    >
      {props.children}
    </span>
  );
}
