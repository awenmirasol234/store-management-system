# Retail POS Dashboard — Tactical Design System

Tactical specifications for the Duane Store POS interface, design tokens, responsive layout, and UI components.

Use this document when changing frontend styling, shared UI components, or POS layout. Preserve the documented accessibility and responsive behavior alongside the visual specifications.

---

## 1. Visual Foundation & Palette

The user interface uses a high-contrast, monochromatic palette with an intentional lime-green accent for transactional triggers:

- **Surface Base**: Clean white (`#FFFFFF`) cards against soft neutral background (`#F5F5F4`).
- **Dark Neutral (Unified Black - `#171717`)**: Primary near-black (`#171717`, Tailwind `neutral-900`) used across the desktop sidebar, mobile navigation, primary typography, buttons, active filter pills, modal backdrops (`bg-[#171717]/40`), and indicator badges. Supporting dark shades are allowed for the development debug overlay and subtle borders or hover states.
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
| `--color-danger-50` | `#FFF1F2` | `bg-rose-50` | Soft danger background, error banners, hover triggers |
| `--color-danger-200` | `#FECDD3` | `border-rose-200` | Soft danger hairline borders |
| `--color-danger-600` | `#E11D48` | `bg-rose-600`, `text-rose-600` | Critical solid badges (out-of-stock, bell dot), overdue balances |
| `--color-danger-700` | `#BE123C` | `text-rose-700` | Error banner typography, high-contrast danger text |
| *Hardware Print* | `#000000` | `@media print` | Preserved exclusively for physical thermal receipt printers |

Centralized danger and alert color tokens are declared in `frontend/src/index.css` inside the `@theme` block alongside the application color palette.

---

## 3. Structural Layout System (3-Region Desktop Cockpit)

`frontend/src/pages/PosPage.jsx` follows a locked 3-region cockpit layout:

```
+--------------------------------------------------------------------------------------------------+
| DUANE STORE POS COCKPIT LAYOUT                                                                     |
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
- Border radius: `rounded-xl` using the Tailwind default radius.
- Subtle 3D Glossy Effect: All buttons feature gentle gradient lighting, subtle inner specular highlights (`inset 0 1px 0`), a slight bottom bevel (`inset 0 -1px 0`), soft ambient drop shadows (`0 1px 2px`, `0 2px 4px`), and a tactile micro-press on active click (`active:translate-y-[0.5px]`, slight scale, depressed inner shadow).
- Variants:
  - `primary`: `.btn-glossy-primary` with `bg-[#B9F36B] hover:bg-[#A8E65A] text-[#171717] font-semibold`.
  - `secondary`: `.btn-glossy-secondary` with `bg-white hover:bg-[#EEEEED] text-[#171717] border border-[#E9E9E9]`.
  - `soft`: `.btn-glossy-soft` with `bg-[#EEEEED] hover:bg-[#E2E2E1] text-[#171717]`.
  - `danger`: `.btn-glossy-danger` with `bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200`.
  - `danger-solid`: `bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-xs` for solid red destructive actions (e.g. Clear Cart confirmation).
  - `ghost`: `.btn-glossy-ghost` with `bg-transparent hover:bg-[#EEEEED] text-[#777777] hover:text-[#171717]`.

### 4.2 Product Cards & Cart Thumbnails (`frontend/src/pages/PosPage.jsx`)
- Container: `rounded-2xl border border-[#E9E9E9] bg-white p-2 sm:p-2.5 transition-[border-color,box-shadow] hover:border-[#171717]/30 hover:shadow-xs`.
- Media container: `relative h-30 w-full overflow-hidden bg-white border-b border-[#E9E9E9]` (fixed 120px height).
- Stock Badge: `absolute left-2 top-2 rounded-md bg-[#171717]/85 backdrop-blur-xs px-1.5 py-0.5 font-mono text-3xs sm:text-2xs font-medium text-white shadow-xs`.
- Action: Full-width button `py-1 rounded-lg border border-[#E9E9E9] text-xs font-semibold`.
- Cart Thumbnails: `h-14 w-14 shrink-0 rounded-xl bg-white` with `object-cover` image or centered initials fallback (container outline removed).
- **Dynamic Grid Columns & Compact Fixed Card Width**:
  - Tablet & Desktop ($\ge$ 768px): compact fixed card width of **150px** with 12px gap, capping at 8 columns.
  - Mobile (< 768px): preserves standard 2-column layout (`gap-2.5`, 10px gap).
  - Columns are calculated from actual available container width using `calculatePosGridColumns`, dropping column count when the Sidebar Navigation or Current Sale Panel opens rather than compressing cards below minimum width.
  - Instantaneous column reflow: grid columns update immediately upon container resize without layout transitions or position transforms.

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
- **Animations**:
  - **Entrance**: Smooth scale-up from 95% to 100% (`scale(0.95)` to `scale(1)`) and fade-in (`opacity 0` to `1`) with subtle backdrop fade over 200ms ease-out (`cubic-bezier(0, 0, 0.2, 1)`).
  - **Exit**: Smooth scale-down (`scale(1)` to `scale(0.95)`) and fade-out with backdrop fade over 150ms ease-out before unmounting.
  - **Interaction & Centering**: Keeps modal centered with `transform-origin: center`; all inputs and actions remain immediately responsive without delay.
  - **Accessibility**: Automatically falls back to instant transitions when `prefers-reduced-motion: reduce` is detected.

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
