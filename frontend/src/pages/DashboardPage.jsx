import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { api } from "../api.js";
import { formatManilaDateTime, formatPeso, formatQuantity } from "../format.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { StatCard } from "../components/StatCard.jsx";

export function DashboardPage(props) {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [errorBanner, setErrorBanner] = useState("");

  async function loadDashboard() {
    setErrorBanner("");
    try {
      const results = await Promise.all([
        api.getReportsSummary(),
        api.listLowStockProducts(),
        api.listSales(8)
      ]);
      setSummary(results[0]);
      setLowStock(results[1]);
      setRecentSales(results[2]);
    } catch (error) {
      setErrorBanner(error.message);
    }
  }

  useEffect(function init() {
    loadDashboard();
  }, []);

  let errorElement = <ErrorBanner message={errorBanner} className="mb-4" />;

  let todaySales = "₱0.00";
  let todayOrdersMeta = "0 orders";
  let todayProfit = "₱0.00";
  let lowStockCountText = "0";
  let stockValue = "₱0.00";
  let activeProductsMeta = "0 products";
  if (summary) {
    todaySales = formatPeso(summary.gross_sales);
    todayOrdersMeta = String(summary.sale_count) + " orders";
    todayProfit = formatPeso(summary.net_profit);
    lowStockCountText = String(summary.low_stock_count);
    stockValue = formatPeso(summary.inventory_valuation);
    activeProductsMeta = String(summary.active_product_count) + " active";
  }

  let lowStockTone = "green";
  if (lowStock.length > 0) {
    lowStockTone = "amber";
  }

  let lowStockList = (
    <div className="py-8 text-center text-sm text-slate-500">All stock levels are healthy.</div>
  );
  if (lowStock.length > 0) {
    lowStockList = (
      <div className="divide-y divide-slate-100">
        {lowStock.slice(0, 8).map(function renderLowItem(product) {
          return (
            <div key={product.product_id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-medium text-slate-900">
                  {product.product_name}
                </div>
                <div className="font-mono text-xs text-slate-500">
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

  let recentSalesList = (
    <div className="py-8 text-center text-sm text-slate-500">No sales recorded yet.</div>
  );
  if (recentSales.length > 0) {
    recentSalesList = (
      <div className="divide-y divide-slate-100">
        {recentSales.map(function renderSale(sale) {
          return (
            <div key={sale.sale_id} className="flex items-center justify-between py-2.5">
              <div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  #{sale.receipt_number}
                </div>
                <div className="font-mono text-xs text-slate-500">
                  {formatManilaDateTime(sale.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge tone="blue">{sale.payment_method}</Badge>
                <span className="font-mono text-sm font-bold text-slate-900">
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
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-slate-50 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadDashboard}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={function openPos() {
              props.onNavigate("pos");
            }}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Open POS</span>
          </Button>
        </div>
      </div>

      {errorElement}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={todaySales}
          meta={todayOrdersMeta}
          tone="blue"
          icon={Banknote}
        />
        <StatCard
          label="Today's Profit"
          value={todayProfit}
          tone="green"
          icon={TrendingUp}
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStockCountText}
          tone={lowStockTone}
          icon={AlertTriangle}
        />
        <StatCard
          label="Inventory Value"
          value={stockValue}
          meta={activeProductsMeta}
          icon={Package}
        />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Low Stock</h2>
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

        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Recent Sales</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={function goOrders() {
                props.onNavigate("orders");
              }}
            >
              View All
            </Button>
          </div>
          {recentSalesList}
        </section>
      </div>
    </div>
  );
}
