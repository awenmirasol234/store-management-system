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
  let largeArcFlag = 0;
  if (endAngle - startAngle > 180) {
    largeArcFlag = 1;
  }

  if (innerR <= 0) {
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

  let total = 0;
  const validItems = [];
  for (let i = 0; i < rawData.length; i++) {
    const val = Number(rawData[i].value || 0);
    if (val > 0) {
      total = total + val;
      let itemColor = rawData[i].color;
      if (!itemColor) {
        itemColor = DEFAULT_PALETTE[validItems.length % DEFAULT_PALETTE.length];
      }
      validItems.push({
        label: rawData[i].label,
        value: val,
        count: rawData[i].count,
        color: itemColor
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
  const svgSize = 200;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const outerR = 85;
  let innerR = 54;
  if (!isDonut) {
    innerR = 0;
  }

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

  let activeSlice = null;
  if (hoveredIndex !== null && slices[hoveredIndex]) {
    activeSlice = slices[hoveredIndex];
  }

  let centerLabelText = props.centerLabel || "Total";
  let centerValueText = formatPeso(total);
  let centerSubtext = validItems.length + " categories";
  if (props.centerCaption) {
    centerSubtext = props.centerCaption;
  }

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
    <div className={"@container flex flex-col justify-center" + wrapperExtraClass}>
      <div className="flex flex-col items-center gap-4 @md:flex-row @md:items-center @md:justify-between">
        {/* Donut Visualization */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            viewBox={"0 0 " + svgSize + " " + svgSize}
            className="w-36 h-36 @md:w-40 @md:h-40 overflow-visible chart-donut-animate"
            role="img"
            aria-label="Distribution pie chart"
          >
            {slices.map(function (slice, index) {
              const isHovered = hoveredIndex === index;
              let sliceOpacity = "opacity-100";
              let strokeClass = "stroke-white";
              let strokeWidth = "2";

              if (hoveredIndex !== null) {
                if (isHovered) {
                  sliceOpacity = "opacity-100";
                  strokeClass = "stroke-[#171717]";
                  strokeWidth = "2.5";
                } else {
                  sliceOpacity = "opacity-40";
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

          {/* Donut Center Caption */}
          {isDonut && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-2 chart-center-animate">
              <span className="truncate max-w-[85px] text-3xs font-medium text-[#777777] uppercase tracking-wider">
                {centerLabelText}
              </span>
              <span className="font-mono text-xs @md:text-sm font-bold text-[#171717] leading-tight">
                {centerValueText}
              </span>
              <span className="font-mono text-3xs text-[#777777] mt-0.5">
                {centerSubtext}
              </span>
            </div>
          )}
        </div>

        {/* Legend Button List */}
        <div className="w-full flex-1 space-y-1 chart-legend-animate">
          {slices.map(function (slice, index) {
            const isHovered = hoveredIndex === index;
            let itemBg = "hover:bg-[#EEEEED]/60";
            if (isHovered) {
              itemBg = "bg-[#EEEEED] shadow-2xs";
            }

            return (
              <button
                type="button"
                key={slice.item.label || index}
                onMouseEnter={function () {
                  setHoveredIndex(index);
                }}
                onMouseLeave={function () {
                  setHoveredIndex(null);
                }}
                onFocus={function () {
                  setHoveredIndex(index);
                }}
                onBlur={function () {
                  setHoveredIndex(null);
                }}
                className={
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#171717] " +
                  itemBg
                }
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
                <div className="flex items-center gap-1.5 font-mono text-2xs shrink-0">
                  <span className="font-semibold text-[#171717]">
                    {formatPeso(slice.item.value)}
                  </span>
                  <span className="rounded bg-[#EEEEED] px-1 py-0.5 text-[#777777]">
                    {slice.percentage + "%"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
