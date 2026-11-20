import { useState } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { PosPage } from "./pages/PosPage.jsx";
import { TransactionsPage } from "./pages/TransactionsPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";

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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex flex-1 overflow-hidden">{pageElement}</main>
    </div>
  );
}
