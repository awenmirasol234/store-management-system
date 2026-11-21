import { BarChart3, LayoutDashboard, Package, Receipt, ShoppingBag } from "lucide-react";

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
    icon: BarChart3
  }
];

export function getPageTitle(pageKey) {
  for (let index = 0; index < NAV_ITEMS.length; index++) {
    if (NAV_ITEMS[index].key === pageKey) {
      return NAV_ITEMS[index].pageTitle;
    }
  }
  return "Dashboard";
}
