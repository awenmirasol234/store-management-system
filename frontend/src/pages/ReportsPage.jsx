import { useEffect, useState } from "react";
import { Banknote, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatQuantity, formatSmartDate, getManilaIsoDateOffset } from "../format.js";
import { Button } from "../components/Button.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { TableEmptyRow } from "../components/TableEmptyRow.jsx";

export function ReportsPage() {
  const [fromDate, setFromDate] = useState(function initFrom() {
    return getManilaIsoDateOffset(0);
  });
  const [toDate, setToDate] = useState(function initTo() {
    return getManilaIsoDateOffset(0);
  });
  const [activePreset, setActivePreset] = useState("TODAY");

  const [summary, setSummary] = useState(null);
  const [dailyRows, setDailyRows] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [errorBanner, setErrorBanner] = useState("");

  async function loadReports(startDate, endDate) {
    setErrorBanner("");
    try {
      const results = await Promise.all([
        api.getReportsSummary(startDate, endDate),
        api.getDailyReport(startDate, endDate),
        api.getTopProducts(startDate, endDate, 10)
      ]);
      setSummary(results[0]);
      setDailyRows(results[1]);
      setTopProducts(results[2]);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  useEffect(
    function fetchOnDateChange() {
      loadReports(fromDate, toDate);
    },
    [fromDate, toDate]
  );

  function selectPreset(presetKey, daysBack) {
    const end = getManilaIsoDateOffset(0);
    const start = getManilaIsoDateOffset(-daysBack);
    setActivePreset(presetKey);
    setFromDate(start);
    setToDate(end);
  }

  let errorElement = <ErrorBanner message={errorBanner} className="mb-6" />;

  let grossSales = "₱0.00";
  let netProfit = "₱0.00";
  let cashSales = "₱0.00";
  let creditSales = "₱0.00";
  let ordersMeta = "0 orders";
  let cogsMeta = "COGS: ₱0.00";
  if (summary) {
    grossSales = formatPeso(summary.gross_sales);
    netProfit = formatPeso(summary.net_profit);
    cashSales = formatPeso(summary.cash_sales);
    creditSales = formatPeso(summary.credit_sales);
    ordersMeta = String(summary.sale_count) + " orders";
    cogsMeta = "COGS: " + formatPeso(summary.cogs);
  }

  let dailyTableBody = (
    <TableEmptyRow colSpan="4" message="No sales in this date range." padding="md" />
  );
  if (dailyRows.length > 0) {
    dailyTableBody = dailyRows.map(function renderDay(row) {
      return (
        <tr key={row.date} className="hover:bg-slate-50">
          <td className="px-5 py-3.5 font-mono text-sm font-medium text-slate-900">
            {formatSmartDate(row.date)}
          </td>
          <td className="px-5 py-3.5 font-mono text-sm text-slate-600 text-right">
            {row.sale_count}
          </td>
          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-slate-900 text-right">
            {formatPeso(row.gross_sales)}
          </td>
          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-emerald-700 text-right">
            {formatPeso(row.profit)}
          </td>
        </tr>
      );
    });
  }

  let topTableBody = (
    <TableEmptyRow colSpan="4" message="No product sales in this date range." padding="md" />
  );
  if (topProducts.length > 0) {
    topTableBody = topProducts.map(function renderProduct(item) {
      return (
        <tr key={item.product_id} className="hover:bg-slate-50">
          <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{item.product_name}</td>
          <td className="px-5 py-3.5 font-mono text-sm text-slate-600 text-right">
            {formatQuantity(item.quantity_sold)} {item.base_unit}
          </td>
          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-slate-900 text-right">
            {formatPeso(item.revenue)}
          </td>
          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-emerald-700 text-right">
            {formatPeso(item.profit)}
          </td>
        </tr>
      );
    });
  }

  let todayVariant = "secondary";
  if (activePreset === "TODAY") {
    todayVariant = "primary";
  }
  let weekVariant = "secondary";
  if (activePreset === "7D") {
    weekVariant = "primary";
  }
  let monthVariant = "secondary";
  if (activePreset === "30D") {
    monthVariant = "primary";
  }

  return (
    <PageLayout scroll={true}>
      <PageHeader title="Reports">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant={todayVariant}
            size="sm"
            onClick={function pickToday() {
              selectPreset("TODAY", 0);
            }}
          >
            Today
          </Button>
          <Button
            variant={weekVariant}
            size="sm"
            onClick={function pickWeek() {
              selectPreset("7D", 6);
            }}
          >
            <span className="font-mono">7</span> Days
          </Button>
          <Button
            variant={monthVariant}
            size="sm"
            onClick={function pickMonth() {
              selectPreset("30D", 29);
            }}
          >
            <span className="font-mono">30</span> Days
          </Button>

          <input
            type="date"
            value={fromDate}
            onChange={function onFrom(event) {
              setActivePreset("CUSTOM");
              setFromDate(event.target.value);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={function onTo(event) {
              setActivePreset("CUSTOM");
              setToDate(event.target.value);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </PageHeader>

      {errorElement}

      <div className="mb-6 sm:mb-7 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross Sales"
          value={grossSales}
          meta={ordersMeta}
          tone="blue"
          icon={Banknote}
        />
        <StatCard
          label="Net Profit"
          value={netProfit}
          meta={cogsMeta}
          tone="green"
          icon={TrendingUp}
        />
        <StatCard label="Cash Sales" value={cashSales} icon={Wallet} />
        <StatCard label="Credit (Utang)" value={creditSales} tone="amber" icon={CreditCard} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4 text-sm font-bold text-slate-900">
            Daily Sales
          </div>
          <div className="overflow-x-auto">
            <DataTable
              headRow={
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Orders</th>
                  <th className="px-5 py-3 text-right">Sales</th>
                  <th className="px-5 py-3 text-right">Profit</th>
                </tr>
              }
            >
              {dailyTableBody}
            </DataTable>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4 text-sm font-bold text-slate-900">
            Top Products
          </div>
          <div className="overflow-x-auto">
            <DataTable
              headRow={
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                  <th className="px-5 py-3 text-right">Profit</th>
                </tr>
              }
            >
              {topTableBody}
            </DataTable>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
