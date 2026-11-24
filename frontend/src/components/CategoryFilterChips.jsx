import { useRef } from "react";

export function CategoryFilterChips(props) {
  const scrollRef = useRef(null);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const categories = props.categories || [];
  const selectedCategoryId = props.selectedCategoryId || "ALL";
  const onSelectCategory = props.onSelectCategory;
  const counts = props.counts || null;

  let showAll = true;
  if (props.showAll !== undefined) {
    showAll = props.showAll;
  }

  function handleMouseDown(event) {
    if (event.button !== 0 || !scrollRef.current) {
      return;
    }
    hasDraggedRef.current = false;
    dragStartXRef.current = event.clientX;
    dragScrollLeftRef.current = scrollRef.current.scrollLeft;

    function onMouseMove(moveEvent) {
      if (!scrollRef.current) {
        return;
      }
      const distance = moveEvent.clientX - dragStartXRef.current;
      if (Math.abs(distance) > 4) {
        hasDraggedRef.current = true;
      }
      scrollRef.current.scrollLeft = dragScrollLeftRef.current - distance;
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setTimeout(function resetDrag() {
        hasDraggedRef.current = false;
      }, 0);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function handleWheel(event) {
    if (event.deltaY !== 0 && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollLeft + event.deltaY;
    }
  }

  function handleChipClick(categoryId) {
    if (hasDraggedRef.current) {
      return;
    }
    if (typeof onSelectCategory === "function") {
      onSelectCategory(categoryId);
    }
  }

  let containerClass =
    "flex items-center gap-2 overflow-x-auto pb-1 mb-4 select-none scrollbar-none no-scrollbar cursor-grab active:cursor-grabbing";
  if (props.className) {
    containerClass = containerClass + " " + props.className;
  }

  const isAllSelected = selectedCategoryId === "ALL";
  let allChipClass =
    "shrink-0 rounded-full px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 ";
  if (isAllSelected) {
    allChipClass = allChipClass + "bg-[#151515] font-semibold text-white border border-[#151515] border-b-2 border-b-[#2B2B2B] shadow-xs active:translate-y-[1px] active:shadow-none";
  } else {
    allChipClass =
      allChipClass + "bg-white text-[#777777] border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] shadow-xs hover:bg-[#F9F9F8] hover:text-[#151515] active:translate-y-[1px] active:shadow-none";
  }

  let allCountBadge = null;
  if (counts && counts.ALL !== undefined) {
    let badgeClass = "px-2 py-0.5 rounded-full text-2xs font-mono ";
    if (isAllSelected) {
      badgeClass = badgeClass + "bg-[#B9F36B] text-[#151515] font-semibold";
    } else {
      badgeClass = badgeClass + "bg-[#EEEEED] text-[#777777]";
    }
    allCountBadge = <span className={badgeClass}>{counts.ALL}</span>;
  }

  let allChipElement = null;
  if (showAll) {
    allChipElement = (
      <button
        type="button"
        onClick={function selectAll() {
          handleChipClick("ALL");
        }}
        className={allChipClass}
      >
        <span>All</span>
        {allCountBadge}
      </button>
    );
  }

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      className={containerClass}
    >
      {allChipElement}
      {categories.map(function renderChip(categoryItem) {
        let categoryId = "";
        let categoryName = "";

        if (typeof categoryItem === "string") {
          categoryId = categoryItem;
          categoryName = categoryItem;
        } else if (categoryItem && typeof categoryItem === "object") {
          categoryId = categoryItem.category_id || "";
          categoryName = categoryItem.category_name || categoryId;
        }

        if (!categoryId) {
          return null;
        }

        // If the category item is "All", skip it since "All" chip is rendered above
        if (categoryId.toUpperCase() === "ALL" || categoryName.toLowerCase() === "all") {
          return null;
        }

        const isSelected = selectedCategoryId === categoryId;
        let chipClass =
          "shrink-0 rounded-full px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 ";
        if (isSelected) {
          chipClass = chipClass + "bg-[#151515] font-semibold text-white border border-[#151515] border-b-2 border-b-[#2B2B2B] shadow-xs active:translate-y-[1px] active:shadow-none";
        } else {
          chipClass =
            chipClass + "bg-white text-[#777777] border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] shadow-xs hover:bg-[#F9F9F8] hover:text-[#151515] active:translate-y-[1px] active:shadow-none";
        }

        let countBadge = null;
        if (counts && counts[categoryId] !== undefined) {
          let badgeClass = "px-2 py-0.5 rounded-full text-2xs font-mono ";
          if (isSelected) {
            badgeClass = badgeClass + "bg-[#B9F36B] text-[#151515] font-semibold";
          } else {
            badgeClass = badgeClass + "bg-[#EEEEED] text-[#777777]";
          }
          countBadge = <span className={badgeClass}>{counts[categoryId]}</span>;
        }

        return (
          <button
            key={categoryId}
            type="button"
            onClick={function selectChip() {
              handleChipClick(categoryId);
            }}
            className={chipClass}
          >
            <span>{categoryName}</span>
            {countBadge}
          </button>
        );
      })}
    </div>
  );
}
