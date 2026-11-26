import { useRef } from "react";
import { FilterPill } from "./FilterPill.jsx";

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

  let allChipElement = null;
  if (showAll) {
    let allCount = undefined;
    if (counts && counts.ALL !== undefined) {
      allCount = counts.ALL;
    }
    allChipElement = (
      <FilterPill
        label="All"
        active={selectedCategoryId === "ALL"}
        count={allCount}
        onClick={function selectAll() {
          handleChipClick("ALL");
        }}
        className="px-4 py-2"
      />
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

        if (categoryId.toUpperCase() === "ALL" || categoryName.toLowerCase() === "all") {
          return null;
        }

        let chipCount = undefined;
        if (counts && counts[categoryId] !== undefined) {
          chipCount = counts[categoryId];
        }

        return (
          <FilterPill
            key={categoryId}
            label={categoryName}
            active={selectedCategoryId === categoryId}
            count={chipCount}
            onClick={function selectChip() {
              handleChipClick(categoryId);
            }}
            className="px-4 py-2"
          />
        );
      })}
    </div>
  );
}
