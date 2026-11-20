import { ShoppingBag, Receipt, Package, Store } from "lucide-react";

const NAV_ITEMS = [
  { key: "sales", label: "Sales", icon: ShoppingBag },
  { key: "orders", label: "Orders", icon: Receipt },
  { key: "products", label: "Products", icon: Package }
];

export function Sidebar(props) {
  return (
    <aside className="flex w-52 shrink-0 flex-col bg-[#181B2C] text-slate-300 select-none">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-tight">StoreFlow</div>
          <div className="text-xs text-slate-400">POS</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(function renderNavItem(item) {
          const IconComponent = item.icon;
          const isActive = props.activePage === item.key;
          let itemClass =
            "flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ";
          if (isActive) {
            itemClass = itemClass + "bg-blue-600 text-white";
          } else {
            itemClass = itemClass + "text-slate-300 hover:bg-white/5 hover:text-white";
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={function selectPage() {
                props.onNavigate(item.key);
              }}
              className={itemClass}
            >
              <IconComponent className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-300">
            OW
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">Store Owner</div>
            <div className="text-[11px] text-slate-400">Cashier</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
