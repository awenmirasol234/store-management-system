# Retail POS Dashboard — Tactical Design System

Tactical specifications for the StoreFlow POS interface, design tokens, responsive layout, and UI components.

---

## 1. Visual Foundation & Palette

The user interface uses a high-contrast, monochromatic palette with an intentional lime-green accent for transactional triggers:

- **Surface Base**: Clean white (`#FFFFFF`) cards against soft neutral background (`#F5F5F4`).
- **Sidebar & Dark Accents**: Near-black (`#171717`) navigation and stock badges.
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
| `--color-text-primary` | `#151515` | `text-[#151515]` | Headings, product titles, prices, totals |
| `--color-text-secondary`| `#777777` | `text-[#777777]` | Subtitles, base unit descriptions, category counts |
| `--color-border` | `#E9E9E9` | `border-[#E9E9E9]` | 1px hairline borders, card outlines, table dividers |

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

## 4. Component Implementation Specifications & Elevation Hierarchy

### 4.0 Five-Tier Elevation Architecture

StoreFlow implements a disciplined 5-tier elevation hierarchy designed for retail POS speed, clarity, and tactile responsiveness:

| Level | Role | Styling Tokens | Target Primitives |
| :--- | :--- | :--- | :--- |
| **L0** | Ground Plane | `bg-[#F5F5F4]` | Application viewport canvas |
| **L1** | Inset / Wells | `border border-[#E5E5E3] border-b-2 border-b-[#DCDCDA] shadow-2xs` | `Input.jsx`, `Select.jsx`, `SearchInput.jsx` |
| **L2** | Surface Cards | `bg-white border border-[#E5E5E3] border-b-2 border-b-[#DCDCDA] shadow-xs` | `StatCard.jsx`, POS Cards, Table wrappers |
| **L3** | Tactile Controls | `border-b-2`, `shadow-xs`, `active:translate-y-[1px] active:shadow-none` | `Button.jsx`, Tabs, Filter Pills, Nav Items |
| **L4** | Floating Windows | `shadow-2xl` / `shadow-lg`, `border-b-2 border-b-[#D0CFCB]` | `Modal.jsx`, `DebugOverlay.jsx`, Sticky Bars |

---

### 4.1 Buttons (`frontend/src/components/Button.jsx`)
- Tactile Raised Styling: Buttons feature softened elevation depth via a subtle bottom bevel (`border-b-2`), ambient micro-shadow (`shadow-xs`), and responsive click physics (`active:translate-y-[1px] active:shadow-none`).
- Border radius: `rounded-xl` (12px).
- Variants:
  - `primary`: `bg-[#B9F36B] text-[#151515] font-semibold border border-[#A2E84D] border-b-2 border-b-[#8FD838] shadow-xs hover:bg-[#A8E65A] hover:border-[#97DF43] hover:border-b-[#84CE30]`.
  - `secondary`: `bg-white text-[#151515] border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] shadow-xs hover:bg-[#F9F9F8] hover:border-[#DCDCDA] hover:border-b-[#CECECA]`.
  - `soft`: `bg-[#EEEEED] text-[#151515] border border-[#E2E1DF] border-b-2 border-b-[#D0CFCB] shadow-xs hover:bg-[#E6E6E5]`.
  - `danger`: `bg-rose-50 text-rose-700 border border-rose-200/80 border-b-2 border-b-rose-200 shadow-xs hover:bg-rose-100 hover:border-rose-200 hover:border-b-rose-300`.
  - `ghost`: `bg-transparent text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] border border-transparent` (retains clean borderless feel).
- Keypads & Standalone Buttons: Numerical keypads, product card add-to-cart buttons, and quick actions share identical softened tactile depth tokens (`border-b-2 border-b-[#D6D6D3] shadow-xs active:translate-y-[1px] active:shadow-none`).

### 4.2 Surface Cards & Product Tiles (`frontend/src/pages/PosPage.jsx`, `frontend/src/components/StatCard.jsx`)
- Stat Cards: `rounded-2xl border border-[#E5E5E3] border-b-2 border-b-[#DCDCDA] bg-white p-4 sm:p-5 shadow-xs`. Icon container: `rounded-xl bg-[#EEEEED] border border-[#E2E1DF] border-b-2 border-b-[#D0CFCB] text-[#151515] shadow-2xs`.
- POS Product Cards: `rounded-2xl border border-[#E5E5E3] border-b-2 border-b-[#DCDCDA] bg-white p-3.5 shadow-xs hover:border-[#CCCCCC] hover:border-b-[#BEBEBC] hover:shadow-sm transition-all duration-150`.
- Data Table Wrappers: `overflow-hidden rounded-2xl border border-[#E5E5E3] border-b-2 border-b-[#DCDCDA] bg-white shadow-xs`.

### 4.3 Form Inputs, Selects, & Search Controls (`frontend/src/components/Input.jsx`, `Select.jsx`, `SearchInput.jsx`)
- Text & Number Inputs: `rounded-xl border border-[#E5E5E3] border-b-2 border-b-[#DCDCDA] bg-white px-3.5 py-2.5 text-sm text-[#151515] shadow-2xs focus:border-[#151515] focus:border-b-[#151515] focus:ring-2 focus:ring-[#B9F36B]/30`.
- Dropdown Selects: `rounded-xl border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] bg-white text-[#151515] shadow-xs focus:border-[#151515] focus:ring-2 focus:ring-[#B9F36B]/30`.
- Search Input: `rounded-xl border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] bg-white shadow-xs focus:border-[#151515] focus:ring-2 focus:ring-[#B9F36B]/30`. Shortcut badge: `rounded-lg border border-[#E2E1DF] bg-[#EEEEED] px-2 py-0.5 shadow-2xs`.

### 4.4 Category & Status Filter Pills, Tabs, & Presets (`frontend/src/components/CategoryFilterChips.jsx`, `FilterPill.jsx`, `ReportsPage.jsx`)
- Filter Pills & Chips:
  - Active: `bg-[#151515] font-semibold text-white border border-[#151515] border-b-2 border-b-[#2B2B2B] shadow-xs active:translate-y-[1px] active:shadow-none`.
  - Inactive: `bg-white text-[#777777] border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] shadow-xs hover:bg-[#F9F9F8] hover:text-[#151515] active:translate-y-[1px] active:shadow-none`.
- Report Tabs:
  - Active: `bg-[#151515] text-white border border-[#151515] border-b-2 border-b-[#2B2B2B] shadow-xs active:translate-y-[1px] active:shadow-none`.
  - Inactive: `text-[#777777] hover:text-[#151515] hover:bg-[#EEEEED] transition-colors`.

### 4.5 Navigation Items & App Shell (`frontend/src/components/Sidebar.jsx`, `BottomNav.jsx`)
- Sidebar Active Item: `bg-[#B9F36B] text-[#151515] font-semibold border border-[#A2E84D] border-b-2 border-b-[#8FD838] shadow-xs active:translate-y-[1px] active:shadow-none`.
- Sidebar Brand Mark: `bg-[#B9F36B] text-[#151515] border border-[#A2E84D] border-b-2 border-b-[#8FD838] shadow-xs`.
- Mobile BottomNav Bar: `bg-[#171717]/95 backdrop-blur border-t border-[#262626] shadow-[0_-4px_16px_rgba(0,0,0,0.3)]`.

### 4.6 Modals & Floating Elements (`frontend/src/components/Modal.jsx`, `ErrorBanner.jsx`, `DebugOverlay.jsx`)
- Modal Dialog Window: `w-full rounded-2xl bg-white shadow-2xl border border-[#E5E5E3] border-b-2 border-b-[#D0CFCB] max-h-[92vh] flex flex-col`.
- Modal Close Button: `flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E5E3] border-b-2 border-b-[#D6D6D3] bg-white text-[#777777] hover:bg-[#F9F9F8] shadow-xs active:translate-y-[1px] active:shadow-none`.
- Error Banner: `rounded-xl border border-rose-200 border-b-2 border-b-rose-300/80 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 shadow-xs`.
- Debug Overlay: `bg-[#171717]/95 text-white rounded-2xl border border-[#333333] border-b-2 border-b-black shadow-2xl backdrop-blur`.

### 4.7 Status Badges (`frontend/src/components/Badge.jsx`)
- `neutral`: `bg-[#EEEEED] text-[#777777] border border-[#E9E9E9]`.
- `dark`: `bg-[#171717] text-white`.
- `green`: `bg-[#B9F36B] text-[#151515]`.
- `amber`: `bg-amber-50 text-amber-700 border border-amber-200`.
- `red`: `bg-rose-50 text-rose-700 border border-rose-200`.

### 4.8 Standard Spacing Rhythm
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
