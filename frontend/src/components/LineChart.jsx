import { useId, useState } from "react";
import { formatCompactPeso, formatPeso } from "../format.js";
import { pickTickIndexes } from "../chart-data.js";

export function LineChart(props) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const reactId = useId();
  const profitGradientId = "profit-gradient-" + reactId.replace(/:/g, "");

  const data = props.data || [];

  if (data.length === 0) {
    let emptyText = "No trend data available for this range.";
    if (props.emptyMessage) {
      emptyText = props.emptyMessage;
    }
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-[#FBFBFA] font-mono text-xs text-[#777777]">
        {emptyText}
      </div>
    );
  }

  let totalSales = 0;
  let totalProfit = 0;
  let maxVal = 1;

  for (let i = 0; i < data.length; i++) {
    const s = Number(data[i].sales || 0);
    const p = Number(data[i].profit || 0);
    totalSales = totalSales + s;
    totalProfit = totalProfit + p;
    if (s > maxVal) {
      maxVal = s;
    }
    if (p > maxVal) {
      maxVal = p;
    }
  }

  // Build coordinate points
  const points = [];
  for (let i = 0; i < data.length; i++) {
    let xPercent = 50;
    if (data.length > 1) {
      xPercent = (i / (data.length - 1)) * 100;
    }

    const salesVal = Math.max(0, Number(data[i].sales || 0));
    const profitVal = Math.max(0, Number(data[i].profit || 0));

    const salesYPercent = 100 - (salesVal / maxVal) * 100;
    const profitYPercent = 100 - (profitVal / maxVal) * 100;

    points.push({
      index: i,
      xPercent: xPercent,
      salesYPercent: salesYPercent,
      profitYPercent: profitYPercent,
      sales: salesVal,
      profit: profitVal,
      item: data[i]
    });
  }

  // Build SVG path strings on a 0 0 100 100 grid
  let salesPathD = "";
  let profitPathD = "";
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    let prefix = " L ";
    if (i === 0) {
      prefix = "M ";
    }
    salesPathD = salesPathD + prefix + pt.xPercent + " " + pt.salesYPercent;
    profitPathD = profitPathD + prefix + pt.xPercent + " " + pt.profitYPercent;
  }

  let profitAreaD = "";
  if (points.length > 0) {
    const lastX = points[points.length - 1].xPercent;
    const firstX = points[0].xPercent;
    profitAreaD =
      profitPathD +
      " L " +
      lastX +
      " 100 L " +
      firstX +
      " 100 Z";
  }

  // Pick tick indices for X axis
  const tickIndices = pickTickIndexes({
    count: data.length,
    maxTicks: 6
  });

  const tickList = [];
  for (let t = 0; t < tickIndices.length; t++) {
    const index = tickIndices[t];
    if (points[index]) {
      tickList.push(points[index]);
    }
  }

  // Active hover/focus point
  let activePoint = null;
  if (hoveredIndex !== null && points[hoveredIndex]) {
    activePoint = points[hoveredIndex];
  }

  let tooltipAlignmentClass = "-translate-x-1/2";
  if (activePoint) {
    if (activePoint.xPercent < 25) {
      tooltipAlignmentClass = "translate-x-2";
    } else if (activePoint.xPercent > 75) {
      tooltipAlignmentClass = "-translate-x-full -translate-x-2";
    }
  }

  let tooltipTopPercent = 50;
  let tooltipYClass = "-translate-y-full -translate-y-3";
  if (activePoint) {
    const highestDot = Math.min(activePoint.salesYPercent, activePoint.profitYPercent);
    if (highestDot < 35) {
      tooltipTopPercent = Math.max(activePoint.salesYPercent, activePoint.profitYPercent);
      tooltipYClass = "translate-y-4";
    } else {
      tooltipTopPercent = highestDot;
      tooltipYClass = "-translate-y-full -translate-y-4";
    }
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (hoveredIndex === null) {
        setHoveredIndex(0);
      } else if (hoveredIndex < data.length - 1) {
        setHoveredIndex(hoveredIndex + 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (hoveredIndex === null) {
        setHoveredIndex(data.length - 1);
      } else if (hoveredIndex > 0) {
        setHoveredIndex(hoveredIndex - 1);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setHoveredIndex(null);
    }
  }

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const relativeX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
    const nearestIndex = Math.round(ratio * (data.length - 1));
    setHoveredIndex(nearestIndex);
  }

  let wrapperExtraClass = "";
  if (props.className) {
    wrapperExtraClass = " " + props.className;
  }

  const ariaDescription =
    "Sales and profit trend chart. Total sales: " +
    formatPeso(totalSales) +
    ", net profit: " +
    formatPeso(totalProfit);

  return (
    <div className={"flex flex-col select-none" + wrapperExtraClass}>
      {/* Legend & Summary Totals */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-[#777777]">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-[#171717]" />
            <span className="text-[#171717]">Gross Sales</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-[#B9F36B]" />
            <span className="text-[#171717]">Net Profit</span>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-2xs text-[#777777]">
          <span>
            Sales: <strong className="text-[#171717]">{formatPeso(totalSales)}</strong>
          </span>
          <span>
            Profit: <strong className="text-[#171717]">{formatPeso(totalProfit)}</strong>
          </span>
        </div>
      </div>

      {/* Main Plot Area */}
      <div className="flex items-stretch gap-2">
        {/* Y-Axis HTML Labels */}
        <div className="relative flex w-12 sm:w-14 shrink-0 flex-col justify-between py-1 text-right font-mono text-3xs text-[#777777]">
          <span className="truncate">{formatCompactPeso(maxVal)}</span>
          <span className="truncate">{formatCompactPeso(maxVal / 2)}</span>
          <span className="truncate">₱0</span>
        </div>

        {/* Responsive Interactive Canvas */}
        <div
          role="img"
          aria-label={ariaDescription}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={function () {
            setHoveredIndex(null);
          }}
          className="relative h-48 sm:h-56 lg:h-60 flex-1 cursor-crosshair rounded-xl border border-[#E9E9E9]/60 bg-[#FAFAFA]/40 focus:outline-none focus:ring-1 focus:ring-[#171717]"
        >
          {/* Subtle Horizontal Reference Gridlines */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-[#E9E9E9]" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#E9E9E9]" />
            <div className="absolute inset-x-0 bottom-0 border-t border-[#E9E9E9]" />
          </div>

          {/* SVG Shape Layer */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible chart-line-animate"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={profitGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B9F36B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#B9F36B" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Profit Area Fill */}
            <path d={profitAreaD} fill={"url(#" + profitGradientId + ")"} />

            {/* Net Profit Trend Line */}
            <path
              d={profitPathD}
              fill="none"
              stroke="#B9F36B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Gross Sales Trend Line */}
            <path
              d={salesPathD}
              fill="none"
              stroke="#171717"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Active Hover / Focus Vertical Crosshair */}
          {activePoint && (
            <div
              style={{ left: activePoint.xPercent + "%" }}
              className="pointer-events-none absolute inset-y-0 w-px border-l border-dashed border-[#171717]/40"
            />
          )}

          {/* Active Hover / Focus Markers */}
          {activePoint && (
            <>
              {/* Sales Marker Dot */}
              <div
                style={{
                  left: activePoint.xPercent + "%",
                  top: activePoint.salesYPercent + "%"
                }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#171717] shadow-xs"
              />
              {/* Profit Marker Dot */}
              <div
                style={{
                  left: activePoint.xPercent + "%",
                  top: activePoint.profitYPercent + "%"
                }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#B9F36B] shadow-xs"
              />
            </>
          )}

          {/* Floating Interactive Tooltip */}
          {activePoint && (
            <div
              style={{
                left: activePoint.xPercent + "%",
                top: tooltipTopPercent + "%"
              }}
              className={
                "pointer-events-none absolute z-20 whitespace-nowrap rounded-xl bg-[#171717] p-2.5 font-mono text-xs text-white shadow-xl transition-all duration-75 " +
                tooltipAlignmentClass +
                " " +
                tooltipYClass
              }
            >
              <div className="mb-1 text-2xs text-[#A3A3A3]">
                {activePoint.item.label || activePoint.item.date}
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Sales: {formatPeso(activePoint.sales)}
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-[#B9F36B]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B9F36B]" />
                  Profit: {formatPeso(activePoint.profit)}
                </span>
              </div>
              {activePoint.item.meta && (
                <div className="mt-1 text-3xs text-[#A3A3A3]">
                  {activePoint.item.meta}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* X-Axis HTML Labels Container */}
      <div className="relative mt-2 ml-14 sm:ml-16 h-5">
        {tickList.map(function (tick) {
          let alignClass = "-translate-x-1/2 text-center";
          if (tick.index === 0) {
            alignClass = "translate-x-0 text-left";
          } else if (tick.index === data.length - 1) {
            alignClass = "-translate-x-full text-right";
          }

          const isHovered = hoveredIndex === tick.index;
          let textStyle = "text-[#777777]";
          if (isHovered) {
            textStyle = "font-semibold text-[#171717]";
          }

          const tickDisplay = tick.item.tickLabel || tick.item.shortLabel || tick.item.label;

          return (
            <span
              key={tick.item.date || tick.index}
              style={{ left: tick.xPercent + "%" }}
              className={
                "absolute top-0 font-mono text-3xs transition-colors " +
                alignClass +
                " " +
                textStyle
              }
            >
              {tickDisplay}
            </span>
          );
        })}
      </div>
    </div>
  );
}
