import { useEffect, useState } from "react";
import { LogOut, Store } from "lucide-react";
import { api, clearAuthToken, getAuthToken } from "./api.js";
import { Sidebar } from "./components/Sidebar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { UserManagementModal } from "./components/UserManagementModal.jsx";
import { getPageFromPath, getPageTitle, getPathFromPage } from "./navigation.js";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { PosPage } from "./pages/PosPage.jsx";
import { TransactionsPage } from "./pages/TransactionsPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { CustomersPage } from "./pages/CustomersPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SetupPage } from "./pages/SetupPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { CashierShiftModal } from "./components/CashierShiftModal.jsx";
import { DebugOverlay } from "./components/DebugOverlay.jsx";

export function App(props) {
  let initialActivePage = "dashboard";
  if (props && props.initialPage) {
    initialActivePage = props.initialPage;
  } else if (typeof window !== "undefined" && window.location && window.location.pathname) {
    const parsedPage = getPageFromPath(window.location.pathname);
    if (parsedPage) {
      initialActivePage = parsedPage;
    }
  }

  const [currentUser, setCurrentUser] = useState(null);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activePage, setActivePage] = useState(initialActivePage);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);

  async function loadActiveShift(userId) {
    try {
      const result = await api.getActiveShift(userId);
      if (result && result.shift) {
        setActiveShift(Object.assign({}, result.shift, { summary: result.summary }));
      } else {
        setActiveShift(null);
      }
    } catch (error) {
      setActiveShift(null);
    }
  }

  function handleNavigate(pageKey) {
    setActivePage(pageKey);
    if (
      typeof window !== "undefined" &&
      window.history &&
      typeof window.history.pushState === "function"
    ) {
      const targetPath = getPathFromPage(pageKey);
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, "", targetPath);
      }
    }
  }

  useEffect(function initRouting() {
    function handlePopState() {
      if (typeof window !== "undefined" && window.location) {
        const page = getPageFromPath(window.location.pathname);
        if (page) {
          setActivePage(page);
        } else {
          setActivePage("dashboard");
        }
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handlePopState);
      return function cleanup() {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, []);

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
            loadActiveShift(user.user_id);
            if (initialActivePage === "dashboard" && user.role === "CASHIER") {
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
    loadActiveShift(user.user_id);
    if (activePage === "dashboard" && user.role === "CASHIER") {
      handleNavigate("pos");
    } else if (activePage !== "not-found") {
      handleNavigate(activePage);
    }
  }

  function handleLogout() {
    api.logout().catch(function () {
      // ignore network error on logout
    });
    clearAuthToken();
    setCurrentUser(null);
    setActiveShift(null);
    handleNavigate("pos");
  }

  // Initial SSR or loading check
  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F5F4] text-[#151515]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171717] text-[#B9F36B]">
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

  let pageElement = null;
  if (activePage === "dashboard") {
    pageElement = <DashboardPage onNavigate={handleNavigate} currentUser={currentUser} />;
  } else if (activePage === "pos") {
    pageElement = (
      <PosPage
        currentUser={currentUser}
        activeShift={activeShift}
        onOpenShiftModal={function () {
          setShiftModalOpen(true);
        }}
        onShiftChange={function () {
          if (currentUser) {
            loadActiveShift(currentUser.user_id);
          }
        }}
      />
    );
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
      pageElement = (
        <NotFoundPage
          onNavigate={handleNavigate}
          currentUser={currentUser}
          requestedPath="reports"
        />
      );
    }
  } else if (activePage === "settings") {
    if (currentUser.role === "OWNER") {
      pageElement = <SettingsPage currentUser={currentUser} />;
    } else {
      pageElement = (
        <NotFoundPage
          onNavigate={handleNavigate}
          currentUser={currentUser}
          requestedPath="settings"
        />
      );
    }
  } else {
    pageElement = (
      <NotFoundPage
        onNavigate={handleNavigate}
        currentUser={currentUser}
        requestedPath={activePage}
      />
    );
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F5F5F4] md:flex-row">
      {/* Mobile Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#262626] bg-[#171717] px-4 text-white select-none md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B9F36B] text-[#151515]">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">StoreFlow</div>
            <div className="text-2xs text-[#A3A3A3]">{getPageTitle(activePage)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-2xs font-semibold text-white"
            title={currentUser.full_name + " (" + currentUser.role + ")"}
          >
            {mobileInitials}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-[#A3A3A3] hover:text-rose-300 cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        activeShift={activeShift}
        onLogout={handleLogout}
        onOpenUserModal={function () {
          setUserModalOpen(true);
        }}
        onOpenShiftModal={function () {
          setShiftModalOpen(true);
        }}
      />

      <main className="flex flex-1 overflow-hidden pb-16 md:pb-0">{pageElement}</main>

      <BottomNav
        activePage={activePage}
        onNavigate={handleNavigate}
        currentUser={currentUser}
      />

      <UserManagementModal
        open={userModalOpen}
        onClose={function () {
          setUserModalOpen(false);
        }}
        currentUser={currentUser}
      />

      <CashierShiftModal
        open={shiftModalOpen}
        onClose={function () {
          setShiftModalOpen(false);
        }}
        currentUser={currentUser}
        activeShift={activeShift}
        onShiftChange={function () {
          if (currentUser) {
            return loadActiveShift(currentUser.user_id);
          }
        }}
      />

      <DebugOverlay />
    </div>
  );
}
