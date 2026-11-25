import { useState } from "react";
import { formatPeso } from "../format.js";

export function LineChart(props) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
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

  // Calculate scaling boundaries
  let maxVal = 1;
  let totalSales = 0;
  let totalProfit = 0;

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

  // Rounded grid ceiling for clean ticks
  const chartWidth = 500;
  const chartHeight = 200;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const bottomY = paddingTop + plotHeight;

  // Build coordinate points
  const points = [];
  for (let i = 0; i < data.length; i++) {
    let x = paddingLeft;
    if (data.length > 1) {
      x = paddingLeft + (i / (data.length - 1)) * plotWidth;
    } else {
      x = paddingLeft + plotWidth / 2;
    }

    const salesVal = Math.max(0, Number(data[i].sales || 0));
    const profitVal = Math.max(0, Number(data[i].profit || 0));

    const salesY = paddingTop + plotHeight - (salesVal / maxVal) * plotHeight;
    const profitY = paddingTop + plotHeight - (profitVal / maxVal) * plotHeight;

    points.push({
      x: x,
      salesY: salesY,
      profitY: profitY,
      sales: salesVal,
      profit: profitVal,
      item: data[i]
    });
  }

  // Build SVG polyline paths
  let salesPointsString = "";
  let profitPointsString = "";
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    salesPointsString = salesPointsString + (i === 0 ? "M " : " L ") + pt.x + " " + pt.salesY;
    profitPointsString = profitPointsString + (i === 0 ? "M " : " L ") + pt.x + " " + pt.profitY;
  }

  let salesAreaString = "";
  let profitAreaString = "";
  if (points.length > 0) {
    salesAreaString =
      salesPointsString +
      " L " +
      points[points.length - 1].x +
      " " +
      bottomY +
      " L " +
      points[0].x +
      " " +
      bottomY +
      " Z";

    profitAreaString =
      profitPointsString +
      " L " +
      points[points.length - 1].x +
      " " +
      bottomY +
      " L " +
      points[0].x +
      " " +
      bottomY +
      " Z";
  }

  // Tooltip presentation
  let activePoint = null;
  let tooltipLeftPercent = 50;
  if (hoveredIndex !== null && points[hoveredIndex]) {
    activePoint = points[hoveredIndex];
    tooltipLeftPercent = (activePoint.x / chartWidth) * 100;
  }

  let tooltipAlignmentClass = "-translate-x-1/2";
  if (tooltipLeftPercent < 25) {
    tooltipAlignmentClass = "translate-x-0";
  } else if (tooltipLeftPercent > 75) {
    tooltipAlignmentClass = "-translate-x-full";
  }

  let wrapperExtraClass = "";
  if (props.className) {
    wrapperExtraClass = " " + props.className;
  }

  return (
    <div className={"flex flex-col" + wrapperExtraClass}>
      {/* Chart Legend & Summary Totals */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-[#777777]">
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
          <span>Sales: <strong className="text-[#171717]">{formatPeso(totalSales)}</strong></span>
          <span>Profit: <strong className="text-[#171717]">{formatPeso(totalProfit)}</strong></span>
        </div>
      </div>

      {/* Responsive SVG Chart Canvas */}
      <div className="relative w-full">
        {activePoint && (
          <div
            style={{ left: tooltipLeftPercent + "%" }}
            className={
              "pointer-events-none absolute -top-3 z-20 whitespace-nowrap rounded-xl bg-[#171717] p-2.5 font-mono text-xs text-white shadow-xl transition-all duration-75 " +
              tooltipAlignmentClass
            }
          >
            <div className="mb-1 text-2xs text-[#A3A3A3]">
              {activePoint.item.fullDate || activePoint.item.label}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white">
                Sales: {formatPeso(activePoint.sales)}
              </span>
              <span className="font-semibold text-[#B9F36B]">
                Profit: {formatPeso(activePoint.profit)}
              </span>
            </div>
            {activePoint.item.meta && (
              <div className="mt-0.5 text-3xs text-[#A3A3A3]">{activePoint.item.meta}</div>
            )}
          </div>
        )}

        <svg
          viewBox={"0 0 " + chartWidth + " " + chartHeight}
          className="h-52 w-full overflow-visible"
          role="img"
          aria-label="Sales and Profit line chart"
        >
          <defs>
            <linearGradient id="sales-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#171717" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#171717" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="profit-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B9F36B" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#B9F36B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference Gridlines & Y-Axis Labels */}
          <g className="gridlines">
            {/* Top reference line (100%) */}
            <line
              x1={paddingLeft}
              x2={chartWidth - paddingRight}
              y1={paddingTop}
              y2={paddingTop}
              stroke="#E9E9E9"
              strokeDasharray="2 2"
            />
            <text
              x={paddingLeft - 8}
              y={paddingTop + 3}
              textAnchor="end"
              className="fill-[#777777] font-mono text-3xs"
            >
              {formatPeso(maxVal)}
            </text>

            {/* Middle reference line (50%) */}
            <line
              x1={paddingLeft}
              x2={chartWidth - paddingRight}
              y1={paddingTop + plotHeight / 2}
              y2={paddingTop + plotHeight / 2}
              stroke="#E9E9E9"
              strokeDasharray="2 2"
            />
            <text
              x={paddingLeft - 8}
              y={paddingTop + plotHeight / 2 + 3}
              textAnchor="end"
              className="fill-[#777777] font-mono text-3xs"
            >
              {formatPeso(maxVal / 2)}
            </text>

            {/* Bottom reference baseline (0) */}
            <line
              x1={paddingLeft}
              x2={chartWidth - paddingRight}
              y1={bottomY}
              y2={bottomY}
              stroke="#E9E9E9"
            />
            <text
              x={paddingLeft - 8}
              y={bottomY + 3}
              textAnchor="end"
              className="fill-[#777777] font-mono text-3xs"
            >
              ₱0
            </text>
          </g>

          {/* Area Fills */}
          <path d={salesAreaString} fill="url(#sales-gradient)" />
          <path d={profitAreaString} fill="url(#profit-gradient)" />

          {/* Vertical Hover Crosshair */}
          {activePoint && (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={paddingTop}
              y2={bottomY}
              stroke="#171717"
              strokeWidth="1"
              strokeDasharray="3 3"
              className="opacity-40"
            />
          )}

          {/* Primary Trend Lines */}
          <path
            d={salesPointsString}
            fill="none"
            stroke="#171717"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={profitPointsString}
            fill="none"
            stroke="#B9F36B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Circular Data Markers & Interactive Hover Hitboxes */}
          {points.map(function (pt, index) {
            const isHovered = hoveredIndex === index;
            const markerSalesRadius = isHovered ? 5 : 3;
            const markerProfitRadius = isHovered ? 5 : 3;

            return (
              <g key={pt.item.label || index}>
                {/* Sales Marker */}
                <circle
                  cx={pt.x}
                  cy={pt.salesY}
                  r={markerSalesRadius}
                  fill="#FFFFFF"
                  stroke="#171717"
                  strokeWidth="2"
                />

                {/* Profit Marker */}
                <circle
                  cx={pt.x}
                  cy={pt.profitY}
                  r={markerProfitRadius}
                  fill="#FFFFFF"
                  stroke="#B9F36B"
                  strokeWidth="2"
                />

                {/* X-Axis Date Label */}
                <text
                  x={pt.x}
                  y={bottomY + 16}
                  textAnchor="middle"
                  className={
                    "font-mono text-3xs transition-colors " +
                    (isHovered ? "fill-[#171717] font-semibold" : "fill-[#777777]")
                  }
                >
                  {pt.item.shortLabel || pt.item.label}
                </text>

                {/* Full-height Transparent Column Hitbox for Easy Hovering */}
                <rect
                  x={pt.x - plotWidth / (points.length * 2 || 2)}
                  y={paddingTop}
                  width={plotWidth / (points.length || 1)}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={function () {
                    setHoveredIndex(index);
                  }}
                  onMouseLeave={function () {
                    setHoveredIndex(null);
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
