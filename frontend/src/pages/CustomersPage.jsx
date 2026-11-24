import { useEffect, useState } from "react";
import { AlertCircle, Banknote, Plus, Users, Wallet } from "lucide-react";
import { api } from "../api.js";
import { formatPeso } from "../format.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { CustomerLedgerModal } from "../components/CustomerLedgerModal.jsx";
import { CustomerModal } from "../components/CustomerModal.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { FilterPill } from "../components/FilterPill.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { RecordPaymentModal } from "../components/RecordPaymentModal.jsx";
import { SearchInput } from "../components/SearchInput.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { TableEmptyRow } from "../components/TableEmptyRow.jsx";

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
  let inactiveCustomersCount = 0;
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
    } else {
      inactiveCustomersCount = inactiveCustomersCount + 1;
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

  function getCustomerStatusBadge(customer) {
    const isOverLimit = Boolean(
      customer.credit_limit !== null &&
      customer.credit_limit !== undefined &&
      customer.current_balance > customer.credit_limit
    );
    if (!customer.is_active) {
      return <Badge tone="neutral">Inactive</Badge>;
    }
    if (isOverLimit) {
      return <Badge tone="red">Over Limit</Badge>;
    }
    if (customer.current_balance > 0) {
      return <Badge tone="amber">Has Utang</Badge>;
    }
    return <Badge tone="green">Cleared</Badge>;
  }

  let tableBodyContent = null;
  let mobileCardsContent = null;
  if (loading && customers.length === 0) {
    tableBodyContent = (
      <TableEmptyRow colSpan={6} message="Loading customers..." />
    );
    mobileCardsContent = <EmptyState message="Loading customers..." />;
  } else if (filteredCustomers.length === 0) {
    tableBodyContent = (
      <TableEmptyRow
        colSpan={6}
        message="No customers match the current filter or search criteria."
      />
    );
    mobileCardsContent = (
      <EmptyState message="No customers match the current filter or search criteria." />
    );
  } else {
    tableBodyContent = filteredCustomers.map(function renderCustomerRow(customer) {
      let balanceClass = "font-mono font-bold text-[#171717]";
      if (customer.current_balance > 0) {
        balanceClass = "font-mono font-bold text-rose-600";
      }

      let limitDisplay = "No limit";
      if (customer.credit_limit !== null && customer.credit_limit !== undefined) {
        limitDisplay = formatPeso(customer.credit_limit);
      }

      const statusBadge = getCustomerStatusBadge(customer);

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
            <div className="font-semibold text-[#171717]">{customer.full_name}</div>
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

    mobileCardsContent = filteredCustomers.map(function renderCustomerCard(customer) {
      let balanceClass = "font-mono text-base font-bold text-[#171717]";
      if (customer.current_balance > 0) {
        balanceClass = "font-mono text-base font-bold text-rose-600";
      }

      let limitDisplay = "No limit";
      if (customer.credit_limit !== null && customer.credit_limit !== undefined) {
        limitDisplay = formatPeso(customer.credit_limit);
      }

      const statusBadge = getCustomerStatusBadge(customer);

      let contactLine = "No contact info";
      if (customer.phone && customer.address) {
        contactLine = customer.phone + " · " + customer.address;
      } else if (customer.phone) {
        contactLine = customer.phone;
      } else if (customer.address) {
        contactLine = customer.address;
      }

      const canPay = Boolean(customer.is_active && customer.current_balance > 0);
      let payVariant = "secondary";
      if (canPay) {
        payVariant = "primary";
      }

      return (
        <div
          key={customer.customer_id}
          className="rounded-2xl border border-[#E9E9E9] bg-white p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold text-[#171717]">{customer.full_name}</div>
              <div className="mt-0.5 truncate text-xs text-[#777777]">{contactLine}</div>
            </div>
            {statusBadge}
          </div>

          <div className="flex items-center justify-between border-t border-[#E9E9E9] pt-2.5">
            <div>
              <div className="text-tiny text-[#777777]">Current Utang</div>
              <div className={balanceClass}>{formatPeso(customer.current_balance)}</div>
            </div>
            <div className="text-right">
              <div className="text-tiny text-[#777777]">Credit Limit</div>
              <div className="font-mono text-xs font-medium text-[#171717]">{limitDisplay}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-[#E9E9E9] pt-2.5">
            <Button
              size="sm"
              variant={payVariant}
              disabled={!canPay}
              onClick={function openMobilePay() {
                handleOpenPayment(customer);
              }}
              className="flex-1 justify-center"
            >
              Pay
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={function openMobileLedger() {
                handleOpenLedger(customer);
              }}
              className="flex-1 justify-center"
            >
              Ledger
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={function openMobileEdit() {
                handleOpenEditCustomer(customer);
              }}
            >
              Edit
            </Button>
          </div>
        </div>
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

      {/* Search Bar & Filter Pills */}
      <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search name, phone, address..."
          className="w-full sm:w-80"
        />

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <FilterPill
            label="All"
            count={customers.length}
            active={activeFilter === "ALL"}
            onClick={function setAll() {
              setActiveFilter("ALL");
            }}
          />
          <FilterPill
            label="With Utang"
            count={customersWithBalanceCount}
            active={activeFilter === "WITH_UTANG"}
            onClick={function setWithUtang() {
              setActiveFilter("WITH_UTANG");
            }}
          />
          <FilterPill
            label="Over Limit"
            count={overLimitCount}
            active={activeFilter === "OVER_LIMIT"}
            onClick={function setOverLimit() {
              setActiveFilter("OVER_LIMIT");
            }}
          />
          <FilterPill
            label="Inactive"
            count={inactiveCustomersCount}
            active={activeFilter === "INACTIVE"}
            onClick={function setInactive() {
              setActiveFilter("INACTIVE");
            }}
          />
        </div>
      </div>

      {/* Mobile Customer Card List (< md) */}
      <div className="space-y-3 md:hidden">
        {mobileCardsContent}
      </div>

      {/* Desktop Customers Table (>= md) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#E9E9E9] bg-white">
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
