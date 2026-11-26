import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { LoginPage } from "../src/pages/LoginPage.jsx";
import { SetupPage } from "../src/pages/SetupPage.jsx";
import { PosPage } from "../src/pages/PosPage.jsx";
import { DashboardPage } from "../src/pages/DashboardPage.jsx";
import { UserManagementModal } from "../src/components/UserManagementModal.jsx";
import { Sidebar } from "../src/components/Sidebar.jsx";
import { BottomNav } from "../src/components/BottomNav.jsx";
import { App } from "../src/App.jsx";
import { getFilteredNavItems } from "../src/navigation.js";

describe("Frontend Auth & Security Component Rendering", function () {
  it("renders LoginPage with staff username input and on-screen PIN keypad", function () {
    const html = renderToString(React.createElement(LoginPage));
    expect(html).toContain("Duane Store");
    expect(html).toContain("Staff Username");
    expect(html).toContain("Security PIN");
    expect(html).toContain("Sign In to Terminal");
    // Keypad numbers
    expect(html).toContain("1");
    expect(html).toContain("9");
    expect(html).toContain("Clear");

    // POS cockpit theme styles
    expect(html).toContain("bg-[#F5F5F4]");
    expect(html).toContain("border-[#E9E9E9]");
    expect(html).toContain("bg-[#171717]");
    expect(html).toContain("bg-[#B9F36B]");
    expect(html).toContain("text-[#171717]");
  });

  it("renders SetupPage for first-time Store Owner setup", function () {
    const html = renderToString(React.createElement(SetupPage));
    expect(html).toContain("Welcome to Duane Store");
    expect(html).toContain("Owner Username");
    expect(html).toContain("Owner Role Privileges");
    expect(html).toContain("Create Store Owner Account");
  });

  it("renders UserManagementModal with staff list and add cashier actions", function () {
    const html = renderToString(
      React.createElement(UserManagementModal, {
        open: true,
        currentUser: { user_id: "u1", username: "owner", role: "OWNER" },
        onClose: function () {}
      })
    );
    expect(html).toContain("Staff &amp; User Management");
    expect(html).toContain("Add Cashier");
  });

  it("filters navigation items based on user role (hiding Reports for Cashiers)", function () {
    const ownerNav = getFilteredNavItems("OWNER");
    const cashierNav = getFilteredNavItems("CASHIER");

    const ownerKeys = ownerNav.map(function (item) {
      return item.key;
    });
    const cashierKeys = cashierNav.map(function (item) {
      return item.key;
    });

    expect(ownerKeys).toContain("reports");
    expect(cashierKeys).not.toContain("reports");
    expect(cashierKeys).toContain("pos");
    expect(cashierKeys).toContain("dashboard");
  });

  it("renders Sidebar differently for Owner vs Cashier", function () {
    const ownerHtml = renderToString(
      React.createElement(Sidebar, {
        activePage: "dashboard",
        currentUser: { username: "owner", full_name: "Maria Santos", role: "OWNER" },
        onNavigate: function () {},
        onLogout: function () {},
        onOpenUserModal: function () {}
      })
    );
    expect(ownerHtml).toContain("Maria Santos");
    expect(ownerHtml).toContain("Owner");
    expect(ownerHtml).toContain("Manage Staff");
    expect(ownerHtml).toContain("Reports");
    expect(ownerHtml).toContain("Version");
    expect(ownerHtml).toContain("1.0.0");

    const cashierHtml = renderToString(
      React.createElement(Sidebar, {
        activePage: "pos",
        currentUser: { username: "cashier1", full_name: "Juan Dela Cruz", role: "CASHIER" },
        onNavigate: function () {},
        onLogout: function () {}
      })
    );
    expect(cashierHtml).toContain("Juan Dela Cruz");
    expect(cashierHtml).toContain("Cashier");
    expect(cashierHtml).not.toContain("Manage Staff");
    expect(cashierHtml).not.toContain("Reports");
  });

  it("renders BottomNav with filtered items for Cashier", function () {
    const cashierHtml = renderToString(
      React.createElement(BottomNav, {
        activePage: "pos",
        currentUser: { username: "cashier1", role: "CASHIER" },
        onNavigate: function () {}
      })
    );
    expect(cashierHtml).toContain("POS");
    expect(cashierHtml).toContain("History");
    expect(cashierHtml).not.toContain("Reports");
  });

  it("renders App shell without crashing during initial mount", function () {
    const html = renderToString(React.createElement(App));
    expect(typeof html).toBe("string");
    expect(html).toContain("Duane Store");
  });

  it("renders PosPage and DashboardPage with currentUser prop", function () {
    const cashierUser = { username: "cashier1", full_name: "Juan Cashier", role: "CASHIER" };
    const posHtml = renderToString(
      React.createElement(PosPage, {
        currentUser: cashierUser
      })
    );
    expect(posHtml).toContain("Current Sale");
    expect(posHtml).toContain("Cash");

    const dashHtml = renderToString(
      React.createElement(DashboardPage, {
        currentUser: cashierUser,
        onNavigate: function () {}
      })
    );
    expect(dashHtml).toContain("Dashboard");
  });

  it("computes initials correctly in Sidebar for diverse name structures", function () {
    // Multi-word name
    const multiHtml = renderToString(
      React.createElement(Sidebar, {
        activePage: "dashboard",
        currentUser: { username: "owner", full_name: "Maria Dela Santos", role: "OWNER" },
        onNavigate: function () {}
      })
    );
    expect(multiHtml).toContain("MS");

    // Single name
    const singleHtml = renderToString(
      React.createElement(Sidebar, {
        activePage: "dashboard",
        currentUser: { username: "admin", full_name: "Administrator", role: "OWNER" },
        onNavigate: function () {}
      })
    );
    expect(singleHtml).toContain("AD");

    // Username only
    const userOnlyHtml = renderToString(
      React.createElement(Sidebar, {
        activePage: "pos",
        currentUser: { username: "staff1", full_name: "", role: "CASHIER" },
        onNavigate: function () {}
      })
    );
    expect(userOnlyHtml).toContain("ST");
  });
});
