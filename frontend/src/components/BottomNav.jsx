import { getFilteredNavItems } from "../navigation.js";

export function BottomNav(props) {
  let userRole = null;
  if (props && props.currentUser) {
    userRole = props.currentUser.role;
  }
  const items = getFilteredNavItems(userRole);
  let gridClass = "grid h-full w-full ";
  if (items.length === 4) {
    gridClass = gridClass + "grid-cols-4";
  } else if (items.length === 5) {
    gridClass = gridClass + "grid-cols-5";
  } else if (items.length === 6) {
    gridClass = gridClass + "grid-cols-6";
  } else if (items.length === 7) {
    gridClass = gridClass + "grid-cols-7";
  } else {
    gridClass = gridClass + "grid-flow-col auto-cols-fr";
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-[#262626] bg-[#171717]/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.3)] select-none md:hidden"
    >
      <div className={gridClass}>
        {items.map(function renderBottomItem(item) {
          const IconComponent = item.icon;
          const isActive = props.activePage === item.key;

          let ariaCurrent = undefined;
          let buttonClass =
            "flex min-w-0 flex-col items-center justify-center gap-1 py-1 font-medium transition-all duration-100 cursor-pointer active:translate-y-[0.5px] ";
          if (isActive) {
            ariaCurrent = "page";
            buttonClass = buttonClass + "text-white font-semibold";
          } else {
            buttonClass = buttonClass + "text-[#A3A3A3] hover:text-white";
          }

          let iconClass = "h-5 w-5 shrink-0 ";
          if (isActive) {
            iconClass = iconClass + "text-[#B9F36B] drop-shadow-[0_1px_4px_rgba(185,243,107,0.35)]";
          } else {
            iconClass = iconClass + "text-[#A3A3A3]";
          }

          return (
            <button
              key={item.key}
              type="button"
              aria-current={ariaCurrent}
              onClick={function selectPage() {
                props.onNavigate(item.key);
              }}
              className={buttonClass}
            >
              <IconComponent className={iconClass} />
              <span className="max-w-full truncate px-0.5 text-3xs sm:text-tiny">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
