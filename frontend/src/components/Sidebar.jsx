import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut, Store, Users, Wallet } from "lucide-react";
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
    "hidden md:flex shrink-0 flex-col bg-[#171717] text-white select-none transition-all duration-200 ease-in-out ";
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
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B9F36B] border border-[#A2E84D] border-b-2 border-b-[#8FD838] text-[#151515] shrink-0 shadow-xs"
          title="StoreFlow POS"
        >
          <Store className="h-5 w-5" />
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="rounded-lg p-1.5 text-[#A3A3A3] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  } else {
    headerElement = (
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B9F36B] border border-[#A2E84D] border-b-2 border-b-[#8FD838] text-[#151515] shrink-0 shadow-xs">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">StoreFlow</div>
            <div className="text-xs text-[#A3A3A3]">POS</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="rounded-lg p-1.5 text-[#A3A3A3] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  let logoutButton = null;
  if (props.onLogout) {
    logoutButton = (
      <button
        type="button"
        onClick={props.onLogout}
        title="Sign out"
        aria-label="Sign out"
        className="p-1.5 text-[#A3A3A3] hover:bg-rose-500/20 hover:text-rose-300 rounded-lg cursor-pointer transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </button>
    );
  }

  let manageStaffButton = null;
  let collapsedStaffButton = null;
  if (isOwner && props.onOpenUserModal) {
    manageStaffButton = (
      <button
        type="button"
        onClick={props.onOpenUserModal}
        className="flex w-full items-center gap-2 rounded-lg bg-white/5 border border-white/10 border-b-2 border-b-white/5 px-2.5 py-1.5 text-2xs font-medium text-[#A3A3A3] hover:bg-white/10 hover:border-white/15 hover:text-white shadow-2xs transition-all cursor-pointer"
      >
        <Users className="h-3.5 w-3.5 text-[#A3A3A3]" />
        <span>Manage Staff</span>
      </button>
    );
    collapsedStaffButton = (
      <button
        type="button"
        onClick={props.onOpenUserModal}
        title="Manage Staff"
        aria-label="Manage Staff"
        className="p-1.5 text-[#A3A3A3] hover:bg-white/10 hover:text-white rounded-lg cursor-pointer transition-colors"
      >
        <Users className="h-4 w-4" />
      </button>
    );
  }

  let cashDrawerButton = null;
  let collapsedDrawerButton = null;
  if (props.onOpenShiftModal) {
    let dotTone = "bg-amber-400";
    let statusLabel = "No Shift";
    let drawerTitle = "Cash Drawer (No Shift)";
    if (props.activeShift) {
      dotTone = "bg-[#B9F36B]";
      statusLabel = "Shift Open";
      drawerTitle = "Cash Drawer (Shift Open)";
    }
    cashDrawerButton = (
      <button
        type="button"
        onClick={props.onOpenShiftModal}
        className="flex w-full items-center justify-between rounded-lg bg-white/5 border border-white/10 border-b-2 border-b-white/5 px-2.5 py-1.5 text-2xs font-medium text-[#A3A3A3] hover:bg-white/10 hover:border-white/15 hover:text-white shadow-2xs transition-all cursor-pointer"
        title="Cash Drawer & Shifts"
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-[#A3A3A3]" />
          <span>Cash Drawer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={"h-1.5 w-1.5 rounded-full " + dotTone} />
          <span className="text-3xs text-[#A3A3A3]">{statusLabel}</span>
        </div>
      </button>
    );
    collapsedDrawerButton = (
      <button
        type="button"
        onClick={props.onOpenShiftModal}
        title={drawerTitle}
        aria-label={drawerTitle}
        className="relative p-1.5 text-[#A3A3A3] hover:bg-white/10 hover:text-white rounded-lg cursor-pointer transition-colors"
      >
        <Wallet className="h-4 w-4" />
        <span className={"absolute right-1 top-1 h-1.5 w-1.5 rounded-full " + dotTone} />
      </button>
    );
  }

  let footerElement = null;
  if (collapsed) {
    footerElement = (
      <div className="border-t border-white/10 p-3 flex flex-col items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white shrink-0"
          title={displayName + " (" + displayRole + ")"}
        >
          {initials}
        </div>
        {collapsedDrawerButton}
        {collapsedStaffButton}
        {logoutButton}
      </div>
    );
  } else {
    footerElement = (
      <div className="border-t border-white/10 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">{displayName}</div>
              <div className="text-tiny text-[#A3A3A3]">{displayRole}</div>
            </div>
          </div>
          {logoutButton}
        </div>
        {cashDrawerButton}
        {manageStaffButton}
      </div>
    );
  }

  return (
    <aside className={asideClass}>
      {headerElement}

      <nav aria-label="Main navigation" className="flex-1 space-y-1.5 px-3 py-3">
        {navItems.map(function renderNavItem(item) {
          const IconComponent = item.icon;
          const isActive = props.activePage === item.key;
          let itemClass =
            "flex w-full items-center rounded-xl text-xs font-medium transition-all duration-100 cursor-pointer ";
          if (collapsed) {
            itemClass = itemClass + "justify-center px-0 py-3 ";
          } else {
            itemClass = itemClass + "gap-3.5 px-4 py-3 ";
          }

          let ariaCurrent = undefined;
          if (isActive) {
            ariaCurrent = "page";
            itemClass = itemClass + "bg-[#B9F36B] text-[#151515] font-semibold border border-[#A2E84D] border-b-2 border-b-[#8FD838] shadow-xs active:translate-y-[1px] active:shadow-none";
          } else {
            itemClass = itemClass + "text-[#A3A3A3] hover:bg-white/5 hover:text-white active:translate-y-[1px]";
          }

          let labelSpan = <span>{item.label}</span>;
          if (collapsed) {
            labelSpan = null;
          }

          return (
            <button
              key={item.key}
              type="button"
              aria-current={ariaCurrent}
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
