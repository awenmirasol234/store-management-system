import { useEffect, useState } from "react";
import { RotateCcw, Receipt } from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatQuantity, formatSmartDateTime } from "../format.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { FilterPill } from "../components/FilterPill.jsx";
import { Input } from "../components/Input.jsx";
import { Modal } from "../components/Modal.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { ReceiptView } from "../components/ReceiptView.jsx";
import { SearchInput } from "../components/SearchInput.jsx";
import { TableEmptyRow } from "../components/TableEmptyRow.jsx";
import { Skeleton } from "../components/Skeleton.jsx";
import { useDelayedSkeleton } from "../use-delayed-skeleton.js";

function getPaymentTone(method) {
  if (method === "CASH") {
    return "green";
  }
  if (method === "CREDIT") {
    return "amber";
  }
  return "blue";
}

export function filterSales(salesList, query) {
  if (!salesList || !Array.isArray(salesList)) {
    return [];
  }
  let cleanQuery = "";
  if (typeof query === "string") {
    cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.startsWith("or #")) {
      cleanQuery = cleanQuery.slice(4).trim();
    } else if (cleanQuery.startsWith("or ")) {
      cleanQuery = cleanQuery.slice(3).trim();
    } else if (cleanQuery.startsWith("#")) {
      cleanQuery = cleanQuery.slice(1).trim();
    }
  }

  if (cleanQuery.length === 0) {
    return salesList;
  }

  const matches = [];
  for (let index = 0; index < salesList.length; index++) {
    const sale = salesList[index];
    if (!sale) {
      continue;
    }
    const receiptStr = String(sale.receipt_number).toLowerCase();
    if (receiptStr.includes(cleanQuery)) {
      matches.push(sale);
    }
  }
  return matches;
}

export function TransactionsPage(props) {
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [hasLoadedSales, setHasLoadedSales] = useState(false);
  const [salesLoadFailed, setSalesLoadFailed] = useState(false);
  const salesAreLoading = loadingSales && !hasLoadedSales && !salesLoadFailed;
  const showSalesSkeleton = useDelayedSkeleton(salesAreLoading) && salesAreLoading;
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [errorBanner, setErrorBanner] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnRemarks, setReturnRemarks] = useState("");
  const [returnMessage, setReturnMessage] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  async function loadSales() {
    setErrorBanner("");
    setSalesLoadFailed(false);
    setLoadingSales(true);
    try {
      const list = await api.listSales(50);
      setSales(list);
      setHasLoadedSales(true);
    } catch (error) {
      if (!hasLoadedSales) {
        setSalesLoadFailed(true);
      }
      setErrorBanner(error.message);
    } finally {
      setLoadingSales(false);
    }
  }

  useEffect(function init() {
    loadSales();
  }, []);

  async function openOrderDetails(saleId) {
    setErrorBanner("");
    setReturnMessage("");
    setReturnQuantities({});
    setReturnRemarks("");
    try {
      const details = await api.getSale(saleId);
      setSelectedOrder(details);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  function updateReturnQty(saleItemId, rawValue) {
    setReturnQuantities(function update(previous) {
      const copy = Object.assign({}, previous);
      copy[saleItemId] = rawValue;
      return copy;
    });
  }

  async function handleProcessReturn(event) {
    event.preventDefault();
    if (!selectedOrder) {
      return;
    }

    const itemsToReturn = [];
    const saleItems = selectedOrder.items;
    for (let index = 0; index < saleItems.length; index++) {
      const item = saleItems[index];
      const raw = returnQuantities[item.sale_item_id];
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        itemsToReturn.push({
          sale_item_id: item.sale_item_id,
          quantity: parsed
        });
      }
    }

    if (itemsToReturn.length === 0) {
      setReturnMessage("Enter at least one return quantity.");
      return;
    }

    setSubmittingReturn(true);
    setReturnMessage("");
    try {
      let createdBy = "owner";
      if (props && props.currentUser && props.currentUser.username) {
        createdBy = props.currentUser.username;
      }

      const result = await api.processReturn(selectedOrder.sale.sale_id, {
        items: itemsToReturn,
        remarks: returnRemarks,
        created_by: createdBy
      });
      setReturnMessage(
        "Returned. Refund: " +
          formatPeso(result.return_record.total_refund_amount) +
          " (Cash: " +
          formatPeso(result.return_record.cash_refund_amount) +
          ", Credit: " +
          formatPeso(result.return_record.credit_refund_amount) +
          ")"
      );
      setReturnQuantities({});
      setReturnRemarks("");
      await loadSales();
    } catch (error) {
      setReturnMessage(error.message);
    } finally {
      setSubmittingReturn(false);
    }
  }

  let cashCount = 0;
  let creditCount = 0;
  let splitCount = 0;
  for (let i = 0; i < sales.length; i = i + 1) {
    const s = sales[i];
    if (s) {
      if (s.payment_method === "CASH") {
        cashCount = cashCount + 1;
      } else if (s.payment_method === "CREDIT") {
        creditCount = creditCount + 1;
      } else if (s.payment_method === "SPLIT") {
        splitCount = splitCount + 1;
      }
    }
  }

  const searchFilteredSales = filterSales(sales, searchQuery);
  const filteredSales = [];
  for (let i = 0; i < searchFilteredSales.length; i = i + 1) {
    const item = searchFilteredSales[i];
    if (paymentFilter === "ALL" || item.payment_method === paymentFilter) {
      filteredSales.push(item);
    }
  }

  let errorElement = <ErrorBanner message={errorBanner} className="relative z-[60] mb-4 sm:mb-5" />;

  let emptyFilterMessage = "No matching transactions found.";
  if (searchQuery.trim().length > 0) {
    emptyFilterMessage = 'No transactions matching "' + searchQuery + '".';
  }

  let tableBody = <TableEmptyRow colSpan="6" message="No completed sales yet." />;
  let mobileSalesList = <EmptyState message="No transactions recorded yet." />;
  if (!hasLoadedSales) {
    if (salesLoadFailed) {
      tableBody = <TableEmptyRow colSpan="6" message="Could not load transactions." />;
      mobileSalesList = <EmptyState message="Could not load transactions." />;
    } else if (showSalesSkeleton) {
      const tableRows = [];
      const mobileCards = [];
      for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
        tableRows.push(
          <tr key={rowIndex}>
            <td className="px-5 py-3.5"><Skeleton className="h-4 w-20" /></td>
            <td className="px-5 py-3.5"><Skeleton className="h-4 w-32" /></td>
            <td className="px-5 py-3.5"><Skeleton className="h-6 w-16 rounded-full" /></td>
            <td className="px-5 py-3.5"><Skeleton className="ml-auto h-4 w-20" /></td>
            <td className="px-5 py-3.5"><Skeleton className="ml-auto h-4 w-20" /></td>
            <td className="px-5 py-3.5"><Skeleton className="ml-auto h-8 w-28" /></td>
          </tr>
        );
        mobileCards.push(
          <div key={rowIndex} className="rounded-2xl border border-[#E9E9E9] bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between border-t border-[#E9E9E9] pt-2.5">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        );
      }
      tableBody = tableRows;
      mobileSalesList = mobileCards;
    } else {
      tableBody = null;
      mobileSalesList = null;
    }
  } else if (sales.length > 0 && filteredSales.length === 0) {
    tableBody = <TableEmptyRow colSpan="6" message={emptyFilterMessage} />;
  } else if (filteredSales.length > 0) {
    tableBody = filteredSales.map(function renderSaleRow(sale) {
      return (
        <tr key={sale.sale_id} className="hover:bg-[#EEEEED]/50 transition-colors">
          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-[#171717]">
            #{sale.receipt_number}
          </td>
          <td className="px-5 py-3.5 font-mono text-xs text-[#777777]">
            {formatSmartDateTime(sale.created_at)}
          </td>
          <td className="px-5 py-3.5">
            <Badge tone={getPaymentTone(sale.payment_method)}>{sale.payment_method}</Badge>
          </td>
          <td className="px-5 py-3.5 font-mono text-sm font-bold text-[#171717] text-right">
            {formatPeso(sale.total_amount)}
          </td>
          <td className="px-5 py-3.5 font-mono text-xs text-[#777777] text-right">
            {formatPeso(sale.change_amount)}
          </td>
          <td className="px-5 py-3.5 text-right">
            <Button
              variant="secondary"
              size="sm"
              onClick={function open() {
                openOrderDetails(sale.sale_id);
              }}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Receipt / Return</span>
            </Button>
          </td>
        </tr>
      );
    });
  }

  if (hasLoadedSales && sales.length > 0 && filteredSales.length === 0) {
    mobileSalesList = <EmptyState message={emptyFilterMessage} />;
  } else if (hasLoadedSales && filteredSales.length > 0) {
    mobileSalesList = filteredSales.map(function renderSaleCard(sale) {
      return (
        <div
          key={sale.sale_id}
          className="rounded-2xl border border-[#E9E9E9] bg-white p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-sm font-bold text-[#171717]">
                #{sale.receipt_number}
              </div>
              <div className="font-mono text-xs text-[#777777] mt-0.5">
                {formatSmartDateTime(sale.created_at)}
              </div>
            </div>
            <Badge tone={getPaymentTone(sale.payment_method)}>{sale.payment_method}</Badge>
          </div>

          <div className="flex items-center justify-between border-t border-[#E9E9E9] pt-2.5">
            <div>
              <div className="text-tiny text-[#777777]">Total Amount</div>
              <div className="font-mono text-base font-bold text-[#171717]">
                {formatPeso(sale.total_amount)}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={function open() {
                openOrderDetails(sale.sale_id);
              }}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Receipt / Return</span>
            </Button>
          </div>
        </div>
      );
    });
  }

  let modalTitle = "Order Details";
  let modalBody = null;
  if (selectedOrder) {
    modalTitle = "Receipt #" + selectedOrder.sale.receipt_number;
    let returnStatusBanner = null;
    if (returnMessage) {
      returnStatusBanner = (
        <div className="rounded-xl border border-[#E9E9E9] bg-[#EEEEED] px-3.5 py-2.5 text-xs font-medium text-[#171717]">
          {returnMessage}
        </div>
      );
    }

    modalBody = (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ReceiptView sale={selectedOrder.sale} items={selectedOrder.items} />

        <form onSubmit={handleProcessReturn} className="space-y-4 border-t pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0 border-[#E9E9E9]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
            <RotateCcw className="h-4 w-4 text-[#171717]" />
            <span>Return Items</span>
          </div>
          {returnStatusBanner}

          <div className="space-y-3">
            {selectedOrder.items.map(function renderItemReturn(item) {
              let value = returnQuantities[item.sale_item_id];
              if (value === undefined) {
                value = "";
              }
              return (
                <div
                  key={item.sale_item_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E9E9E9] p-3.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[#171717]">
                      {item.option_name_snapshot}
                    </div>
                    <div className="mt-0.5 font-mono text-tiny text-[#777777]">
                      Sold: {formatQuantity(item.quantity)} · {formatPeso(item.subtotal)}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max={item.quantity}
                    value={value}
                    aria-label={"Return quantity for " + item.option_name_snapshot}
                    onChange={function onChange(event) {
                      updateReturnQty(item.sale_item_id, event.target.value);
                    }}
                    placeholder="0"
                    className="w-20 rounded-xl border border-[#E9E9E9] bg-white px-2.5 py-1.5 text-right font-mono text-xs text-[#171717] focus:border-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30"
                  />
                </div>
              );
            })}
          </div>

          <Input
            label="Reason / Remarks"
            value={returnRemarks}
            onChange={function onChange(event) {
              setReturnRemarks(event.target.value);
            }}
            placeholder="e.g. Damaged pack"
            required={true}
          />

          <Button type="submit" variant="danger" disabled={submittingReturn} className="w-full">
            Process Return
          </Button>
        </form>
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader title="Transactions" stackOnMobile={true} />

      {/* Search & Payment Method Filter Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search receipt #..."
          className="w-full sm:w-72"
        />
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <FilterPill
            label="All"
            count={sales.length}
            active={paymentFilter === "ALL"}
            onClick={function selectAll() {
              setPaymentFilter("ALL");
            }}
          />
          <FilterPill
            label="Cash"
            count={cashCount}
            active={paymentFilter === "CASH"}
            onClick={function selectCash() {
              setPaymentFilter("CASH");
            }}
          />
          <FilterPill
            label="Utang"
            count={creditCount}
            active={paymentFilter === "CREDIT"}
            onClick={function selectCredit() {
              setPaymentFilter("CREDIT");
            }}
          />
          <FilterPill
            label="Split"
            count={splitCount}
            active={paymentFilter === "SPLIT"}
            onClick={function selectSplit() {
              setPaymentFilter("SPLIT");
            }}
          />
        </div>
      </div>

      {errorElement}

      {showSalesSkeleton && <span role="status" aria-label="Loading transaction list" className="sr-only">Loading transactions</span>}

      {/* Mobile Card List (< md) */}
      <div className="flex-1 overflow-y-auto space-y-3 md:hidden" aria-busy={!hasLoadedSales && !salesLoadFailed}>
        {mobileSalesList}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block flex-1 overflow-auto rounded-2xl border border-[#E9E9E9] bg-white" aria-busy={!hasLoadedSales && !salesLoadFailed}>
        <DataTable
          stickyHead={true}
          headRow={
            <tr>
              <th className="px-5 py-3">Receipt</th>
              <th className="px-5 py-3">Date (Manila)</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-right">Change</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          }
        >
          {tableBody}
        </DataTable>
      </div>

      <Modal
        open={selectedOrder !== null}
        onClose={function close() {
          setSelectedOrder(null);
        }}
        title={modalTitle}
        size="xl"
      >
        {modalBody}
      </Modal>
    </PageLayout>
  );
}
