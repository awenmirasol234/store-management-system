import { NAV_ITEMS } from "../navigation.js";

export function BottomNav(props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-white/10 bg-[#181B2C] select-none md:hidden">
      <div className="grid h-full w-full grid-cols-5">
        {NAV_ITEMS.map(function renderBottomItem(item) {
          const IconComponent = item.icon;
          const isActive = props.activePage === item.key;

          let buttonClass =
            "flex flex-col items-center justify-center gap-1 py-1 text-tiny font-medium transition-colors cursor-pointer ";
          if (isActive) {
            buttonClass = buttonClass + "text-white font-semibold";
          } else {
            buttonClass = buttonClass + "text-slate-400 hover:text-slate-200";
          }

          let iconClass = "h-5 w-5 ";
          if (isActive) {
            iconClass = iconClass + "text-blue-400";
          } else {
            iconClass = iconClass + "text-slate-400";
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={function selectPage() {
                props.onNavigate(item.key);
              }}
              className={buttonClass}
            >
              <IconComponent className={iconClass} />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
