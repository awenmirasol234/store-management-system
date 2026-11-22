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
  } else {
    gridClass = gridClass + "grid-cols-6";
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-[#262626] bg-[#171717] select-none md:hidden">
      <div className={gridClass}>
        {items.map(function renderBottomItem(item) {
          const IconComponent = item.icon;
          const isActive = props.activePage === item.key;

          let buttonClass =
            "flex flex-col items-center justify-center gap-1 py-1 text-tiny font-medium transition-colors cursor-pointer ";
          if (isActive) {
            buttonClass = buttonClass + "text-white font-semibold";
          } else {
            buttonClass = buttonClass + "text-[#A3A3A3] hover:text-white";
          }

          let iconClass = "h-5 w-5 ";
          if (isActive) {
            iconClass = iconClass + "text-[#B9F36B]";
          } else {
            iconClass = iconClass + "text-[#A3A3A3]";
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
