import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Ruler, X } from "lucide-react";

export function getBreakpoint(width) {
  if (width >= 1536) {
    return { name: "2xl", min: 1536, label: "2XL (≥1536px)" };
  }
  if (width >= 1280) {
    return { name: "xl", min: 1280, label: "XL (≥1280px)" };
  }
  if (width >= 1024) {
    return { name: "lg", min: 1024, label: "LG (≥1024px)" };
  }
  if (width >= 768) {
    return { name: "md", min: 768, label: "MD (≥768px)" };
  }
  if (width >= 640) {
    return { name: "sm", min: 640, label: "SM (≥640px)" };
  }
  return { name: "xs", min: 0, label: "XS (<640px)" };
}

export const SPACING_SCALE = [
  { token: "1", px: 4, rem: "0.25rem" },
  { token: "1.5", px: 6, rem: "0.375rem" },
  { token: "2", px: 8, rem: "0.5rem" },
  { token: "2.5", px: 10, rem: "0.625rem" },
  { token: "3", px: 12, rem: "0.75rem" },
  { token: "3.5", px: 14, rem: "0.875rem" },
  { token: "4", px: 16, rem: "1rem" },
  { token: "5", px: 20, rem: "1.25rem" },
  { token: "6", px: 24, rem: "1.5rem" },
  { token: "7", px: 28, rem: "1.75rem" },
  { token: "8", px: 32, rem: "2rem" },
  { token: "10", px: 40, rem: "2.5rem" }
];

export function DebugOverlay(props) {
  const [dimensions, setDimensions] = useState(function () {
    if (typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 1024, height: 768 };
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(function () {
    if (props && props.defaultVisible !== undefined) {
      return props.defaultVisible;
    }
    if (typeof window !== "undefined") {
      const hasQuery = window.location.search.includes("debug=1");
      return hasQuery;
    }
    return false;
  });

  useEffect(function initWindowListeners() {
    function handleResize() {
      if (typeof window !== "undefined") {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }
    }

    function handleKeyDown(event) {
      // Toggle visibility with Alt+D or Ctrl+Shift+D
      if ((event.altKey && event.key.toLowerCase() === "d") ||
          (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d")) {
        event.preventDefault();
        setIsVisible(function (prev) {
          return !prev;
        });
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      window.addEventListener("keydown", handleKeyDown);
      return function cleanup() {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  const bp = getBreakpoint(dimensions.width);

  // Compact floating pill when minimized
  if (!isExpanded) {
    return (
      <div
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-xl border border-[#262626] bg-[#171717] px-3 py-1.5 font-mono text-xs text-white shadow-xl md:bottom-4"
        title="Live Responsive Overlay (Alt+D to toggle, click to expand)"
      >
        <span className="flex h-2 w-2 rounded-full bg-[#B9F36B] animate-pulse" />
        <span className="font-bold text-[#B9F36B] uppercase">{bp.name.toUpperCase()}</span>
        <span className="text-[#A3A3A3]">
          {String(dimensions.width) + "px × " + String(dimensions.height) + "px"}
        </span>
        <button
          type="button"
          onClick={function () {
            setIsExpanded(true);
          }}
          className="ml-1 rounded p-1 text-[#A3A3A3] hover:text-white cursor-pointer"
          title="Expand Details"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={function () {
            setIsVisible(false);
          }}
          className="rounded p-1 text-[#A3A3A3] hover:text-rose-400 cursor-pointer"
          title="Hide Overlay (Press Alt+D to reopen)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Expanded panel displaying width, breakpoints, and spacing scale
  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 rounded-2xl border border-[#262626] bg-[#171717] p-4 font-mono text-xs text-white shadow-2xl md:bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-[#B9F36B]" />
          <span className="font-bold text-sm text-white">Debug Metrics</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={function () {
              setIsExpanded(false);
            }}
            className="rounded p-1 text-[#A3A3A3] hover:text-white cursor-pointer"
            title="Minimize"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={function () {
              setIsVisible(false);
            }}
            className="rounded p-1 text-[#A3A3A3] hover:text-rose-400 cursor-pointer"
            title="Close (Alt+D to reopen)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Live Viewport & Breakpoint */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-[#262626] bg-[#222222] p-2.5">
          <div className="text-[#A3A3A3]">Viewport</div>
          <div className="mt-1 font-bold text-sm text-[#B9F36B]">
            {dimensions.width} × {dimensions.height}
          </div>
          <div className="mt-0.5 text-2xs text-[#777777]">pixels (px)</div>
        </div>
        <div className="rounded-xl border border-[#262626] bg-[#222222] p-2.5">
          <div className="text-[#A3A3A3]">Breakpoint</div>
          <div className="mt-1 font-bold text-sm text-white uppercase">{bp.name}</div>
          <div className="mt-0.5 text-2xs text-[#777777]">{bp.label}</div>
        </div>
      </div>

      {/* Breakpoint Range Guide */}
      <div className="mt-3">
        <div className="text-2xs font-semibold uppercase text-[#A3A3A3] mb-1.5">
          Active Breakpoints
        </div>
        <div className="grid grid-cols-6 gap-1 text-center text-2xs">
          {["xs", "sm", "md", "lg", "xl", "2xl"].map(function (step) {
            const isCurrent = step === bp.name;
            let stepClass = "rounded py-1 font-semibold uppercase transition-colors bg-[#262626] text-[#777777]";
            if (isCurrent) {
              stepClass = "rounded py-1 font-semibold uppercase transition-colors bg-[#B9F36B] text-[#171717] shadow";
            }
            return (
              <div
                key={step}
                className={stepClass}
              >
                {step}
              </div>
            );
          })}
        </div>
      </div>

      {/* Spacing Reference Matrix */}
      <div className="mt-3.5">
        <div className="text-2xs font-semibold uppercase text-[#A3A3A3] mb-1.5">
          Tailwind Spacing Scale
        </div>
        <div className="max-h-36 overflow-y-auto no-scrollbar rounded-xl border border-[#262626] bg-[#222222]">
          <table className="w-full text-left text-2xs">
            <thead className="border-b border-[#262626] bg-[#1a1a1a] text-[#A3A3A3]">
              <tr>
                <th className="px-2.5 py-1.5">Token</th>
                <th className="px-2.5 py-1.5 text-right">Pixels</th>
                <th className="px-2.5 py-1.5 text-right">REM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {SPACING_SCALE.map(function (s) {
                return (
                  <tr key={s.token} className="hover:bg-[#2a2a2a]/50">
                    <td className="px-2.5 py-1 font-bold text-[#B9F36B]">{s.token}</td>
                    <td className="px-2.5 py-1 text-right text-white font-medium">{s.px}px</td>
                    <td className="px-2.5 py-1 text-right text-[#A3A3A3]">{s.rem}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shortcut note */}
      <div className="mt-2.5 text-center text-2xs text-[#777777]">
        Toggle overlay with <kbd className="rounded bg-[#262626] px-1 py-0.5 text-white">Alt+D</kbd>
      </div>
    </div>
  );
}
