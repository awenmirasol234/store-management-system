import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart2,
  Calendar,
  Download,
  Package,
  Printer,
  Search,
  TrendingUp
} from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatQuantity, formatQuantityWithUnit, formatSmartDate, formatSmartDateTime, getManilaIsoDateOffset } from "../format.js";
import { exportToCsv, triggerPrintReport } from "../export.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { Modal } from "../components/Modal.jsx";
import { ProductThumb } from "../components/ProductThumb.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { TableEmptyRow } from "../components/TableEmptyRow.jsx";
import { MultiTrendBarChart } from "../components/TrendBarChart.jsx";

const TABS = [
  { id: "SALES", label: "Sales Report" },
  { id: "PRODUCTS", label: "Product Sales" },
  { id: "CATEGORIES", label: "Category Sales" },
  { id: "PROFIT", label: "Profit & COGS" },
  { id: "INVENTORY", label: "Inventory Health" },
  { id: "MOVEMENTS", label: "Stock Movement" },
  { id: "TRANSACTIONS", label: "Transactions" }
];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("SALES");
  const [fromDate, setFromDate] = useState(function initFrom() {
    return getManilaIsoDateOffset(0);
  });
  const [toDate, setToDate] = useState(function initTo() {
    return getManilaIsoDateOffset(0);
  });
  const [activePreset, setActivePreset] = useState("TODAY");

  // Custom Range Modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  // Report Data
  const [summary, setSummary] = useState(null);
  const [dailyRows, setDailyRows] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [errorBanner, setErrorBanner] = useState("");

  async function loadAllReports(start, end) {
    setErrorBanner("");
    try {
      const results = await Promise.all([
        api.getReportsSummary(start, end),
        api.getDailyReport(start, end),
        api.getTopProducts(start, end, 50),
        api.getCategorySalesReport(start, end),
        api.getStockMovementsReport(start, end),
        api.getTransactionsReport(start, end)
      ]);
      setSummary(results[0]);
      setDailyRows(results[1] || []);
      setTopProducts(results[2] || []);
      setCategorySales(results[3] || []);
      setStockMovements(results[4] || []);
      setTransactions(results[5] || []);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  useEffect(
    function fetchOnDateChange() {
      loadAllReports(fromDate, toDate);
    },
    [fromDate, toDate]
  );

  function selectPreset(presetKey) {
    setActivePreset(presetKey);
    const end = getManilaIsoDateOffset(0);
    let start = end;

    if (presetKey === "TODAY") {
      start = end;
    } else if (presetKey === "WEEK") {
      start = getManilaIsoDateOffset(-6);
    } else if (presetKey === "MONTH") {
      start = getManilaIsoDateOffset(-29);
    }
    setFromDate(start);
    setToDate(end);
  }

  // Export handlers
  function handleExportCsv() {
    let filenameDate = fromDate;
    if (fromDate !== toDate) {
      filenameDate = fromDate + "_to_" + toDate;
    }

    if (activeTab === "SALES" || activeTab === "PROFIT") {
      exportToCsv("sales_profit_report_" + filenameDate, [
        { key: "date", label: "Date" },
        { key: "sale_count", label: "Orders" },
        { key: "gross_sales", label: "Gross Sales (PHP)" },
        { key: "profit", label: "Profit (PHP)" }
      ], dailyRows);
    } else if (activeTab === "PRODUCTS") {
      exportToCsv("product_sales_report_" + filenameDate, [
        { key: "product_name", label: "Product" },
        { key: "base_unit", label: "Unit" },
        { key: "quantity_sold", label: "Qty Sold" },
        { key: "revenue", label: "Revenue (PHP)" },
        { key: "profit", label: "Profit (PHP)" }
      ], topProducts);
    } else if (activeTab === "CATEGORIES") {
      exportToCsv("category_sales_report_" + filenameDate, [
        { key: "category_name", label: "Category" },
        { key: "quantity_sold", label: "Qty Sold" },
        { key: "revenue", label: "Revenue (PHP)" },
        { key: "profit", label: "Profit (PHP)" }
      ], categorySales);
    } else if (activeTab === "INVENTORY") {
      let activeProductCountVal = 0;
      let lowStockCountVal = 0;
      let outOfStockCountVal = 0;
      let valuationVal = 0;
      if (summary) {
        activeProductCountVal = summary.active_product_count;
        lowStockCountVal = summary.low_stock_count;
        outOfStockCountVal = summary.out_of_stock_count;
        valuationVal = summary.inventory_valuation;
      }
      exportToCsv("inventory_valuation_" + filenameDate, [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" }
      ], [
        { metric: "Active Products", value: activeProductCountVal },
        { metric: "Low Stock Items", value: lowStockCountVal },
        { metric: "Out of Stock Items", value: outOfStockCountVal },
        { metric: "Inventory Valuation", value: valuationVal }
      ]);
    } else if (activeTab === "MOVEMENTS") {
      exportToCsv("stock_movements_" + filenameDate, [
        { key: "created_at", label: "Date" },
        { key: "product_name", label: "Product" },
        { key: "transaction_type", label: "Type" },
        { key: "quantity", label: "Quantity" },
        { key: "unit_cost", label: "Unit Cost" },
        { key: "reference_number", label: "Reference" },
        { key: "remarks", label: "Remarks" },
        { key: "created_by", label: "User" }
      ], stockMovements);
    } else if (activeTab === "TRANSACTIONS") {
      exportToCsv("transactions_report_" + filenameDate, [
        { key: "created_at", label: "Date" },
        { key: "receipt_number", label: "Receipt #" },
        { key: "payment_method", label: "Payment Method" },
        { key: "subtotal_amount", label: "Subtotal" },
        { key: "discount_amount", label: "Discount" },
        { key: "total_amount", label: "Total Amount" },
        { key: "status", label: "Status" },
        { key: "created_by", label: "Cashier" }
      ], transactions);
    }
  }

  // Summary Card Metrics
  let grossSales = "₱0.00";
  let netSales = "₱0.00";
  let netProfit = "₱0.00";
  let cogs = "₱0.00";
  let totalDiscounts = "₱0.00";
  let totalRefunds = "₱0.00";
  let totalOrders = "0";
  let inventoryValue = "₱0.00";
  let lowStockCount = "0";
  let outOfStockCount = "0";
  let activeProductCount = "0";

  if (summary) {
    grossSales = formatPeso(summary.gross_sales);
    netSales = formatPeso(summary.net_sales || summary.gross_sales - summary.total_refunds);
    netProfit = formatPeso(summary.net_profit);
    cogs = formatPeso(summary.cogs);
    totalDiscounts = formatPeso(summary.total_discount);
    totalRefunds = formatPeso(summary.total_refunds);
    totalOrders = String(summary.sale_count);
    inventoryValue = formatPeso(summary.inventory_valuation);
    lowStockCount = String(summary.low_stock_count);
    outOfStockCount = String(summary.out_of_stock_count || 0);
    activeProductCount = String(summary.active_product_count || 0);
  }

  // Chart Data
  const trendChartData = (dailyRows || [])
    .slice()
    .reverse()
    .map(function (row) {
      let shortLabel = "";
      if (row.date) {
        shortLabel = row.date.slice(5);
      }
      return {
        label: formatSmartDate(row.date),
        shortLabel: shortLabel,
        sales: row.gross_sales,
        profit: row.profit
      };
    });

  function getPresetButtonClass(presetKey) {
    if (activePreset === presetKey) {
      if (presetKey === "CUSTOM") {
        return "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-[#B9F36B] text-[#151515] cursor-pointer transition-colors";
      }
      return "rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#151515] text-white cursor-pointer transition-colors";
    }
    if (presetKey === "CUSTOM") {
      return "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#777777] hover:text-[#151515] hover:bg-[#EEEEED] cursor-pointer transition-colors";
    }
    return "rounded-lg px-3 py-1.5 text-xs font-semibold text-[#777777] hover:text-[#151515] hover:bg-[#EEEEED] cursor-pointer transition-colors";
  }

  let customPresetLabel = "Custom";
  if (activePreset === "CUSTOM") {
    customPresetLabel = formatSmartDate(fromDate) + " – " + formatSmartDate(toDate);
  }

  function getTabButtonClass(tabId) {
    if (activeTab === tabId) {
      return "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#151515] text-white cursor-pointer transition-colors";
    }
    return "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#777777] hover:text-[#151515] hover:bg-[#EEEEED] cursor-pointer transition-colors";
  }

  let activeTabContent = null;

  if (activeTab === "SALES") {
    let dailyRowsContent = null;
    if (dailyRows.length === 0) {
      dailyRowsContent = <TableEmptyRow colSpan="4" message="No sales in this date range." />;
    } else {
      dailyRowsContent = dailyRows.map(function (row) {
        return (
          <tr key={row.date} className="hover:bg-[#EEEEED]/40 transition-colors">
            <td className="px-5 py-3.5 font-mono text-sm font-medium text-[#151515]">{formatSmartDate(row.date)}</td>
            <td className="px-5 py-3.5 font-mono text-sm text-[#777777] text-right">{row.sale_count}</td>
            <td className="px-5 py-3.5 font-mono text-sm font-semibold text-[#151515] text-right">{formatPeso(row.gross_sales)}</td>
            <td className="px-5 py-3.5 font-mono text-sm font-semibold text-emerald-700 text-right">{formatPeso(row.profit)}</td>
          </tr>
        );
      });
    }

    activeTabContent = (
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Gross Sales" value={grossSales} meta={totalOrders + " orders"} icon={Banknote} />
          <StatCard label="Discounts" value={totalDiscounts} meta="Total markdown" icon={ArrowDownRight} />
          <StatCard label="Refunds / Returns" value={totalRefunds} meta="Processed refunds" icon={ArrowUpRight} />
          <StatCard label="Net Sales" value={netSales} meta="Gross - Discounts & Refunds" icon={TrendingUp} />
        </div>

        <section className="rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-[#151515]">Sales & Profit Trend</h3>
            <p className="text-xs text-[#777777]">Comparing daily gross sales against gross profit</p>
          </div>
          <MultiTrendBarChart data={trendChartData} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E9E9E9] bg-white">
          <div className="border-b border-[#E9E9E9] px-5 py-3.5 text-sm font-semibold text-[#151515]">
            Daily Sales Breakdown
          </div>
          <div className="overflow-x-auto">
            <DataTable
              headRow={
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Orders</th>
                  <th className="px-5 py-3 text-right">Gross Sales</th>
                  <th className="px-5 py-3 text-right">Profit</th>
                </tr>
              }
            >
              {dailyRowsContent}
            </DataTable>
          </div>
        </section>
      </div>
    );
  } else if (activeTab === "PRODUCTS") {
    activeTabContent = (
      <section className="overflow-hidden rounded-2xl border border-[#E9E9E9] bg-white">
        <div className="flex flex-wrap items-center justify-between border-b border-[#E9E9E9] px-5 py-3.5 gap-2">
          <div className="text-sm font-semibold text-[#151515]">Product Performance</div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#777777]" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={function (e) {
                setSearchTerm(e.target.value);
              }}
              className="rounded-xl border border-[#E9E9E9] bg-[#FBFBFA] pl-8 pr-3 py-1.5 font-mono text-xs text-[#151515] focus:outline-none focus:border-[#151515]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            headRow={
              <tr>
                <th className="px-5 py-3">Product Name</th>
                <th className="px-5 py-3 text-right">Quantity Sold</th>
                <th className="px-5 py-3 text-right">Revenue</th>
                <th className="px-5 py-3 text-right">Gross Profit</th>
              </tr>
            }
          >
            {topProducts
              .filter(function (p) {
                return p.product_name.toLowerCase().includes(searchTerm.toLowerCase());
              })
              .map(function (item) {
                return (
                  <tr key={item.product_id} className="hover:bg-[#EEEEED]/40 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-[#151515]">
                      <div className="flex items-center gap-3">
                        <ProductThumb imageUrl={item.image_url} name={item.product_name} size="sm" />
                        <span className="truncate">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-[#777777] text-right">
                      {formatQuantityWithUnit(item.quantity_sold, item.base_unit)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm font-semibold text-[#151515] text-right">{formatPeso(item.revenue)}</td>
                    <td className="px-5 py-3.5 font-mono text-sm font-semibold text-emerald-700 text-right">{formatPeso(item.profit)}</td>
                  </tr>
                );
              })}
          </DataTable>
        </div>
      </section>
    );
  } else if (activeTab === "CATEGORIES") {
    let categorySalesContent = null;
    if (categorySales.length === 0) {
      categorySalesContent = <TableEmptyRow colSpan="4" message="No category sales in this range." />;
    } else {
      categorySalesContent = categorySales.map(function (cat) {
        return (
          <tr key={cat.category_id} className="hover:bg-[#EEEEED]/40 transition-colors">
            <td className="px-5 py-3.5 text-sm font-medium text-[#151515]">{cat.category_name}</td>
            <td className="px-5 py-3.5 font-mono text-sm text-[#777777] text-right">{formatQuantity(cat.quantity_sold)}</td>
            <td className="px-5 py-3.5 font-mono text-sm font-semibold text-[#151515] text-right">{formatPeso(cat.revenue)}</td>
            <td className="px-5 py-3.5 font-mono text-sm font-semibold text-emerald-700 text-right">{formatPeso(cat.profit)}</td>
          </tr>
        );
      });
    }

    activeTabContent = (
      <section className="overflow-hidden rounded-2xl border border-[#E9E9E9] bg-white">
        <div className="border-b border-[#E9E9E9] px-5 py-3.5 text-sm font-semibold text-[#151515]">
          Sales by Category
        </div>
        <div className="overflow-x-auto">
          <DataTable
            headRow={
              <tr>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Total Quantity Sold</th>
                <th className="px-5 py-3 text-right">Revenue</th>
                <th className="px-5 py-3 text-right">Profit</th>
              </tr>
            }
          >
            {categorySalesContent}
          </DataTable>
        </div>
      </section>
    );
  } else if (activeTab === "PROFIT") {
    activeTabContent = (
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
          <StatCard label="Gross Sales" value={grossSales} meta="Total sales revenue" icon={Banknote} />
          <StatCard label="Cost of Goods Sold (COGS)" value={cogs} meta="Cost of sold inventory" tone="amber" icon={Package} />
          <StatCard label="Net Profit" value={netProfit} meta="Sales - COGS - Refunds" tone="green" icon={TrendingUp} />
        </div>

        <section className="rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-[#151515]">Profit Trend Analysis</h3>
            <p className="text-xs text-[#777777]">Revenue vs Profit generation across selected range</p>
          </div>
          <MultiTrendBarChart data={trendChartData} />
        </section>
      </div>
    );
  } else if (activeTab === "INVENTORY") {
    activeTabContent = (
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Inventory Valuation" value={inventoryValue} meta="Current stock × cost price" icon={Package} />
          <StatCard label="Active Products" value={activeProductCount} meta="Catalog products" icon={BarChart2} />
          <StatCard label="Low Stock Items" value={lowStockCount} meta="Below reorder level" tone="amber" icon={ArrowDownRight} />
          <StatCard label="Out of Stock" value={outOfStockCount} meta="0 stock remaining" tone="red" icon={ArrowUpRight} />
        </div>
      </div>
    );
  } else if (activeTab === "MOVEMENTS") {
    activeTabContent = (
      <section className="overflow-hidden rounded-2xl border border-[#E9E9E9] bg-white">
        <div className="flex flex-wrap items-center justify-between border-b border-[#E9E9E9] px-5 py-3.5 gap-2">
          <div className="text-sm font-semibold text-[#151515]">Inventory Movements</div>
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={function (e) {
                setFilterType(e.target.value);
              }}
              className="rounded-xl border border-[#E9E9E9] bg-white px-3 py-1.5 font-mono text-xs text-[#151515] focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="SALE">Sale</option>
              <option value="RETURN">Return</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="DAMAGED">Damaged</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#777777]" />
              <input
                type="text"
                placeholder="Search item..."
                value={searchTerm}
                onChange={function (e) {
                  setSearchTerm(e.target.value);
                }}
                className="rounded-xl border border-[#E9E9E9] bg-[#FBFBFA] pl-8 pr-3 py-1.5 font-mono text-xs text-[#151515] focus:outline-none focus:border-[#151515]"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            headRow={
              <tr>
                <th className="px-5 py-3">Date / Time</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Quantity</th>
                <th className="px-5 py-3">Reference / Remarks</th>
                <th className="px-5 py-3">User</th>
              </tr>
            }
          >
            {stockMovements
              .filter(function (m) {
                const matchType = filterType === "ALL" || m.transaction_type === filterType;
                const matchSearch =
                  searchTerm.length === 0 ||
                  m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (m.remarks && m.remarks.toLowerCase().includes(searchTerm.toLowerCase()));
                return matchType && matchSearch;
              })
              .map(function (tx) {
                let badgeTone = "amber";
                if (tx.transaction_type === "STOCK_IN") {
                  badgeTone = "green";
                } else if (tx.transaction_type === "SALE") {
                  badgeTone = "blue";
                }

                let quantityClass = "px-5 py-3.5 font-mono text-sm font-semibold text-right text-[#151515]";
                let quantityPrefix = "";
                if (Number(tx.quantity) > 0) {
                  quantityClass = "px-5 py-3.5 font-mono text-sm font-semibold text-right text-emerald-700";
                  quantityPrefix = "+";
                }

                let supplierPrefix = null;
                if (tx.supplier_name) {
                  supplierPrefix = <span className="font-medium text-[#151515]">{tx.supplier_name} - </span>;
                }

                let remarksDisplay = "—";
                if (tx.remarks) {
                  remarksDisplay = tx.remarks;
                } else if (tx.reference_number) {
                  remarksDisplay = tx.reference_number;
                }

                return (
                  <tr key={tx.transaction_id} className="hover:bg-[#EEEEED]/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-[#777777]">{formatSmartDateTime(tx.created_at)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-[#151515]">{tx.product_name}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={badgeTone}>
                        {tx.transaction_type}
                      </Badge>
                    </td>
                    <td className={quantityClass}>
                      {quantityPrefix}{formatQuantityWithUnit(tx.quantity, tx.base_unit)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#777777]">
                      {supplierPrefix}
                      {remarksDisplay}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#777777]">{tx.created_by}</td>
                  </tr>
                );
              })}
          </DataTable>
        </div>
      </section>
    );
  } else if (activeTab === "TRANSACTIONS") {
    activeTabContent = (
      <section className="overflow-hidden rounded-2xl border border-[#E9E9E9] bg-white">
        <div className="flex flex-wrap items-center justify-between border-b border-[#E9E9E9] px-5 py-3.5 gap-2">
          <div className="text-sm font-semibold text-[#151515]">Completed Transactions</div>
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={function (e) {
                setFilterType(e.target.value);
              }}
              className="rounded-xl border border-[#E9E9E9] bg-white px-3 py-1.5 font-mono text-xs text-[#151515] focus:outline-none"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">CASH</option>
              <option value="CREDIT">CREDIT</option>
              <option value="SPLIT">SPLIT</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#777777]" />
              <input
                type="text"
                placeholder="Receipt #..."
                value={searchTerm}
                onChange={function (e) {
                  setSearchTerm(e.target.value);
                }}
                className="rounded-xl border border-[#E9E9E9] bg-[#FBFBFA] pl-8 pr-3 py-1.5 font-mono text-xs text-[#151515] focus:outline-none focus:border-[#151515]"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            headRow={
              <tr>
                <th className="px-5 py-3">Receipt #</th>
                <th className="px-5 py-3">Date / Time</th>
                <th className="px-5 py-3">Payment Method</th>
                <th className="px-5 py-3 text-right">Items</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
                <th className="px-5 py-3 text-right">Discount</th>
                <th className="px-5 py-3 text-right">Total Amount</th>
                <th className="px-5 py-3">Cashier</th>
              </tr>
            }
          >
            {transactions
              .filter(function (t) {
                const matchMethod = filterType === "ALL" || t.payment_method === filterType;
                const matchSearch =
                  searchTerm.length === 0 ||
                  t.receipt_number.toLowerCase().includes(searchTerm.toLowerCase());
                return matchMethod && matchSearch;
              })
              .map(function (sale) {
                let paymentBadgeTone = "blue";
                if (sale.payment_method === "CREDIT") {
                  paymentBadgeTone = "amber";
                }

                return (
                  <tr key={sale.sale_id} className="hover:bg-[#EEEEED]/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-sm font-semibold text-[#151515]">#{sale.receipt_number}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#777777]">{formatSmartDateTime(sale.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={paymentBadgeTone}>
                        {sale.payment_method}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-[#777777] text-right">{sale.items_count}</td>
                    <td className="px-5 py-3.5 font-mono text-sm text-[#777777] text-right">{formatPeso(sale.subtotal_amount)}</td>
                    <td className="px-5 py-3.5 font-mono text-sm text-amber-700 text-right">{formatPeso(sale.discount_amount)}</td>
                    <td className="px-5 py-3.5 font-mono text-sm font-bold text-[#151515] text-right">{formatPeso(sale.total_amount)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#777777]">{sale.created_by}</td>
                  </tr>
                );
              })}
          </DataTable>
        </div>
      </section>
    );
  }

  return (
    <PageLayout scroll={true}>
      <PageHeader title="Reports">
        <div className="flex flex-wrap items-center gap-2">
          {/* Shortcut Chips */}
          <div className="flex items-center gap-1 rounded-xl border border-[#E9E9E9] bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={function () {
                selectPreset("TODAY");
              }}
              className={getPresetButtonClass("TODAY")}
            >
              Today
            </button>
            <button
              type="button"
              onClick={function () {
                selectPreset("WEEK");
              }}
              className={getPresetButtonClass("WEEK")}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={function () {
                selectPreset("MONTH");
              }}
              className={getPresetButtonClass("MONTH")}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={function () {
                setDraftFrom(fromDate);
                setDraftTo(toDate);
                setCustomModalOpen(true);
              }}
              className={getPresetButtonClass("CUSTOM")}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{customPresetLabel}</span>
            </button>
          </div>

          {/* Quick Export actions */}
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={handleExportCsv} title="Export current report to CSV">
              <Download className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={triggerPrintReport} title="Print or Save as PDF">
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </PageHeader>

      <ErrorBanner message={errorBanner} className="mb-4 sm:mb-5" />

      {/* Clean Tab Bar */}
      <div className="mb-4 sm:mb-5 flex items-center overflow-x-auto no-scrollbar gap-1 border-b border-[#E9E9E9] pb-2">
        {TABS.map(function (tab) {
          return (
            <button
              key={tab.id}
              onClick={function () {
                setActiveTab(tab.id);
                setSearchTerm("");
                setFilterType("ALL");
              }}
              className={getTabButtonClass(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTabContent}

      {/* Custom Date Range Modal */}
      <Modal
        open={customModalOpen}
        onClose={function () {
          setCustomModalOpen(false);
        }}
        title="Select Date Range"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#777777]">Start Date (From)</label>
            <input
              type="date"
              value={draftFrom}
              onChange={function (e) {
                setDraftFrom(e.target.value);
              }}
              className="w-full rounded-xl border border-[#E9E9E9] bg-[#FBFBFA] px-3.5 py-2 font-mono text-sm text-[#151515] focus:border-[#151515] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#777777]">End Date (To)</label>
            <input
              type="date"
              value={draftTo}
              onChange={function (e) {
                setDraftTo(e.target.value);
              }}
              className="w-full rounded-xl border border-[#E9E9E9] bg-[#FBFBFA] px-3.5 py-2 font-mono text-sm text-[#151515] focus:border-[#151515] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9E9E9]">
            <Button
              variant="secondary"
              size="sm"
              onClick={function () {
                setCustomModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={function () {
                setFromDate(draftFrom);
                setToDate(draftTo);
                setActivePreset("CUSTOM");
                setCustomModalOpen(false);
              }}
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
