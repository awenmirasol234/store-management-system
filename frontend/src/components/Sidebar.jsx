import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut, Store, Users } from "lucide-react";
import { getFilteredNavItems } from "../navigation.js";

export function Sidebar(props) {
  const [collapsed, setCollapsed] = useState(function initCollapsed() {
    try {
      return localStorage.getItem("storeflow_sidebar_collapsed") === "true";
    } catch (error) {
      return false;
    }
  });

  const user = props.currentUser;
  let initials = "OW";
  let displayName = "Store Owner";
  let displayRole = "Owner";
  if (user) {
    if (user.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length >= 2) {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    } else if (user.username) {
      initials = user.username.slice(0, 2).toUpperCase();
    }
    displayName = user.full_name || user.username;
    if (user.role === "OWNER") {
      displayRole = "Owner";
    } else {
      displayRole = "Cashier";
    }
  }

  const isOwner = Boolean(user && user.role === "OWNER");
  let userRole = null;
  if (user) {
    userRole = user.role;
  }
  const navItems = getFilteredNavItems(userRole);

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
      <div className="border-t border-white/10 p-3 flex flex-col items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-300 shrink-0"
          title={displayName + " (" + displayRole + ")"}
        >
          {initials}
        </div>
        {props.onLogout ? (
          <button
            type="button"
            onClick={props.onLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  } else {
    footerElement = (
      <div className="border-t border-white/10 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-300 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">{displayName}</div>
              <div className="text-tiny text-slate-400">{displayRole}</div>
            </div>
          </div>
          {props.onLogout ? (
            <button
              type="button"
              onClick={props.onLogout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {isOwner && props.onOpenUserModal ? (
          <button
            type="button"
            onClick={props.onOpenUserModal}
            className="flex w-full items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-2xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span>Manage Staff</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <aside className={asideClass}>
      {headerElement}

      <nav className="flex-1 space-y-1.5 px-3 py-3">
        {navItems.map(function renderNavItem(item) {
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
