function getValueToneClass(tone) {
  if (tone === "blue") {
    return "text-blue-600";
  }
  if (tone === "green") {
    return "text-emerald-600";
  }
  if (tone === "amber") {
    return "text-amber-600";
  }
  return "text-slate-900";
}

export function StatCard(props) {
  const IconComponent = props.icon;
  let iconElement = null;
  if (IconComponent) {
    iconElement = (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <IconComponent className="h-5 w-5" />
      </div>
    );
  }

  let footerElement = null;
  if (props.meta) {
    footerElement = <div className="mt-1.5 font-mono text-xs text-slate-500">{props.meta}</div>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-500">
            {props.label}
          </div>
          <div
            className={"mt-2 font-mono text-2xl font-bold " + getValueToneClass(props.tone)}
          >
            {props.value}
          </div>
          {footerElement}
        </div>
        {iconElement}
      </div>
    </div>
  );
}
