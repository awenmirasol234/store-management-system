# Retail POS Dashboard — Tactical Design System

Tactical specifications for the StoreFlow POS interface, design tokens, responsive layout, and UI components.

---

## 1. Visual Foundation & Palette

The user interface uses a high-contrast, monochromatic palette with an intentional lime-green accent for transactional triggers:

- **Surface Base**: Clean white (`#FFFFFF`) cards against soft neutral background (`#F5F5F4`).
- **Dark Neutral (Unified Black - `#171717`)**: Single near-black (`#171717`, Tailwind `neutral-900`) used uniformly across all UI components, desktop sidebar, mobile navigation, primary typography, buttons, active filter pills, modal backdrops (`bg-[#171717]/40`), and indicator badges. No other black or near-black shades (such as `#151515`) are permitted in the application UI.
- **Physical Thermal Print Pure Black (`#000000`)**: Pure black is exclusively preserved for hardware thermal receipt printing (`@media print` on `#thermal-receipt`) to guarantee maximum heat transfer, contrast, and barcode legibility on 58mm/80mm thermal paper.
- **Transactional Accent**: Vibrant lime green (`#B9F36B`, hover `#A8E65A`) reserved for primary buttons, active navigation, and conversion checkpoints.
- **Hairline Dividers**: Crisp borders (`#E9E9E9`).
- **Typography**: Inter with tabular numbers (`tabular-nums`) for currency and decimal alignment.

---

## 2. Design Tokens & Tailwind Utility Mapping

Design tokens are declared in `frontend/src/index.css` inside the `@theme` block:

| Token Name | Hex / Value | Tailwind Utility Class | Intended Usage |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#B9F36B` | `bg-[#B9F36B]`, `text-[#B9F36B]` | Primary checkout button, active nav badge, positive indicators |
| `--color-primary-hover`| `#A8E65A` | `hover:bg-[#A8E65A]` | Primary button hover state |
| `--color-background` | `#F5F5F4` | `bg-[#F5F5F4]` | Application viewport background |
| `--color-surface` | `#FFFFFF` | `bg-white` | Cards, modals, cart panel, input fields |
| `--color-surface-secondary`| `#EEEEED` | `bg-[#EEEEED]` | Image placeholders, neutral icon containers |
| `--color-sidebar` | `#171717` | `bg-[#171717]` | Persistent desktop sidebar, mobile bottom navigation |
| `--color-text-primary` | `#171717` | `text-[#171717]` | Headings, product titles, prices, totals |
| `--color-text-secondary`| `#777777` | `text-[#777777]` | Subtitles, base unit descriptions, category counts |
| `--color-border` | `#E9E9E9` | `border-[#E9E9E9]` | 1px hairline borders, card outlines, table dividers |
| `--color-on-primary` | `#171717` | `text-[#171717]` | Text and icons placed on top of primary lime-green elements |
| *Hardware Print* | `#000000` | `@media print` | Preserved exclusively for physical thermal receipt printers |

---

## 3. Structural Layout System (3-Region Desktop Cockpit)

`frontend/src/pages/PosPage.jsx` follows a locked 3-region cockpit layout:

```
+--------------------------------------------------------------------------------------------------+
| STOREFLOW POS COCKPIT LAYOUT                                                                     |
+--------------+-------------------------------------------------------------+---------------------+
| SIDEBAR      | MAIN PRODUCT WORKSPACE (~65%)                               | TRANSACTION PANEL   |
| (#171717)    | +---------------------------------------------------------+ | (~32%)              |
|              | | Search & Quick Actions [ Search / Barcode ] [Shift] [Bell]| | Current Sale        |
| [Logo]       | +---------------------------------------------------------+ |                     |
| [*] POS      | | Category Filter Pills: [All] [Beverages] [Snacks]       | | Item 1      ₱45.00  |
| [ ] Stock    | +---------------------------------------------------------+ | [-] 2 [+]           |
| [ ] Utang    | | PRODUCT GRID (4 columns desktop, 2 columns mobile)      | |                     |
| [ ] Reports  | | +---------------+ +---------------+ +---------------+   | | Subtotal    ₱45.00  |
|              | | | [Stock: 12]   | | | [Stock: 4]    | | | [Stock: 25]   |   | | Discount     ₱0.00  |
| (Footer)     | | | Product Name  | | | Product Name  | | | Product Name  |   | | Total       ₱45.00  |
| Drawer/Staff | | | ₱35.00        | | | ₱85.00        | | | ₱15.00        |   |                     |
|              | | +---------------+ +---------------+ +---------------+   | | [ CHECKOUT ₱45 ]  |
+--------------+-------------------------------------------------------------+---------------------+
```

### Proportions & Sizing

1. **Persistent Left Sidebar (`#171717`)**:
   - Desktop (`>= 1024px`): `w-20` (80px) collapsed, `w-60` (240px) expanded.
   - Mobile (`< 768px`): Hidden; replaced by fixed `BottomNav` (`h-16`).
2. **Central Product Workspace**:
   - Takes remaining horizontal space (`flex-1`).
   - Pinned search bar and category filter row; product grid scrolls independently (`overflow-y-auto`).
3. **Right Transaction Panel**:
   - Desktop: Dedicated locked column `w-80 xl:w-96` (`border-l border-[#E9E9E9]`).
   - Collapsible to an icon rail (`w-16`) on smaller viewports.
   - Pinned header, independent cart item scroll, and pinned bottom checkout CTA.

---

## 4. Component Implementation Specifications

### 4.1 Buttons (`frontend/src/components/Button.jsx`)
- Border radius: `rounded-xl` (14px).
- Variants:
  - `primary`: `bg-[#B9F36B] hover:bg-[#A8E65A] text-[#171717] font-semibold shadow-xs`.
  - `secondary`: `bg-white hover:bg-[#EEEEED] text-[#171717] border border-[#E9E9E9]`.
  - `ghost`: `bg-transparent hover:bg-[#EEEEED] text-[#777777] hover:text-[#171717]`.
  - `danger`: `bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200`.

### 4.2 Product Cards (`frontend/src/pages/PosPage.jsx`)
- Container: `rounded-2xl border border-[#E9E9E9] bg-white p-3.5 hover:border-[#171717]/30 hover:shadow-xs`.
- Media container: `aspect-square rounded-xl bg-[#EEEEED] relative flex items-center justify-center`.
- Stock Badge: `absolute left-2 top-2 rounded-md bg-[#171717] px-2 py-0.5 font-mono text-2xs text-white`.
- Action: Full-width button `py-2 rounded-xl border border-[#E9E9E9] text-xs font-semibold`.

### 4.3 Category & Status Filter Pills (`frontend/src/components/CategoryFilterChips.jsx`, `frontend/src/components/FilterPill.jsx`)
- Pill Shape: `rounded-full` with `aria-pressed` state on toggle pills.
- Selected: `bg-[#171717] text-white` (`px-4 py-2` for category chips, `px-3.5 py-1.5` for status/method pills).
- Inactive: `bg-white text-[#777777] border border-[#E9E9E9] hover:bg-[#EEEEED] hover:text-[#171717]`.
- Pill Count Badge: `bg-[#B9F36B] text-[#171717]` when active; `bg-[#EEEEED] text-[#777777]` when inactive.

### 4.4 Modals (`frontend/src/components/Modal.jsx`)
- Backdrop: `fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-[2px] p-3 sm:p-6` (supports Escape key and backdrop click-to-close).
- Card Container: `w-full rounded-2xl bg-white shadow-xl border border-[#E9E9E9] max-h-[92vh] flex flex-col` (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`).
- **Padding Rule**: `Modal.jsx` owns all content padding (`p-4 sm:p-6`). Modal children must never introduce conflicting outer padding.
- Sizes: `sm` (`max-w-sm`), `md` (`max-w-md`), `lg` (`max-w-lg`, default), `xl` (`max-w-2xl` for checkout cockpit).

### 4.5 Status Badges (`frontend/src/components/Badge.jsx`)
- `neutral`: `bg-[#EEEEED] text-[#777777] border border-[#E9E9E9]`.
- `dark`: `bg-[#171717] text-white`.
- `green`: `bg-[#B9F36B] text-[#171717]`.
- `amber`: `bg-amber-50 text-amber-700 border border-amber-200`.
- `red`: `bg-rose-50 text-rose-700 border border-rose-200`.

### 4.6 Standard Spacing Rhythm
All application pages share a uniform spacing scale:
- **Outer Page Padding**: `p-4 sm:p-6 lg:p-7` (`PageLayout` and `PosPage` catalog workspace).
- **Page Header Margin**: `mb-3 sm:mb-4` (`PageHeader`).
- **Page Banners / Toolbars / Tab Bars**: `mb-4 sm:mb-5`.
- **Stat Card Grids**: `gap-3 sm:gap-4`.
- **Multi-Column Section Grids**: `gap-4 sm:gap-5`.
- **Card Padding**: `p-4 sm:p-5`.
- **Data Table Cells**: Headers `px-5 py-3`, body cells `px-5 py-3.5`, table section headers `px-5 py-3.5`.

---

## 5. Coding Agent Guardrails

1. **Zero Object Spread**: Use `Object.assign({}, ...)` or explicit property assignment.
2. **Zero Ternary Statements**: Write explicit `if` / `else` blocks for program control flow.
3. **No External Charting or UI Frameworks**: Maintain pure React + SVG/Tailwind components.
4. **Preserve Business Logic**: Never alter financial formulas or backend endpoints during UI styling.
5. **Unified Black Palette**: Always use `#171717` for all dark UI styling (text, borders, backdrops, active pills, badges, navigation). Never introduce `#151515` or `#000000` in UI components; `#000000` is strictly restricted to physical thermal printer styling under `@media print`.
