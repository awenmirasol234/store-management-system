import { ArrowDown, ArrowUp, Minus } from "lucide-react";

function renderTrendPill(trend, trendLabel) {
  if (!trend || !trend.label) {
    return null;
  }

  let toneClasses = "bg-[#EEEEED] text-[#777777] border-[#E9E9E9]";
  let TrendIcon = Minus;

  if (trend.direction === "up") {
    toneClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
    TrendIcon = ArrowUp;
  } else if (trend.direction === "down") {
    toneClasses = "bg-rose-50 text-rose-700 border-rose-200";
    TrendIcon = ArrowDown;
  }

  let ariaLabel = "Trend: " + trend.label;
  if (trendLabel) {
    ariaLabel = trendLabel + ": " + trend.label;
  }

  return (
    <span
      title={trendLabel}
      aria-label={ariaLabel}
      className={
        "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-mono text-2xs font-semibold tabular-nums whitespace-nowrap " +
        toneClasses
      }
    >
      <TrendIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{trend.label}</span>
    </span>
  );
}

export function StatCard(props) {
  const trendElement = renderTrendPill(props.trend, props.trendLabel);

  let footerElement = null;
  if (props.meta) {
    footerElement = <div className="mt-1.5 font-mono text-xs text-[#777777]">{props.meta}</div>;
  }

  return (
    <div className="rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-xs font-semibold text-[#777777]">
          {props.label}
        </div>
        {trendElement}
      </div>
      <div className="mt-2 font-mono text-2xl font-bold text-[#171717]">
        {props.value}
      </div>
      {footerElement}
    </div>
  );
}
