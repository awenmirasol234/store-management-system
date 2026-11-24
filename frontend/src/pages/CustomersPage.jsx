import { useEffect, useState } from "react";
import { AlertCircle, Banknote, History, Plus, Search, UserCheck, Users, Wallet } from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatSmartDateTime } from "../format.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { CustomerLedgerModal } from "../components/CustomerLedgerModal.jsx";
import { CustomerModal } from "../components/CustomerModal.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { Input } from "../components/Input.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { RecordPaymentModal } from "../components/RecordPaymentModal.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { TableEmptyRow } from "../components/TableEmptyRow.jsx";

function getFilterButtonClass(filterKey, currentFilter) {
  let buttonClass = "rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors ";
  if (filterKey === currentFilter) {
    buttonClass = buttonClass + "bg-[#151515] text-white shadow-xs";
  } else {
    buttonClass = buttonClass + "border border-[#E9E9E9] bg-white text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515]";
  }
  return buttonClass;
}

export function CustomersPage(props) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);

  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState(null);

  async function loadCustomers(queryText) {
    setErrorBanner("");
    setLoading(true);
    try {
      const list = await api.listCustomers(queryText);
      setCustomers(list || []);
    } catch (error) {
      setErrorBanner(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(
    function fetchInitial() {
      loadCustomers(searchQuery);
    },
    [searchQuery]
  );

  // Compute Summary Metrics
  let totalUtang = 0;
  let customersWithBalanceCount = 0;
  let activeCustomersCount = 0;
  let overLimitCount = 0;

  for (let index = 0; index < customers.length; index++) {
    const cust = customers[index];
    if (cust.is_active) {
      activeCustomersCount = activeCustomersCount + 1;
      if (cust.current_balance > 0) {
        totalUtang = totalUtang + cust.current_balance;
        customersWithBalanceCount = customersWithBalanceCount + 1;
      }
      if (cust.credit_limit !== null && cust.credit_limit !== undefined && cust.current_balance > cust.credit_limit) {
        overLimitCount = overLimitCount + 1;
      }
    }
  }
  totalUtang = Math.round(totalUtang * 100) / 100;

  // Filter Customers
  const filteredCustomers = [];
  for (let index = 0; index < customers.length; index++) {
    const cust = customers[index];
    let matchesFilter = true;

    if (activeFilter === "WITH_UTANG") {
      if (cust.current_balance <= 0) {
        matchesFilter = false;
      }
    } else if (activeFilter === "OVER_LIMIT") {
      if (cust.credit_limit === null || cust.credit_limit === undefined || cust.current_balance <= cust.credit_limit) {
        matchesFilter = false;
      }
    } else if (activeFilter === "INACTIVE") {
      if (cust.is_active) {
        matchesFilter = false;
      }
    }

    if (matchesFilter) {
      filteredCustomers.push(cust);
    }
  }

  function handleOpenCreateCustomer() {
    setSelectedCustomerForEdit(null);
    setCustomerModalOpen(true);
  }

  function handleOpenEditCustomer(customer) {
    setSelectedCustomerForEdit(customer);
    setCustomerModalOpen(true);
  }

  function handleOpenPayment(customer) {
    setSelectedCustomerForPayment(customer);
    setPaymentModalOpen(true);
  }

  function handleOpenLedger(customer) {
    setSelectedCustomerForLedger(customer);
    setLedgerModalOpen(true);
  }

  function handleCustomerSaved() {
    loadCustomers(searchQuery);
  }

  function handlePaymentRecorded() {
    loadCustomers(searchQuery);
  }

  let errorElement = null;
  if (errorBanner) {
    errorElement = <ErrorBanner message={errorBanner} className="mb-4 sm:mb-5" />;
  }

  const tableHeadRow = (
    <tr>
      <th className="px-5 py-3">Customer</th>
      <th className="px-5 py-3">Contact & Address</th>
      <th className="px-5 py-3 text-right">Current Utang</th>
      <th className="px-5 py-3 text-right">Credit Limit</th>
      <th className="px-5 py-3">Status</th>
      <th className="px-5 py-3 text-right">Actions</th>
    </tr>
  );

  let tableBodyContent = null;
  if (loading && customers.length === 0) {
    tableBodyContent = (
      <TableEmptyRow colSpan={6} message="Loading customers..." />
    );
  } else if (filteredCustomers.length === 0) {
    tableBodyContent = (
      <TableEmptyRow
        colSpan={6}
        message="No customers match the current filter or search criteria."
      />
    );
  } else {
    tableBodyContent = filteredCustomers.map(function renderCustomerRow(customer) {
      let balanceClass = "font-mono font-bold ";
      if (customer.current_balance > 0) {
        balanceClass = balanceClass + "text-rose-600";
      } else {
        balanceClass = balanceClass + "text-emerald-600";
      }

      let limitDisplay = "No limit";
      if (customer.credit_limit !== null && customer.credit_limit !== undefined) {
        limitDisplay = formatPeso(customer.credit_limit);
      }

      const isOverLimit = Boolean(
        customer.credit_limit !== null &&
        customer.credit_limit !== undefined &&
        customer.current_balance > customer.credit_limit
      );

      let statusBadge = null;
      if (!customer.is_active) {
        statusBadge = <Badge tone="neutral">Inactive</Badge>;
      } else if (isOverLimit) {
        statusBadge = <Badge tone="red">Over Limit</Badge>;
      } else if (customer.current_balance > 0) {
        statusBadge = <Badge tone="amber">Has Utang</Badge>;
      } else {
        statusBadge = <Badge tone="green">Cleared</Badge>;
      }

      let phoneDisplay = "-";
      if (customer.phone) {
        phoneDisplay = customer.phone;
      }

      let addressDisplay = "-";
      if (customer.address) {
        addressDisplay = customer.address;
      }

      const canPay = Boolean(customer.is_active && customer.current_balance > 0);

      let payVariant = "secondary";
      if (canPay) {
        payVariant = "primary";
      }

      return (
        <tr key={customer.customer_id} className="hover:bg-[#EEEEED]/50 transition-colors">
          <td className="px-5 py-3.5">
            <div className="font-semibold text-[#151515]">{customer.full_name}</div>
          </td>
          <td className="px-5 py-3.5 text-xs text-[#777777]">
            <div>{phoneDisplay}</div>
            <div className="text-[#777777]/70 max-w-xs truncate">{addressDisplay}</div>
          </td>
          <td className={"px-5 py-3.5 text-right text-sm " + balanceClass}>
            {formatPeso(customer.current_balance)}
          </td>
          <td className="px-5 py-3.5 text-right font-mono text-xs text-[#777777]">
            {limitDisplay}
          </td>
          <td className="px-5 py-3.5">{statusBadge}</td>
          <td className="px-5 py-3.5 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant={payVariant}
                disabled={!canPay}
                onClick={function openPayModal() {
                  handleOpenPayment(customer);
                }}
              >
                Pay
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={function openHistory() {
                  handleOpenLedger(customer);
                }}
              >
                Ledger
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={function openEdit() {
                  handleOpenEditCustomer(customer);
                }}
              >
                Edit
              </Button>
            </div>
          </td>
        </tr>
      );
    });
  }

  return (
    <PageLayout scroll={true}>
      <PageHeader title="Customer Credit & Utang" stackOnMobile={true}>
        <Button variant="primary" onClick={handleOpenCreateCustomer}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Customer
        </Button>
      </PageHeader>

      {errorElement}

      {/* Summary Stat Cards */}
      <div className="mb-4 sm:mb-5 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Outstanding Utang"
          value={formatPeso(totalUtang)}
          icon={Wallet}
          meta={customersWithBalanceCount + " customer(s) with balance"}
        />
        <StatCard
          label="Customers with Utang"
          value={String(customersWithBalanceCount)}
          icon={Banknote}
        />
        <StatCard
          label="Active Customers"
          value={String(activeCustomersCount)}
          icon={Users}
        />
        <StatCard
          label="Over Credit Limit"
          value={String(overLimitCount)}
          icon={AlertCircle}
        />
      </div>

      {/* Search Bar & Filter Tabs */}
      <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
          <input
            type="text"
            placeholder="Search name, phone, address..."
            value={searchQuery}
            onChange={function handleSearch(event) {
              setSearchQuery(event.target.value);
            }}
            className="w-full rounded-xl border border-[#E9E9E9] bg-white py-2.5 pl-10 pr-4 text-sm text-[#151515] placeholder:text-[#777777] focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={function setAll() {
              setActiveFilter("ALL");
            }}
            className={getFilterButtonClass("ALL", activeFilter)}
          >
            All ({customers.length})
          </button>
          <button
            type="button"
            onClick={function setWithUtang() {
              setActiveFilter("WITH_UTANG");
            }}
            className={getFilterButtonClass("WITH_UTANG", activeFilter)}
          >
            With Utang ({customersWithBalanceCount})
          </button>
          <button
            type="button"
            onClick={function setOverLimit() {
              setActiveFilter("OVER_LIMIT");
            }}
            className={getFilterButtonClass("OVER_LIMIT", activeFilter)}
          >
            Over Limit ({overLimitCount})
          </button>
          <button
            type="button"
            onClick={function setInactive() {
              setActiveFilter("INACTIVE");
            }}
            className={getFilterButtonClass("INACTIVE", activeFilter)}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#E9E9E9] bg-white">
        <DataTable headRow={tableHeadRow} stickyHead={true}>
          {tableBodyContent}
        </DataTable>
      </div>

      {/* Modals */}
      <CustomerModal
        open={customerModalOpen}
        onClose={function closeCustomerModal() {
          setCustomerModalOpen(false);
          setSelectedCustomerForEdit(null);
        }}
        customer={selectedCustomerForEdit}
        onSaved={handleCustomerSaved}
      />

      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={function closePaymentModal() {
          setPaymentModalOpen(false);
          setSelectedCustomerForPayment(null);
        }}
        customer={selectedCustomerForPayment}
        currentUser={props.currentUser}
        onPaymentRecorded={handlePaymentRecorded}
      />

      <CustomerLedgerModal
        open={ledgerModalOpen}
        onClose={function closeLedgerModal() {
          setLedgerModalOpen(false);
          setSelectedCustomerForLedger(null);
        }}
        customer={selectedCustomerForLedger}
      />
    </PageLayout>
  );
}
