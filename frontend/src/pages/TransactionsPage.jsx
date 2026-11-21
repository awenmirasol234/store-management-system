import { useEffect, useState } from "react";
import { RotateCcw, Receipt, Search, X } from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatQuantity, formatSmartDateTime } from "../format.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { Input } from "../components/Input.jsx";
import { Modal } from "../components/Modal.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { ReceiptView } from "../components/ReceiptView.jsx";
import { TableEmptyRow } from "../components/TableEmptyRow.jsx";

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

export function TransactionsPage() {
  const [sales, setSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnRemarks, setReturnRemarks] = useState("");
  const [returnMessage, setReturnMessage] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  async function loadSales() {
    setErrorBanner("");
    try {
      const list = await api.listSales(50);
      setSales(list);
    } catch (error) {
      setErrorBanner(error.message);
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
      const result = await api.processReturn(selectedOrder.sale.sale_id, {
        items: itemsToReturn,
        remarks: returnRemarks,
        created_by: "owner"
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

  const filteredSales = filterSales(sales, searchQuery);

  let clearButton = null;
  if (searchQuery.trim().length > 0) {
    clearButton = (
      <button
        type="button"
        onClick={function clearSearch() {
          setSearchQuery("");
        }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
        title="Clear search"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    );
  }

  let errorElement = <ErrorBanner message={errorBanner} className="relative z-[60] mb-6" />;

  let tableBody = <TableEmptyRow colSpan="6" message="No completed sales yet." />;
  if (sales.length > 0 && filteredSales.length === 0) {
    tableBody = (
      <TableEmptyRow
        colSpan="6"
        message={'No transactions matching "' + searchQuery + '".'}
      />
    );
  } else if (filteredSales.length > 0) {
    tableBody = filteredSales.map(function renderSaleRow(sale) {
      return (
        <tr key={sale.sale_id} className="hover:bg-slate-50">
          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-slate-900">
            #{sale.receipt_number}
          </td>
          <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
            {formatSmartDateTime(sale.created_at)}
          </td>
          <td className="px-5 py-3.5">
            <Badge tone={getPaymentTone(sale.payment_method)}>{sale.payment_method}</Badge>
          </td>
          <td className="px-5 py-3.5 font-mono text-sm font-bold text-slate-900 text-right">
            {formatPeso(sale.total_amount)}
          </td>
          <td className="px-5 py-3.5 font-mono text-xs text-slate-600 text-right">
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

  let mobileSalesList = <EmptyState message="No transactions recorded yet." />;
  if (sales.length > 0 && filteredSales.length === 0) {
    mobileSalesList = (
      <EmptyState message={'No transactions matching "' + searchQuery + '".'} />
    );
  } else if (filteredSales.length > 0) {
    mobileSalesList = filteredSales.map(function renderSaleCard(sale) {
      return (
        <div
          key={sale.sale_id}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-sm font-bold text-slate-900">
                #{sale.receipt_number}
              </div>
              <div className="font-mono text-xs text-slate-500 mt-0.5">
                {formatSmartDateTime(sale.created_at)}
              </div>
            </div>
            <Badge tone={getPaymentTone(sale.payment_method)}>{sale.payment_method}</Badge>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
            <div>
              <div className="text-tiny text-slate-400">Total Amount</div>
              <div className="font-mono text-base font-bold text-slate-900">
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
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-medium text-blue-800">
          {returnMessage}
        </div>
      );
    }

    modalBody = (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ReceiptView sale={selectedOrder.sale} items={selectedOrder.items} />

        <form onSubmit={handleProcessReturn} className="space-y-4 border-t pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0 border-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <RotateCcw className="h-4 w-4 text-blue-600" />
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
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-900">
                      {item.option_name_snapshot}
                    </div>
                    <div className="mt-0.5 font-mono text-tiny text-slate-500">
                      Sold: {formatQuantity(item.quantity)} · {formatPeso(item.subtotal)}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max={item.quantity}
                    value={value}
                    onChange={function onChange(event) {
                      updateReturnQty(item.sale_item_id, event.target.value);
                    }}
                    placeholder="0"
                    className="w-20 rounded-md border border-slate-200 px-2.5 py-1.5 text-right font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
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
      <PageHeader title="Transactions" stackOnMobile={true}>
        <div className="flex items-center gap-2.5 flex-1 max-w-sm sm:justify-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={function onSearch(event) {
                setSearchQuery(event.target.value);
              }}
              placeholder="Search receipt #..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            {clearButton}
          </div>

          <Button variant="secondary" size="sm" onClick={loadSales}>
            Refresh
          </Button>
        </div>
      </PageHeader>

      {errorElement}

      {/* Mobile Card List (< md) */}
      <div className="flex-1 overflow-y-auto space-y-3 md:hidden">
        {mobileSalesList}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block flex-1 overflow-auto rounded-xl border border-slate-200 bg-white">
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
