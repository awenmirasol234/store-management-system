import { useState } from "react";
import { formatPeso } from "../format.js";

export function MultiTrendBarChart(props) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const data = props.data || [];

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-[#FBFBFA] font-mono text-xs text-[#777777]">
        No performance records for this period.
      </div>
    );
  }

  let maxVal = 1;
  for (let i = 0; i < data.length; i++) {
    const s = Number(data[i].sales || 0);
    const p = Number(data[i].profit || 0);
    if (s > maxVal) {
      maxVal = s;
    }
    if (p > maxVal) {
      maxVal = p;
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-end gap-4 text-xs font-medium text-[#777777]">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-[#171717]" />
          <span>Sales</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-[#B9F36B]" />
          <span>Profit</span>
        </div>
      </div>

      <div className="relative flex h-52 w-full items-end gap-3 pt-6 pb-6">
        {data.map(function (item, index) {
          const salesVal = Number(item.sales || 0);
          const profitVal = Math.max(0, Number(item.profit || 0));
          const salesHeight = Math.max(4, Math.round((salesVal / maxVal) * 100));
          const profitHeight = Math.max(4, Math.round((profitVal / maxVal) * 100));
          const isHovered = hoveredIndex === index;

          let multiTooltipElement = null;
          if (isHovered) {
            multiTooltipElement = (
              <div className="absolute -top-10 z-10 whitespace-nowrap rounded-lg bg-[#171717] p-2 font-mono text-xs text-white shadow-lg">
                <div className="text-gray-300">{item.label}</div>
                <div className="flex gap-2">
                  <span>Sales: {formatPeso(salesVal)}</span>
                  <span className="text-[#B9F36B]">Profit: {formatPeso(profitVal)}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.label || index}
              className="group relative flex flex-1 flex-col items-center h-full justify-end"
              onMouseEnter={function () {
                setHoveredIndex(index);
              }}
              onMouseLeave={function () {
                setHoveredIndex(null);
              }}
            >
              {multiTooltipElement}

              <div className="flex h-full w-full max-w-[48px] items-end justify-center gap-1">
                <div
                  style={{ height: salesHeight + "%" }}
                  className="flex-1 rounded-t-sm bg-[#171717] hover:opacity-80 transition-all"
                />
                <div
                  style={{ height: profitHeight + "%" }}
                  className="flex-1 rounded-t-sm bg-[#B9F36B] hover:opacity-80 transition-all"
                />
              </div>

              <div className="mt-2 truncate font-mono text-xs text-[#777777] max-w-full text-center">
                {item.shortLabel || item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
