import { useState } from "react";
import { Store } from "lucide-react";
import { Sidebar } from "./components/Sidebar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { PosPage } from "./pages/PosPage.jsx";
import { TransactionsPage } from "./pages/TransactionsPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";

function getPageTitle(pageKey) {
  if (pageKey === "pos") {
    return "Point of Sale";
  }
  if (pageKey === "inventory") {
    return "Inventory";
  }
  if (pageKey === "transactions") {
    return "Transactions";
  }
  if (pageKey === "reports") {
    return "Reports";
  }
  return "Dashboard";
}

export function App() {
  const [activePage, setActivePage] = useState("dashboard");

  let pageElement = <DashboardPage onNavigate={setActivePage} />;
  if (activePage === "pos") {
    pageElement = <PosPage />;
  } else if (activePage === "transactions") {
    pageElement = <TransactionsPage />;
  } else if (activePage === "inventory") {
    pageElement = <InventoryPage />;
  } else if (activePage === "reports") {
    pageElement = <ReportsPage />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 md:flex-row">
      {/* Mobile Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#181B2C] px-4 text-white select-none md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">StoreFlow</div>
            <div className="text-2xs text-slate-400">{getPageTitle(activePage)}</div>
          </div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-2xs font-semibold text-blue-300">
          OW
        </div>
      </header>

      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <main className="flex flex-1 overflow-hidden pb-16 md:pb-0">{pageElement}</main>

      <BottomNav activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}
