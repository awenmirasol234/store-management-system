# Retail POS Dashboard — Tactical Design System & Implementation Blueprint

> **Status:** Active Reference & Implementation Guide
>
> **Target Platform:** StoreFlow POS (React 19, Tailwind CSS v4, Node.js SQLite Backend)
>
> **Source Specification:** Retail POS Dashboard Design System (`c:\Users\awen\Downloads\retail-pos-design-system.md`)
>
> **Mandatory Agent Rules:** [AGENTS.md](../AGENTS.md) & [.agents/skills/ponytail/SKILL.md](../.agents/skills/ponytail/SKILL.md) (`full` mode: 0 ternary operators, 0 object spread syntax)

---

## 1. Visual Source of Truth & Core Philosophy

The StoreFlow POS interface is transformed into a modern, minimalist, professional SaaS point-of-sale cockpit. The design centers on:
1. **Monochromatic Foundation:** High-contrast, clean white surfaces (`#FFFFFF`) against a warm light neutral background (`#F5F5F4`), subtle secondary surfaces (`#EEEEED`) for media containers, and ultra-crisp hairline dividers (`#E9E9E9`).
2. **Near-Black Anchor:** A dedicated dark sidebar navigation (`#171717`) and high-emphasis stock badges (`#171717`) that anchor the eye and prevent visual wash-out.
3. **Intentional Lime-Green Accent:** A vivid, energetic lime green (`#B9F36B` / `#A8E65A` hover) reserved strictly for primary transactional triggers, active navigation items, positive indicators, and conversion touchpoints.
4. **No Visual Bloat:** Zero heavy drop shadows, zero decorative gradients, zero multi-color badges, zero arbitrary paddings, and zero cluttered text descriptions.

```
+--------------------------------------------------------------------------------------------------+
| STOREFLOW POS COCKPIT LAYOUT                                                                     |
+--------------+-------------------------------------------------------------+---------------------+
| PERSISTENT   | MAIN PRODUCT WORKSPACE (~65%)                               | TRANSACTION PANEL   |
| SIDEBAR      |                                                             | (~32%)              |
| (#171717)    | +---------------------------------------------------------+ |                     |
|              | | Search & Quick Bar [ Search Bar / Barcode ] [Shift] [Bell]| | Current Sale (3)    |
| [StoreFlow]  | +---------------------------------------------------------+ |                     |
|              | | Category Pills: [All (24)] [Beverages] [Snacks] [Canned] | | +-----------------+ |
| [*] POS      | +---------------------------------------------------------+ | | Item 1    P45.00  | |
|     (Lime)   | | PRODUCT GRID (4 columns desktop)                        | | | [-] 2 [+]       | |
| [ ] Stock    | | +---------------+ +---------------+ +---------------+   | | +-----------------+ |
| [ ] Utang    | | | [Stock: 12]   | | | [Stock: 4]    | | | [Stock: 25]   |   | | Item 2    P120.00 | |
| [ ] History  | | | (Image Area)  | | | (Image Area)  | | | (Image Area)  |   | | [-] 1 [+]       | |
| [ ] Reports  | | | Product Name  | | | Product Name  | | | Product Name  |   | +-----------------+ |
|              | | | P35.00        | | | P85.00        | | | P15.00        |   | Subtotal    P165.00 | |
| (Footer)     | | | [Add to Cart] | | | [Add to Cart] | | | [Add to Cart] |   | Discount      P0.00 | |
| Cash Drawer  | | +---------------+ +---------------+ +---------------+   | | Total       P165.00 | |
| User Profile | +---------------------------------------------------------+ |                     |
|              | | Bottom Bar: [Scan Barcode] [Order Discount] [Clear Sale]  | | [ CHECKOUT P165 ] | |
+--------------+-------------------------------------------------------------+---------------------+
```

---

## 2. Design Tokens & Tailwind CSS v4 Configuration

StoreFlow uses Tailwind CSS v4. Design tokens are defined directly in `frontend/src/index.css` inside the `@theme` block.

### 2.1 Complete Theme Token Dictionary

Add the following tokens to `frontend/src/index.css`:

```css
@theme {
  /* Colors */
  --color-primary: #B9F36B;
  --color-primary-hover: #A8E65A;
  --color-background: #F5F5F4;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #EEEEED;
  --color-sidebar: #171717;
  --color-text-primary: #151515;
  --color-text-secondary: #777777;
  --color-border: #E9E9E9;
  --color-on-primary: #151515;
  --color-on-sidebar: #FFFFFF;
  --color-sidebar-muted: #A3A3A3;

  /* Typography Scales */
  --font-sans: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Inter", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --text-2xs: 0.6875rem;     /* 11px - metadata, stock badges */
  --text-2xs--line-height: 1rem;

  --text-tiny: 0.75rem;      /* 12px - body, secondary labels */
  --text-tiny--line-height: 1.125rem;

  --text-xs: 0.8125rem;      /* 13px - product names, nav labels */
  --text-xs--line-height: 1.125rem;

  --text-sm: 0.875rem;       /* 14px - product prices, button labels */
  --text-sm--line-height: 1.25rem;

  --text-base: 1rem;         /* 16px - section titles, totals */
  --text-base--line-height: 1.5rem;

  --text-lg: 1.25rem;        /* 20px - modal titles */
  --text-lg--line-height: 1.75rem;

  --text-xl: 1.375rem;       /* 22px - page titles */
  --text-xl--line-height: 1.875rem;

  --text-2xl: 1.625rem;      /* 26px - stat highlights */
  --text-2xl--line-height: 2.125rem;

  /* Shape & Radii */
  --radius-card: 16px;
  --radius-panel: 16px;
  --radius-input: 14px;
  --radius-image: 12px;
  --radius-control: 12px;
  --radius-pill: 9999px;
}
```

### 2.2 Token-to-Class Mapping Quick Reference

| Token Name | Hex / Value | Tailwind Utility Class | Intended Use |
|---|---|---|---|
| `color-primary` | `#B9F36B` | `bg-[#B9F36B]` / `text-[#B9F36B]` | Primary checkout button, active nav badge, positive highlights |
| `color-primary-hover` | `#A8E65A` | `hover:bg-[#A8E65A]` | Primary button hover state |
| `color-background` | `#F5F5F4` | `bg-[#F5F5F4]` | Workspace and application viewport background |
| `color-surface` | `#FFFFFF` | `bg-white` | Product cards, cart panel, dialog modals, inputs |
| `color-surface-secondary` | `#EEEEED` | `bg-[#EEEEED]` | Product thumbnail backgrounds, subtle icon containers |
| `color-sidebar` | `#171717` | `bg-[#171717]` | Main desktop sidebar & mobile bottom navigation bar |
| `color-text-primary` | `#151515` | `text-[#151515]` | High-emphasis headings, product titles, prices, totals |
| `color-text-secondary` | `#777777` | `text-[#777777]` | Subtitles, base unit descriptions, category pill counts |
| `color-border` | `#E9E9E9` | `border-[#E9E9E9]` | 1px hairline card outlines, dividers, input borders |
| `color-on-primary` | `#151515` | `text-[#151515]` | High-contrast dark text and icons on lime-green buttons |
| `color-on-sidebar` | `#FFFFFF` | `text-white` | Active item labels and icons in dark sidebar |
| `color-sidebar-muted` | `#A3A3A3` | `text-[#A3A3A3]` | Inactive sidebar navigation icons and labels |

---

## 3. Structural Layout System (3-Region Desktop Cockpit)

The POS screen (`frontend/src/pages/PosPage.jsx`) uses a rigid 3-region locked desktop cockpit.

### 3.1 Proportions and Sizing
1. **Region 1: Persistent Left Navigation Sidebar**
   - Width: `w-20` (80px) collapsed, `w-60` (240px) expanded.
   - Background: `bg-[#171717]`.
   - Scroll: Non-scrolling shell with fixed header and user footer.
2. **Region 2: Central Product Workspace**
   - Width: Flexible, approx. 62%–68% of available desktop width (`flex-1`).
   - Padding: `p-4 sm:p-5 lg:p-6`.
   - Scroll: Top search and category filters remain pinned; the 4-column product grid scrolls independently (`overflow-y-auto`).
3. **Region 3: Right Transaction Panel**
   - Width: Dedicated locked column `w-80 xl:w-96` (~30% of content width).
   - Background: `bg-white border-l border-[#E9E9E9]`.
   - Scroll: Pinned panel header, independent cart item list scrolling, pinned bottom summary & checkout button.

### 3.2 Responsive Adaptations
- **Desktop (`>= 1024px`)**: Full 3-column layout visible simultaneously.
- **Tablet (`768px – 1023px`)**: Collapsed sidebar icon rail, 3-column product grid, transaction panel accessible via a side slide-over drawer or modal.
- **Mobile (`< 768px`)**:
  - Sidebar hidden; replaced with fixed `BottomNav` (`bg-[#171717] h-16`).
  - Product catalog displays a 2-column compact grid.
  - Cart floating summary bar sits above bottom navigation (`fixed bottom-16 left-0 right-0`).
  - Tapping cart bar opens a full-sheet checkout modal.

---

## 4. Component Implementation Blueprints

Every component must be written in plain beginner-readable JavaScript following `AGENTS.md` (no ternary operators, no object spread).

### 4.1 Navigation Sidebar (`frontend/src/components/Sidebar.jsx`)

**Tactical Rules:**
- Container: `hidden md:flex shrink-0 flex-col bg-[#171717] text-white select-none transition-all duration-200 ease-in-out`.
- Brand Header: Near-black surface, store icon container in lime green (`bg-[#B9F36B] text-[#151515] rounded-xl`).
- Navigation Items:
  - Inactive: `flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-medium text-[#A3A3A3] hover:bg-white/5 hover:text-white transition-colors cursor-pointer`.
  - Active: `flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold bg-[#B9F36B] text-[#151515] shadow-xs cursor-pointer`.
  - Active Icon: Dark stroke (`text-[#151515]`), inactive icon (`text-[#A3A3A3]`).
- Cash Drawer / Manage Staff Action Buttons:
  - Subtle dark button: `bg-white/5 hover:bg-white/10 text-[#A3A3A3] hover:text-white rounded-lg px-2.5 py-1.5 text-2xs font-medium transition cursor-pointer`.
  - Shift active indicator dot: Lime green `bg-[#B9F36B]` (not blue).
- Divider: `border-t border-white/10`.

### 4.2 Mobile Navigation (`frontend/src/components/BottomNav.jsx`)

**Tactical Rules:**
- Container: `fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-[#262626] bg-[#171717] select-none md:hidden`.
- Tab items:
  - Inactive: `text-[#A3A3A3] hover:text-white`.
  - Active Tab: `text-white font-semibold`.
  - Active Icon: `text-[#B9F36B]`.

### 4.3 Action Buttons (`frontend/src/components/Button.jsx`)

**Tactical Rules:**
- Base styles: `inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`.
- Border radius: `rounded-xl` (`--radius-input` / 14px).
- Variants:
  - `primary`: `bg-[#B9F36B] hover:bg-[#A8E65A] text-[#151515] font-semibold border-transparent shadow-xs active:scale-[0.99]`.
  - `secondary`: `bg-white hover:bg-[#EEEEED] text-[#151515] border border-[#E9E9E9] font-medium`.
  - `soft`: `bg-[#EEEEED] hover:bg-[#E2E2E1] text-[#151515] border-transparent font-medium`.
  - `ghost`: `bg-transparent hover:bg-[#EEEEED] text-[#777777] hover:text-[#151515] border-transparent`.
  - `danger`: `bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200`.

### 4.4 Category Filter Pills (`frontend/src/pages/PosPage.jsx`)

**Tactical Rules:**
- Container: Horizontal scrolling row with smooth drag/wheel scrolling: `mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none`.
- Pill Shape: Fully rounded (`rounded-full` / `--radius-pill`).
- Pill States:
  - Selected: `bg-[#151515] text-white font-medium px-4 py-2 text-xs flex items-center gap-2 shadow-xs`.
  - Inactive: `bg-white text-[#777777] border border-[#E9E9E9] hover:bg-[#EEEEED] hover:text-[#151515] px-4 py-2 text-xs font-medium flex items-center gap-2 transition-colors`.
- Counter Badge in Pill:
  - In selected pill: `bg-[#B9F36B] text-[#151515] font-semibold px-2 py-0.5 rounded-full text-2xs`.
  - In inactive pill: `bg-[#EEEEED] text-[#777777] px-2 py-0.5 rounded-full text-2xs`.

### 4.5 Product Card (`frontend/src/pages/PosPage.jsx`)

**Tactical Blueprint:**
```jsx
<div className="flex flex-col rounded-2xl border border-[#E9E9E9] bg-white p-3.5 transition-all hover:border-[#151515]/30 hover:shadow-xs justify-between">
  {/* 1. Image Container with Top-Left Stock Badge */}
  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#EEEEED] flex items-center justify-center p-2">
    {/* Upper-Left Dark Stock Badge */}
    <div className="absolute left-2 top-2 z-10 rounded-md bg-[#171717] px-2 py-0.5 font-mono text-2xs font-medium text-white shadow-xs">
      {stockBadgeText}
    </div>

    {/* Product Image */}
    <ProductThumb imageUrl={product.image_url} name={product.product_name} />
  </div>

  {/* 2. Product Information */}
  <div className="mt-3 min-w-0">
    <div className="truncate text-xs font-medium text-[#151515]" title={product.product_name}>
      {product.product_name}
    </div>
    <div className="mt-0.5 truncate text-2xs text-[#777777]">
      {product.category_name || product.base_unit}
    </div>
    <div className="mt-1 font-mono text-sm font-semibold text-[#151515]">
      {formatPeso(product.selling_price)}
    </div>
  </div>

  {/* 3. Add to Cart Full-Width Action */}
  <button
    type="button"
    onClick={function handleAdd() {
      onSelectProduct(product);
    }}
    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E9E9E9] bg-white py-2 text-xs font-semibold text-[#151515] hover:bg-[#EEEEED] active:bg-[#E2E2E1] transition-colors cursor-pointer"
  >
    <Plus className="h-3.5 w-3.5" />
    <span>Add to Cart</span>
  </button>
</div>
```

### 4.6 Right Transaction Panel & Cart (`frontend/src/pages/PosPage.jsx`)

**Tactical Rules:**
- Header: `flex items-center justify-between border-b border-[#E9E9E9] px-5 py-4`. Title: `text-base font-semibold text-[#151515]`.
- Cart Items List: `flex-1 overflow-y-auto divide-y divide-[#E9E9E9] px-5`.
- Cart Item Row:
  - Product thumbnail: Small 44×44px square in `#EEEEED` container (`ProductThumb size="sm"`).
  - Title: `text-xs font-semibold text-[#151515] truncate`.
  - Option Label: `text-2xs text-[#777777] truncate`.
  - Quantity Stepper:
    ```jsx
    <div className="inline-flex items-center rounded-lg border border-[#E9E9E9] bg-white">
      <button
        type="button"
        onClick={handleDec}
        className="flex h-7 w-7 items-center justify-center text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] rounded-l-lg cursor-pointer transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="min-w-8 text-center font-mono text-xs font-semibold text-[#151515]">
        {formatQuantity(item.quantity)}
      </span>
      <button
        type="button"
        onClick={handleInc}
        className="flex h-7 w-7 items-center justify-center text-[#151515] hover:bg-[#B9F36B]/40 rounded-r-lg cursor-pointer transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
    ```
  - Subtotal per item: `font-mono text-sm font-semibold text-[#151515]`.
- Financial Breakdown Section:
  - Subtotal row: `text-xs text-[#777777]` vs `font-mono text-[#151515]`.
  - Discount row: `text-xs text-rose-600` vs `font-mono text-rose-600`.
  - Grand Total row: `text-base font-bold text-[#151515]` vs `font-mono text-xl font-bold text-[#151515]`.
- Primary Checkout CTA:
  ```jsx
  <Button
    variant="primary"
    size="lg"
    disabled={cartItems.length === 0}
    onClick={openCheckoutModal}
    className="w-full justify-between px-5 py-3.5 text-base font-semibold bg-[#B9F36B] hover:bg-[#A8E65A] text-[#151515] rounded-xl shadow-xs"
  >
    <span>Checkout</span>
    <span className="font-mono font-bold">{formatPeso(totals.total)}</span>
  </Button>
  ```

### 4.7 Form Inputs & Search Bar (`frontend/src/components/Input.jsx`)

**Tactical Rules:**
- Container: `w-full rounded-xl border border-[#E9E9E9] bg-white px-3.5 py-2.5 text-sm text-[#151515] placeholder:text-[#777777] focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#B9F36B]/30 transition-colors`.
- Search Bar in POS:
  - Height `h-11`, radius `rounded-xl` (14px).
  - Search icon in `text-[#777777]`.
  - Keyboard shortcut pill: `border border-[#E9E9E9] bg-[#EEEEED] text-[#777777] rounded px-2 py-0.5 font-mono text-2xs`.

### 4.8 Status Badges (`frontend/src/components/Badge.jsx`)

**Tactical Tone Rules:**
- `neutral`: `bg-[#EEEEED] text-[#777777] border border-[#E9E9E9]`.
- `dark` (Stock Badge): `bg-[#171717] text-white border-transparent`.
- `green` (Active/Positive): `bg-[#B9F36B] text-[#151515] border-transparent font-medium`.
- `amber` (Low Stock/Warning): `bg-amber-50 text-amber-700 border border-amber-200`.
- `red` (Out of Stock/Danger): `bg-rose-50 text-rose-700 border border-rose-200`.

### 4.9 Modals and Dialog Overlays (`frontend/src/components/Modal.jsx`)

**Tactical Rules:**
- Backdrop: `fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-3 sm:p-6`.
- Card Container: `w-full rounded-2xl bg-white shadow-xl border border-[#E9E9E9] max-h-[92vh] flex flex-col`.
- Header: `flex items-center justify-between border-b border-[#E9E9E9] px-6 py-4`.
- Title: `text-base font-semibold text-[#151515]`.
- Close Button: `h-9 w-9 rounded-lg text-[#777777] hover:bg-[#EEEEED] hover:text-[#151515] transition-colors`.

### 4.10 Metric Cards (`frontend/src/components/StatCard.jsx`)

**Tactical Rules:**
- Container: `rounded-2xl border border-[#E9E9E9] bg-white p-5 sm:p-6`.
- Icon Container: `h-10 w-10 rounded-xl bg-[#EEEEED] text-[#151515] flex items-center justify-center`.
- Label: `text-xs font-medium text-[#777777]`.
- Value: `mt-2 font-mono text-2xl font-bold text-[#151515]`.

---

## 5. Screen-by-Screen Adoption Map

| Screen / Component | File Path | Key Changes to Apply |
|---|---|---|
| **Theme & Typography** | `frontend/src/index.css` | Register `@theme` color tokens (`#B9F36B`, `#171717`, `#F5F5F4`, `#EEEEED`, `#E9E9E9`, `#151515`, `#777777`), preserve Inter tabular-nums. |
| **Desktop Sidebar** | `frontend/src/components/Sidebar.jsx` | Near-black `#171717` background, lime-green active item pill (`#B9F36B` bg, `#151515` text), muted `#A3A3A3` inactive icons. |
| **Mobile Bottom Nav** | `frontend/src/components/BottomNav.jsx` | Near-black `#171717` background, active tab with lime-green `#B9F36B` icon and white text. |
| **Shared Primitives** | `Button.jsx`, `Badge.jsx`, `Input.jsx`, `Modal.jsx`, `StatCard.jsx`, `ProductThumb.jsx` | Upgrade to 14–16px radii, lime-green primary, dark stock badges, `#EEEEED` media containers. |
| **POS Cockpit Page** | `frontend/src/pages/PosPage.jsx` | 3-region cockpit: `#F5F5F4` background, rounded-full category pills, 4-col card grid with top-left dark stock badges, lime-green checkout CTA. |
| **Checkout & Shifts Modals** | `PosCheckoutModal.jsx`, `CashierShiftModal.jsx` | Banknote preset pills, change calculation highlight in lime-green accent, cash drawer denomination steppers. |
| **Inventory & Utang** | `InventoryPage.jsx`, `CustomersPage.jsx` | White cards with `#E9E9E9` borders, dark stock badges, lime-green "Add Product" and "New Customer" triggers. |
| **Reports & Dashboard** | `ReportsPage.jsx`, `DashboardPage.jsx`, `TransactionsPage.jsx` | Minimalist monochrome stat cards with `#EEEEED` icon containers, tabular number summaries. |

---

## 6. Coding Agent Guardrails & Ponytail Rules

When implementing this design system, every coding agent must strictly enforce:

1. **Ponytail Full Mode Enforcement:**
   - **Zero ternary operators:** Always write explicit `if` / `else` statements.
   - **Zero object spread syntax:** Use `Object.assign({}, ...)` or explicit property assignment.
   - **Plain beginner-readable JS:** Intermediate variables for all styling class strings.
2. **Preserve Business Logic & Architecture:**
   - Do **NOT** touch backend routes, SQLite queries, repository contracts, or decimal calculations (`formatPeso`, `computeLocalCartTotals`, unit-of-work transactions).
   - Maintain Philippine retail defaults (`₱` currency and `Asia/Manila` time).
3. **Preserve Existing Tests & Update Style Assertions Safely:**
   - Where tests assert specific color tokens (e.g. `tests/responsive_navigation.test.js` checking active BottomNav classes), update the tests to reflect the new design tokens (`text-[#B9F36B]` instead of `text-blue-400`).
   - Run both backend and frontend Vitest suites after every change:
     ```bash
     cd backend && npm test
     cd frontend && npm test
     cd frontend && npm run build
     ```
4. **No Premature Component Bloat:**
   - Update existing shared components in-place rather than creating duplicate component files.
   - Only create a new shared component if it is reused across 2 or more distinct pages.

---

## 7. Execution Phasing & Verification

### Phase 1: Foundations & Shared Primitives
- Update `frontend/src/index.css` with `@theme` design tokens.
- Refactor `Button.jsx`, `Badge.jsx`, `Input.jsx`, `ProductThumb.jsx`, `Modal.jsx`, `StatCard.jsx`.
- Verify typography test suite (`npm test tests/typography.test.js`).

### Phase 2: Navigation Shell
- Refactor `Sidebar.jsx` and `BottomNav.jsx` to near-black `#171717` and lime-green active item treatment.
- Update `tests/responsive_navigation.test.js` assertions.
- Verify shell rendering across desktop, tablet, and mobile breakpoints.

### Phase 3: POS Cockpit Redesign
- Redesign `PosPage.jsx`:
  - Search & quick actions bar.
  - Category filter pills (rounded-full with count badges).
  - Product grid and card anatomy (upper-left dark stock badge, `#EEEEED` thumbnail container, full-width add button).
  - Pinned right transaction panel with stepper controls and lime-green checkout button.
- Verify `tests/pos_render.test.js` and `tests/pos_checkout.test.js`.

### Phase 4: Secondary Pages & Modals Alignment
- Apply new tokens to `InventoryPage.jsx`, `CustomersPage.jsx`, `ReportsPage.jsx`, `TransactionsPage.jsx`, `CashierShiftModal.jsx`, and `NotFoundPage.jsx`.
- Run full Vitest suite and production build (`npm run build`).
- Verify zero AST violations (0 ternaries, 0 spreads).
