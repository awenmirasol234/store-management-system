import { useEffect, useState } from "react";
import { api } from "../api.js";
import {
  calculatePercentageTrend,
  formatPeso,
  formatQuantity,
  formatQuantityWithUnit,
  formatSmartDate,
  formatUnit,
  getManilaIsoDateOffset
} from "../format.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { LineChart } from "../components/LineChart.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { PieChart } from "../components/PieChart.jsx";
import { ProductThumb } from "../components/ProductThumb.jsx";
import { StatCard } from "../components/StatCard.jsx";

export function DashboardPage(props) {
  const [summary, setSummary] = useState(null);
  const [previousSummary, setPreviousSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [dailyTrends, setDailyTrends] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [trendRange, setTrendRange] = useState("7D");
  const [pieMode, setPieMode] = useState("CATEGORY");
  const [errorBanner, setErrorBanner] = useState("");

  const isOwner = Boolean(!props.currentUser || props.currentUser.role === "OWNER");

  async function loadDashboard() {
    setErrorBanner("");
    try {
      if (!isOwner) {
        const products = await api.listLowStockProducts();
        setLowStock(products || []);
        return;
      }

      const today = getManilaIsoDateOffset(0);
      const yesterday = getManilaIsoDateOffset(-1);
      let daysOffset = -6;
      if (trendRange === "30D") {
        daysOffset = -29;
      }
      const startDate = getManilaIsoDateOffset(daysOffset);

      const results = await Promise.all([
        api.getReportsSummary(today, today),
        api.getReportsSummary(yesterday, yesterday),
        api.listLowStockProducts(),
        api.getTopProducts(null, null, 5),
        api.getDailyReport(startDate, today),
        api.getCategorySalesReport(startDate, today)
      ]);
      setSummary(results[0]);
      setPreviousSummary(results[1]);
      setLowStock(results[2]);
      setTopProducts(results[3]);
      setDailyTrends(results[4] || []);
      setCategorySales(results[5] || []);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  useEffect(
    function initOrRangeChange() {
      loadDashboard();
    },
    [trendRange]
  );

  let errorElement = <ErrorBanner message={errorBanner} className="mb-4 sm:mb-5" />;

  let todaySales = "₱0.00";
  let transactionCount = "0";
  let itemsSoldCount = "0";
  let grossProfit = "₱0.00";

  if (summary) {
    todaySales = formatPeso(summary.gross_sales);
    transactionCount = String(summary.sale_count);
    itemsSoldCount = formatQuantity(summary.total_items_sold || 0);
    grossProfit = formatPeso(summary.net_profit);
  }

  let salesTrend = null;
  let transactionsTrend = null;
  let itemsTrend = null;
  let profitTrend = null;

  if (summary && previousSummary) {
    salesTrend = calculatePercentageTrend(summary.gross_sales, previousSummary.gross_sales);
    transactionsTrend = calculatePercentageTrend(summary.sale_count, previousSummary.sale_count);
    itemsTrend = calculatePercentageTrend(
      summary.total_items_sold || 0,
      previousSummary.total_items_sold || 0
    );
    profitTrend = calculatePercentageTrend(summary.net_profit, previousSummary.net_profit);
  }

  // Format line chart trend data (oldest to newest)
  const trendChartData = (dailyTrends || [])
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
        fullDate: formatSmartDate(row.date),
        sales: row.gross_sales,
        profit: row.profit,
        meta: row.sale_count + " transactions"
      };
    });

  // Format category sales for pie chart
  const categoryPieData = (categorySales || []).map(function (cat) {
    return {
      label: cat.category_name,
      value: cat.revenue,
      count: cat.quantity_sold
    };
  });

  // Format payment breakdown for pie chart
  const paymentPieData = [];
  if (summary) {
    if (summary.cash_sales > 0) {
      paymentPieData.push({
        label: "Cash Sales",
        value: summary.cash_sales,
        color: "#171717"
      });
    }
    if (summary.credit_sales > 0) {
      paymentPieData.push({
        label: "Utang / Credit",
        value: summary.credit_sales,
        color: "#B9F36B"
      });
    }
  }

  let lowStockList = <EmptyState message="All stock levels are healthy." padding="md" />;
  if (lowStock.length > 0) {
    lowStockList = (
      <div className="divide-y divide-[#E9E9E9]">
        {lowStock.slice(0, 6).map(function renderLowItem(product) {
          const isOut = Number(product.current_stock) <= 0;
          let badgeTone = "amber";
          let badgeText = formatQuantityWithUnit(product.current_stock, product.base_unit);
          if (isOut) {
            badgeTone = "red";
            badgeText = "OUT OF STOCK";
          }
          return (
            <div key={product.product_id} className="flex items-center justify-between py-3">
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-medium text-[#171717]">
                  {product.product_name}
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">
                  Reorder at {formatQuantityWithUnit(product.reorder_level, product.base_unit)}
                </div>
              </div>
              <Badge tone={badgeTone} className="font-mono shrink-0">
                {badgeText}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }

  let topProductsList = <EmptyState message="No sales data recorded today." padding="md" />;
  if (topProducts.length > 0) {
    topProductsList = (
      <div className="divide-y divide-[#E9E9E9]">
        {topProducts.slice(0, 6).map(function renderTop(item, idx) {
          return (
            <div key={item.product_id || idx} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 min-w-0 pr-3">
                <ProductThumb imageUrl={item.image_url} name={item.product_name} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[#171717]">
                    {item.product_name}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-[#777777]">
                    {formatQuantity(item.quantity_sold)} {formatUnit(item.base_unit, item.quantity_sold)} sold
                  </div>
                </div>
              </div>
              <div className="font-mono text-sm font-semibold text-[#171717] shrink-0">
                {formatPeso(item.revenue)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  let inventoryAction = "View Inventory";
  let sectionsClass = "grid grid-cols-1 gap-4 sm:gap-5";
  if (isOwner) {
    inventoryAction = "Restock";
    sectionsClass = sectionsClass + " lg:grid-cols-2";
  }

  return (
    <PageLayout scroll={true}>
      <PageHeader title="Dashboard" />

      {errorElement}

      {/* 1. Summary KPI Cards */}
      {isOwner && (
        <div className="mb-4 sm:mb-5 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's Sales"
            value={todaySales}
            meta={transactionCount + " transactions today"}
            trend={salesTrend}
            trendLabel="Compared to yesterday"
          />
          <StatCard
            label="Transactions"
            value={transactionCount}
            meta="Completed checkouts"
            trend={transactionsTrend}
            trendLabel="Compared to yesterday"
          />
          <StatCard
            label="Items Sold"
            value={itemsSoldCount}
            meta="Units moved today"
            trend={itemsTrend}
            trendLabel="Compared to yesterday"
          />
          <StatCard
            label="Today's Profit"
            value={grossProfit}
            meta="Gross profit today"
            trend={profitTrend}
            trendLabel="Compared to yesterday"
          />
        </div>
      )}

      {/* 2. Visual Analytics: Sales & Profit Line Chart and Category/Payment Donut Chart */}
      {isOwner && (
        <div className="mb-4 sm:mb-5 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Sales & Profit Line Chart Card */}
          <section className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#171717]">Sales &amp; Profit Trend</h2>
                <p className="text-xs text-[#777777]">Daily performance over time</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-[#F5F5F4] p-1 border border-[#E9E9E9]">
                <button
                  type="button"
                  onClick={function () {
                    setTrendRange("7D");
                  }}
                  className={
                    "rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors " +
                    (trendRange === "7D"
                      ? "bg-[#171717] text-white shadow-xs"
                      : "text-[#777777] hover:text-[#171717]")
                  }
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setTrendRange("30D");
                  }}
                  className={
                    "rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors " +
                    (trendRange === "30D"
                      ? "bg-[#171717] text-white shadow-xs"
                      : "text-[#777777] hover:text-[#171717]")
                  }
                >
                  30 Days
                </button>
              </div>
            </div>
            <LineChart data={trendChartData} />
          </section>

          {/* Distribution Donut Chart Card */}
          <section className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5 lg:col-span-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#171717]">Sales Distribution</h2>
                <p className="text-xs text-[#777777]">Revenue breakdown by segment</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-[#F5F5F4] p-1 border border-[#E9E9E9]">
                <button
                  type="button"
                  onClick={function () {
                    setPieMode("CATEGORY");
                  }}
                  className={
                    "rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors " +
                    (pieMode === "CATEGORY"
                      ? "bg-[#171717] text-white shadow-xs"
                      : "text-[#777777] hover:text-[#171717]")
                  }
                >
                  Category
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setPieMode("PAYMENT");
                  }}
                  className={
                    "rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors " +
                    (pieMode === "PAYMENT"
                      ? "bg-[#171717] text-white shadow-xs"
                      : "text-[#777777] hover:text-[#171717]")
                  }
                >
                  Payment
                </button>
              </div>
            </div>
            <PieChart
              data={pieMode === "CATEGORY" ? categoryPieData : paymentPieData}
              centerLabel={pieMode === "CATEGORY" ? "Categories" : "Payments"}
            />
          </section>
        </div>
      )}

      {/* 3. Operational Sections: Top Selling, Inventory Alerts */}
      <div className={sectionsClass}>
        {/* Top-Selling Products */}
        {isOwner && (
          <section className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#171717]">Top Selling Products</h2>
              <span className="font-mono text-xs text-[#777777]">Top 5</span>
            </div>
            {topProductsList}
          </section>
        )}

        {/* Inventory Alerts */}
        <section className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#171717]">Inventory Alerts</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={function goInventory() {
                props.onNavigate("inventory");
              }}
            >
              {inventoryAction}
            </Button>
          </div>
          {lowStockList}
        </section>
      </div>
    </PageLayout>
  );
}
