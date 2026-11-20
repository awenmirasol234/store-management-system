import { useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingBag,
  Store
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "pos", label: "POS", icon: ShoppingBag },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "reports", label: "Reports", icon: BarChart3 }
];

export function Sidebar(props) {
  const [collapsed, setCollapsed] = useState(function initCollapsed() {
    try {
      return localStorage.getItem("storeflow_sidebar_collapsed") === "true";
    } catch (error) {
      return false;
    }
  });

  function handleToggle() {
    const nextState = !collapsed;
    setCollapsed(nextState);
    try {
      localStorage.setItem("storeflow_sidebar_collapsed", String(nextState));
    } catch (error) {
      // ignore storage error
    }
  }

  let asideClass =
    "hidden md:flex shrink-0 flex-col bg-[#181B2C] text-slate-300 select-none transition-all duration-200 ease-in-out ";
  if (collapsed) {
    asideClass = asideClass + "w-20";
  } else {
    asideClass = asideClass + "w-60";
  }

  let headerElement = null;
  if (collapsed) {
    headerElement = (
      <div className="flex flex-col items-center gap-3 py-6">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0"
          title="StoreFlow POS"
        >
          <Store className="h-5 w-5" />
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  } else {
    headerElement = (
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">StoreFlow</div>
            <div className="text-xs text-slate-400">POS</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  let footerElement = null;
  if (collapsed) {
    footerElement = (
      <div className="border-t border-white/10 p-5 flex justify-center">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-300 shrink-0"
          title="Store Owner (Cashier)"
        >
          OW
        </div>
      </div>
    );
  } else {
    footerElement = (
      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-300 shrink-0">
            OW
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">Store Owner</div>
            <div className="text-tiny text-slate-400">Cashier</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className={asideClass}>
      {headerElement}

      <nav className="flex-1 space-y-1.5 px-3 py-3">
        {NAV_ITEMS.map(function renderNavItem(item) {
          const IconComponent = item.icon;
          const isActive = props.activePage === item.key;
          let itemClass =
            "flex w-full items-center rounded-lg text-sm font-medium transition-colors cursor-pointer ";
          if (collapsed) {
            itemClass = itemClass + "justify-center px-0 py-3 ";
          } else {
            itemClass = itemClass + "gap-3.5 px-4 py-3 ";
          }

          if (isActive) {
            itemClass = itemClass + "bg-blue-600 text-white";
          } else {
            itemClass = itemClass + "text-slate-300 hover:bg-white/5 hover:text-white";
          }

          let labelSpan = <span>{item.label}</span>;
          if (collapsed) {
            labelSpan = null;
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={function selectPage() {
                props.onNavigate(item.key);
              }}
              title={item.label}
              className={itemClass}
            >
              <IconComponent className="h-4 w-4 shrink-0" />
              {labelSpan}
            </button>
          );
        })}
      </nav>

      {footerElement}
    </aside>
  );
}
