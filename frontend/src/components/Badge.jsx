function getToneClasses(tone) {
  if (tone === "green") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
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
  return "bg-slate-100 text-slate-700 border-slate-200";
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
