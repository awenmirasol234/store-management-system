import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  ShoppingCart,
  TrendingUp,
  Layers
} from "lucide-react";
import { api } from "../api.js";
import { formatPeso, formatQuantity, formatQuantityWithUnit, formatUnit } from "../format.js";
import { Badge } from "../components/Badge.jsx";
import { Button } from "../components/Button.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { ProductThumb } from "../components/ProductThumb.jsx";
import { StatCard } from "../components/StatCard.jsx";

export function DashboardPage(props) {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [errorBanner, setErrorBanner] = useState("");

  const isOwner = Boolean(!props.currentUser || props.currentUser.role === "OWNER");

  async function loadDashboard() {
    setErrorBanner("");
    try {
      const isCashier = props && props.currentUser && props.currentUser.role === "CASHIER";
      if (isCashier) {
        const results = await Promise.all([
          api.listLowStockProducts(),
          api.getTopProducts(null, null, 5)
        ]);
        setLowStock(results[0]);
        setTopProducts(results[1]);
      } else {
        const results = await Promise.all([
          api.getReportsSummary(),
          api.listLowStockProducts(),
          api.getTopProducts(null, null, 5)
        ]);
        setSummary(results[0]);
        setLowStock(results[1]);
        setTopProducts(results[2]);
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
  let transactionCount = "0";
  let itemsSoldCount = "0";
  let grossProfit = "₱0.00";

  if (summary) {
    todaySales = formatPeso(summary.gross_sales);
    transactionCount = String(summary.sale_count);
    itemsSoldCount = formatQuantity(summary.total_items_sold || 0);
    grossProfit = formatPeso(summary.net_profit);
  }

  let lowStockList = <EmptyState message="All stock levels are healthy." padding="md" />;
  if (lowStock.length > 0) {
    lowStockList = (
      <div className="divide-y divide-[#E9E9E9]">
        {lowStock.slice(0, 6).map(function renderLowItem(product) {
          const isOut = Number(product.current_stock) <= 0;
          return (
            <div key={product.product_id} className="flex items-center justify-between py-3">
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-medium text-[#151515]">
                  {product.product_name}
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#777777]">
                  Reorder at {formatQuantityWithUnit(product.reorder_level, product.base_unit)}
                </div>
              </div>
              <Badge tone={isOut ? "red" : "amber"} className="font-mono shrink-0">
                {isOut ? "OUT OF STOCK" : formatQuantityWithUnit(product.current_stock, product.base_unit)}
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
                  <div className="truncate text-sm font-medium text-[#151515]">
                    {item.product_name}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-[#777777]">
                    {formatQuantity(item.quantity_sold)} {formatUnit(item.base_unit, item.quantity_sold)} sold
                  </div>
                </div>
              </div>
              <div className="font-mono text-sm font-semibold text-[#151515] shrink-0">
                {formatPeso(item.revenue)}
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

      {/* 1. Summary Cards */}
      <div className="mb-4 sm:mb-5 grid grid-cols-1 gap-3 sm:gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={todaySales}
          meta={transactionCount + " transactions today"}
          icon={Banknote}
        />
        <StatCard
          label="Transactions"
          value={transactionCount}
          meta="Completed checkouts"
          icon={ShoppingCart}
        />
        <StatCard
          label="Items Sold"
          value={itemsSoldCount}
          meta="Units moved today"
          icon={Layers}
        />
        {isOwner ? (
          <StatCard
            label="Today's Profit"
            value={grossProfit}
            meta="Gross profit today"
            icon={TrendingUp}
          />
        ) : (
          <StatCard
            label="Inventory Alerts"
            value={String(lowStock.length)}
            meta="Items needing reorder"
            icon={AlertTriangle}
          />
        )}
      </div>

      {/* 2. Operational Sections: Top Selling, Inventory Alerts */}
      <div className="grid grid-cols-1 gap-3.5 sm:gap-4 lg:grid-cols-2">
        {/* Top-Selling Products */}
        <section className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#151515]">Top Selling Products</h2>
            <span className="font-mono text-xs text-[#777777]">Top 5</span>
          </div>
          {topProductsList}
        </section>

        {/* Inventory Alerts */}
        <section className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#151515]">Inventory Alerts</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={function goInventory() {
                props.onNavigate("inventory");
              }}
            >
              Restock
            </Button>
          </div>
          {lowStockList}
        </section>
      </div>
    </PageLayout>
  );
}
