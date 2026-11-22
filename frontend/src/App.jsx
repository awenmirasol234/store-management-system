import { useEffect, useState } from "react";
import { LogOut, Store } from "lucide-react";
import { api, clearAuthToken, getAuthToken } from "./api.js";
import { Sidebar } from "./components/Sidebar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { UserManagementModal } from "./components/UserManagementModal.jsx";
import { getPageTitle } from "./navigation.js";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { PosPage } from "./pages/PosPage.jsx";
import { TransactionsPage } from "./pages/TransactionsPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { CustomersPage } from "./pages/CustomersPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SetupPage } from "./pages/SetupPage.jsx";

export function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [userModalOpen, setUserModalOpen] = useState(false);

  useEffect(function initAuth() {
    let isCancelled = false;

    async function checkAuth() {
      try {
        const status = await api.getAuthStatus();
        if (isCancelled) {
          return;
        }
        if (status.is_setup_required) {
          setIsSetupRequired(true);
          setAuthChecked(true);
          return;
        }

        const token = getAuthToken();
        if (token) {
          const user = await api.getMe();
          if (isCancelled) {
            return;
          }
          if (user) {
            setCurrentUser(user);
            if (user.role === "OWNER") {
              setActivePage("dashboard");
            } else {
              setActivePage("pos");
            }
          }
        }
      } catch (error) {
        clearAuthToken();
      } finally {
        if (!isCancelled) {
          setAuthChecked(true);
        }
      }
    }

    checkAuth();
    return function cleanup() {
      isCancelled = true;
    };
  }, []);

  function handleAuthSuccess(user, token) {
    setCurrentUser(user);
    setIsSetupRequired(false);
    if (user.role === "OWNER") {
      setActivePage("dashboard");
    } else {
      setActivePage("pos");
    }
  }

  function handleLogout() {
    api.logout().catch(function () {
      // ignore network error on logout
    });
    clearAuthToken();
    setCurrentUser(null);
    setActivePage("pos");
  }

  // Initial SSR or loading check
  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0F111E] text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Store className="h-5 w-5" />
          </div>
          <div className="text-base font-bold">StoreFlow</div>
        </div>
      </div>
    );
  }

  if (isSetupRequired) {
    return <SetupPage onSetupSuccess={handleAuthSuccess} />;
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleAuthSuccess} />;
  }

  let pageElement = <DashboardPage onNavigate={setActivePage} currentUser={currentUser} />;
  if (activePage === "pos") {
    pageElement = <PosPage currentUser={currentUser} />;
  } else if (activePage === "inventory") {
    pageElement = <InventoryPage currentUser={currentUser} />;
  } else if (activePage === "customers") {
    pageElement = <CustomersPage currentUser={currentUser} />;
  } else if (activePage === "transactions") {
    pageElement = <TransactionsPage currentUser={currentUser} />;
  } else if (activePage === "reports") {
    if (currentUser.role === "OWNER") {
      pageElement = <ReportsPage currentUser={currentUser} />;
    } else {
      pageElement = <PosPage currentUser={currentUser} />;
    }
  }

  let mobileInitials = "OW";
  if (currentUser) {
    if (currentUser.full_name) {
      const parts = currentUser.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        mobileInitials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length >= 2) {
        mobileInitials = parts[0].slice(0, 2).toUpperCase();
      }
    } else if (currentUser.username) {
      mobileInitials = currentUser.username.slice(0, 2).toUpperCase();
    }
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
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-2xs font-semibold text-blue-300"
            title={currentUser.full_name + " (" + currentUser.role + ")"}
          >
            {mobileInitials}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenUserModal={function () {
          setUserModalOpen(true);
        }}
      />

      <main className="flex flex-1 overflow-hidden pb-16 md:pb-0">{pageElement}</main>

      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
        currentUser={currentUser}
      />

      <UserManagementModal
        open={userModalOpen}
        onClose={function () {
          setUserModalOpen(false);
        }}
        currentUser={currentUser}
      />
    </div>
  );
}
