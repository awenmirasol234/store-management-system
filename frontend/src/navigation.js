import { BarChart3, LayoutDashboard, Package, Receipt, Settings, ShoppingBag, Users } from "lucide-react";

export const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    pageTitle: "Dashboard",
    icon: LayoutDashboard
  },
  { key: "pos", label: "POS", shortLabel: "POS", pageTitle: "Point of Sale", icon: ShoppingBag },
  {
    key: "inventory",
    label: "Inventory",
    shortLabel: "Inventory",
    pageTitle: "Inventory",
    icon: Package
  },
  {
    key: "customers",
    label: "Customers",
    shortLabel: "Utang",
    pageTitle: "Customer Credit & Utang",
    icon: Users,
    capability: "customer_credit"
  },
  {
    key: "transactions",
    label: "Transactions",
    shortLabel: "History",
    pageTitle: "Transactions",
    icon: Receipt
  },
  {
    key: "reports",
    label: "Reports",
    shortLabel: "Reports",
    pageTitle: "Reports",
    icon: BarChart3,
    roles: ["OWNER"]
  },
  {
    key: "settings",
    label: "Settings",
    shortLabel: "Settings",
    pageTitle: "Store Settings",
    icon: Settings,
    roles: ["OWNER"]
  }
];

export const DEFAULT_CAPABILITIES = {
  mode: "multi_user",
  staff_management: true,
  roles: true,
  cash_drawer: true,
  customer_credit: true,
  selling_options: true,
  custom_amount_sales: true,
  catalog_extras: true,
  product_images: true,
  database_backup: true
};

function isCapabilityEnabled(item, capabilities) {
  if (!item.capability || !capabilities) {
    return true;
  }
  return capabilities[item.capability] !== false;
}

export function isValidPage(pageKey) {
  if (!pageKey) {
    return false;
  }
  for (let index = 0; index < NAV_ITEMS.length; index = index + 1) {
    if (NAV_ITEMS[index].key === pageKey) {
      return true;
    }
  }
  return false;
}

export function getFilteredNavItems(role, capabilities) {
  const filtered = [];
  for (let index = 0; index < NAV_ITEMS.length; index = index + 1) {
    const item = NAV_ITEMS[index];
    let roleAllowed = true;
    if (role && role !== "OWNER" && item.roles && !item.roles.includes(role)) {
      roleAllowed = false;
    }
    if (roleAllowed && isCapabilityEnabled(item, capabilities)) {
      filtered.push(item);
    }
  }
  return filtered;
}

export function isPageEnabled(pageKey, capabilities) {
  for (let index = 0; index < NAV_ITEMS.length; index = index + 1) {
    if (NAV_ITEMS[index].key === pageKey) {
      return isCapabilityEnabled(NAV_ITEMS[index], capabilities);
    }
  }
  return true;
}

export function getPageTitle(pageKey) {
  if (pageKey === "not-found") {
    return "Page Not Found";
  }
  for (let index = 0; index < NAV_ITEMS.length; index = index + 1) {
    if (NAV_ITEMS[index].key === pageKey) {
      return NAV_ITEMS[index].pageTitle;
    }
  }
  return "Dashboard";
}

export function getPageFromPath(pathname) {
  if (!pathname || pathname === "/" || pathname === "") {
    return null;
  }
  const clean = pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (clean === "404" || clean === "not-found") {
    return "not-found";
  }
  if (isValidPage(clean)) {
    return clean;
  }
  return "not-found";
}

export function getPathFromPage(pageKey) {
  if (!pageKey || pageKey === "dashboard") {
    return "/";
  }
  if (pageKey === "not-found") {
    return "/404";
  }
  return "/" + pageKey;
}
