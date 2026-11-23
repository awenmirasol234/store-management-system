import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, Package, TrendingUp } from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatQuantity, formatSmartDateTime } from "../format.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { StatCard } from "../components/StatCard.jsx";

export function DashboardPage(props) {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [errorBanner, setErrorBanner] = useState("");

  async function loadDashboard() {
    setErrorBanner("");
    try {
      const isCashier = props && props.currentUser && props.currentUser.role === "CASHIER";
      if (isCashier) {
        const results = await Promise.all([
          api.listLowStockProducts(),
          api.listSales(8)
        ]);
        setLowStock(results[0]);
        setRecentSales(results[1]);
      } else {
        const results = await Promise.all([
          api.getReportsSummary(),
          api.listLowStockProducts(),
          api.listSales(8)
        ]);
        setSummary(results[0]);
        setLowStock(results[1]);
        setRecentSales(results[2]);
      }
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  useEffect(function init() {
    loadDashboard();
  }, []);

  let errorElement = <ErrorBanner message={errorBanner} className="mb-6" />;

  let todaySales = "₱0.00";
  let todayOrdersMeta = "0 orders";
  let todayProfit = "₱0.00";
  let lowStockCountText = "0";
  let stockValue = "₱0.00";
  let activeProductsMeta = "0 active";
  if (summary) {
    todaySales = formatPeso(summary.gross_sales);
    todayOrdersMeta = String(summary.sale_count) + " orders";
    todayProfit = formatPeso(summary.net_profit);
    lowStockCountText = String(summary.low_stock_count);
    stockValue = formatPeso(summary.inventory_valuation);
    activeProductsMeta = String(summary.active_product_count) + " active";
  }

  let lowStockList = <EmptyState message="All stock levels are healthy." padding="md" />;
  if (lowStock.length > 0) {
    lowStockList = (
      <div className="divide-y divide-[#E9E9E9]">
        {lowStock.slice(0, 8).map(function renderLowItem(product) {
          return (
            <div key={product.product_id} className="flex items-center justify-between py-3.5">
              <div className="min-w-0 pr-4">
                <div className="truncate text-sm font-medium text-[#151515]">
                  {product.product_name}
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">
                  Reorder: {formatQuantity(product.reorder_level)} {product.base_unit}
                </div>
              </div>
              <Badge tone="amber" className="font-mono shrink-0">
                {formatQuantity(product.current_stock)} {product.base_unit}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }

  let recentSalesList = <EmptyState message="No sales recorded yet." padding="md" />;
  if (recentSales.length > 0) {
    recentSalesList = (
      <div className="divide-y divide-[#E9E9E9]">
        {recentSales.map(function renderSale(sale) {
          return (
            <div key={sale.sale_id} className="flex items-center justify-between py-3.5">
              <div>
                <div className="font-mono text-sm font-semibold text-[#151515]">
                  #{sale.receipt_number}
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">
                  {formatSmartDateTime(sale.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="blue">{sale.payment_method}</Badge>
                <span className="font-mono text-sm font-bold text-[#151515]">
                  {formatPeso(sale.total_amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <PageLayout scroll={true}>
      <PageHeader title="Dashboard" />

      {errorElement}

      <div className="mb-4 sm:mb-5 grid grid-cols-1 gap-3 sm:gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={todaySales}
          meta={todayOrdersMeta}
          icon={Banknote}
        />
        <StatCard
          label="Today's Profit"
          value={todayProfit}
          icon={TrendingUp}
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStockCountText}
          icon={AlertTriangle}
        />
        <StatCard
          label="Inventory Value"
          value={stockValue}
          meta={activeProductsMeta}
          icon={Package}
        />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3.5 sm:gap-4 lg:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#151515]">Low Stock</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={function goInventory() {
                props.onNavigate("inventory");
              }}
            >
              Manage
            </Button>
          </div>
          {lowStockList}
        </section>

        <section className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#151515]">Recent Sales</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={function goTransactions() {
                props.onNavigate("transactions");
              }}
            >
              View All
            </Button>
          </div>
          {recentSalesList}
        </section>
      </div>
    </PageLayout>
  );
}
