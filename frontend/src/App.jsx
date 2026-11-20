import { useState } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { PosPage } from "./pages/PosPage.jsx";
import { OrdersPage } from "./pages/OrdersPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";

export function App() {
  const [activePage, setActivePage] = useState("sales");

  let pageElement = <PosPage />;
  if (activePage === "orders") {
    pageElement = <OrdersPage />;
  } else if (activePage === "products") {
    pageElement = <InventoryPage />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex flex-1 overflow-hidden">{pageElement}</main>
    </div>
  );
}
