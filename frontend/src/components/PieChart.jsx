import { useState } from "react";
import { formatPeso } from "../format.js";

const DEFAULT_PALETTE = [
  "#171717",
  "#B9F36B",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#10B981",
  "#EC4899",
  "#6B7280"
];

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians)
  };
}

function buildArcPath(cx, cy, r, innerR, startAngle, endAngle) {
  const outerStart = polarToCartesian(cx, cy, r, startAngle);
  const outerEnd = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  if (innerR <= 0) {
    // Solid Pie Slice
    return (
      "M " +
      cx +
      " " +
      cy +
      " L " +
      outerStart.x +
      " " +
      outerStart.y +
      " A " +
      r +
      " " +
      r +
      " 0 " +
      largeArcFlag +
      " 1 " +
      outerEnd.x +
      " " +
      outerEnd.y +
      " Z"
    );
  }

  // Donut Ring Slice
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);

  return (
    "M " +
    outerStart.x +
    " " +
    outerStart.y +
    " A " +
    r +
    " " +
    r +
    " 0 " +
    largeArcFlag +
    " 1 " +
    outerEnd.x +
    " " +
    outerEnd.y +
    " L " +
    innerEnd.x +
    " " +
    innerEnd.y +
    " A " +
    innerR +
    " " +
    innerR +
    " 0 " +
    largeArcFlag +
    " 0 " +
    innerStart.x +
    " " +
    innerStart.y +
    " Z"
  );
}

export function PieChart(props) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const rawData = props.data || [];

  // Filter non-zero items and compute total
  let total = 0;
  const validItems = [];
  for (let i = 0; i < rawData.length; i++) {
    const val = Number(rawData[i].value || 0);
    if (val > 0) {
      total = total + val;
      validItems.push({
        label: rawData[i].label,
        value: val,
        count: rawData[i].count,
        color: rawData[i].color || DEFAULT_PALETTE[validItems.length % DEFAULT_PALETTE.length]
      });
    }
  }

  if (validItems.length === 0 || total <= 0) {
    let emptyText = "No distribution data available.";
    if (props.emptyMessage) {
      emptyText = props.emptyMessage;
    }
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-[#FBFBFA] font-mono text-xs text-[#777777]">
        {emptyText}
      </div>
    );
  }

  const isDonut = props.donut !== false;
  const svgSize = 220;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const outerR = 85;
  const innerR = isDonut ? 55 : 0;

  // Build slice paths
  const slices = [];
  let currentAngle = 0;

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const percentage = Math.round((item.value / total) * 1000) / 10;

    let pathD = "";
    if (validItems.length === 1) {
      // SVG arc cannot do a complete 360 circle in one path; use two 180 arcs
      const midAngle = startAngle + 180;
      pathD =
        buildArcPath(cx, cy, outerR, innerR, startAngle, midAngle) +
        " " +
        buildArcPath(cx, cy, outerR, innerR, midAngle, startAngle + 360);
    } else {
      pathD = buildArcPath(cx, cy, outerR, innerR, startAngle, endAngle);
    }

    slices.push({
      item: item,
      pathD: pathD,
      percentage: percentage,
      color: item.color
    });
  }

  // Active slice details for center / tooltip display
  let activeSlice = null;
  if (hoveredIndex !== null && slices[hoveredIndex]) {
    activeSlice = slices[hoveredIndex];
  }

  let centerLabelText = props.centerLabel || "Total";
  let centerValueText = formatPeso(total);
  let centerSubtext = validItems.length + " categories";

  if (activeSlice) {
    centerLabelText = activeSlice.item.label;
    centerValueText = formatPeso(activeSlice.item.value);
    centerSubtext = activeSlice.percentage + "% share";
  }

  let wrapperExtraClass = "";
  if (props.className) {
    wrapperExtraClass = " " + props.className;
  }

  return (
    <div className={"flex flex-col" + wrapperExtraClass}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* SVG Donut / Pie Visualization */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            viewBox={"0 0 " + svgSize + " " + svgSize}
            className="h-48 w-48 overflow-visible"
            role="img"
            aria-label="Distribution pie chart"
          >
            {slices.map(function (slice, index) {
              const isHovered = hoveredIndex === index;
              let sliceOpacity = "opacity-95";
              let strokeClass = "stroke-white";
              let strokeWidth = "2";

              if (hoveredIndex !== null) {
                if (isHovered) {
                  sliceOpacity = "opacity-100";
                  strokeClass = "stroke-[#171717]";
                  strokeWidth = "2.5";
                } else {
                  sliceOpacity = "opacity-50";
                }
              }

              return (
                <path
                  key={slice.item.label || index}
                  d={slice.pathD}
                  fill={slice.color}
                  strokeWidth={strokeWidth}
                  className={
                    "cursor-pointer transition-all duration-150 " +
                    strokeClass +
                    " " +
                    sliceOpacity
                  }
                  onMouseEnter={function () {
                    setHoveredIndex(index);
                  }}
                  onMouseLeave={function () {
                    setHoveredIndex(null);
                  }}
                />
              );
            })}
          </svg>

          {/* Interactive Donut Center Badge */}
          {isDonut && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <span className="truncate max-w-[90px] text-3xs font-medium text-[#777777] uppercase tracking-wider">
                {centerLabelText}
              </span>
              <span className="font-mono text-sm font-bold text-[#171717] leading-tight">
                {centerValueText}
              </span>
              <span className="font-mono text-3xs text-[#777777] mt-0.5">
                {centerSubtext}
              </span>
            </div>
          )}
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-1.5 overflow-y-auto max-h-48 pr-1">
          {slices.map(function (slice, index) {
            const isHovered = hoveredIndex === index;
            let itemBg = "hover:bg-[#EEEEED]/50";
            if (isHovered) {
              itemBg = "bg-[#EEEEED] shadow-2xs";
            }

            return (
              <div
                key={slice.item.label || index}
                className={
                  "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer " +
                  itemBg
                }
                onMouseEnter={function () {
                  setHoveredIndex(index);
                }}
                onMouseLeave={function () {
                  setHoveredIndex(null);
                }}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate font-medium text-[#171717]">
                    {slice.item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-2xs shrink-0">
                  <span className="font-semibold text-[#171717]">
                    {formatPeso(slice.item.value)}
                  </span>
                  <span className="rounded bg-[#EEEEED] px-1 py-0.5 text-[#777777]">
                    {slice.percentage + "%"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
