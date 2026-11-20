# AGENTS.md

This file defines the architectural standards, project structure, and conventions for all contributors and AI agents working in `store-management-system`.

> **Required Skill:** Always load and follow `.agents/skills/ponytail/SKILL.md` (`full` mode) before making any code or documentation changes.

## 1. Architecture Standard: Clean Architecture

This project follows **Module-First Clean Architecture**. Business logic and domain rules are isolated from frameworks, databases, and UI so modules (such as the reusable inventory and flexible selling module) remain portable and testable.

### The Dependency Rule

Dependencies **must only point inward** (enforced by file role inside each flat module folder):

```text
routes.js (presentation)  ──▶  use-cases.js (application)  ──▶  domain.js (domain)
*-repo.js (infrastructure) ───────────────────────────────────▶  domain.js / use-cases.js
```

- **Domain (`domain.js`)**: Pure business entities, validation rules, domain errors, and port contracts. **Must never** import from `use-cases.js`, `*-repo.js`, `routes.js`, databases, Express, or UI libraries.
- **Application (`use-cases.js`)**: Use cases and orchestration logic. Depends **only** on `domain.js` (and `shared/`). Interacts with persistence exclusively through injected repository/`UnitOfWork` ports.
- **Infrastructure (`sqlite-repo.js`, future `postgres-repo.js` / `mysql-repo.js`)**: Concrete SQL adapters implementing domain repository contracts. Depends on `domain.js` and `shared/`.
- **Presentation (`routes.js`, React `pages/`)**: Express routers and UI screens. Depends on `use-cases.js` (or REST API)—never directly on `*-repo.js` or database clients.

---

## 2. Standard Project Structure

The project separates the standalone **Express backend** (`backend/`) from the **React + Vite frontend** (`frontend/`). **No nested subfolders inside modules** and no barrel `index.js` files—keep every module flat (max 1 folder under `src/`) with clean separation by file role:

```text
backend/
├── src/
│   ├── shared/                  # decimal.js, errors.js, ports.js, validation.js
│   ├── db/                      # sqlite.js (connection, schema DDL, UnitOfWork)
│   ├── <module>/                # Flat module folder (inventory, sales, reports)
│   │   ├── domain.js            # Entities, validation rules, errors, repository contracts
│   │   ├── use-cases.js         # Single-responsibility use cases
│   │   ├── sqlite-repo.js       # SQLite adapter (add postgres-repo.js / mysql-repo.js to swap DB)
│   │   └── routes.js            # Express REST router
│   ├── app.js                   # Express app setup (middleware, routes, error handler)
│   └── server.js                # HTTP server entry point
└── tests/                       # Flat test files (inventory.test.js, sales.test.js, reports.test.js, shared.test.js, sqlite.test.js, routes.test.js)

frontend/
└── src/
    ├── api.js                   # Single REST API client for Express
    ├── format.js                # Peso, quantity, Manila date formatting helpers
    ├── products.js              # Shared product search filter and stock-level helper
    ├── cart.js                  # Local cart subtotal, discount, and total rounding
    ├── components/              # Shared UI components (Badge.jsx, BottomNav.jsx, Button.jsx, ErrorBanner.jsx, Input.jsx, InventoryAdjustModal.jsx, InventoryStockInModal.jsx, Modal.jsx, PosCheckoutModal.jsx, ProductThumb.jsx, ReceiptView.jsx, Sidebar.jsx, StatCard.jsx)
    ├── pages/                   # Flat screens (DashboardPage.jsx, PosPage.jsx, InventoryPage.jsx, TransactionsPage.jsx, ReportsPage.jsx)
    ├── App.jsx
    └── main.jsx                 # React + Vite entry point

frontend/tests/                  # Flat Vitest tests (format.test.js, cart.test.js, products.test.js, transactions.test.js, responsive_navigation.test.js)
```

> If a single module file grows too large, split it into flat sibling files inside the same module folder (e.g., `stock-use-cases.js`) rather than adding nested subfolders.

> **Current status:** Inventory, sales, and reports run on SQLite with Express and React. Credit, roles, and shifts are still planned; POS payment is cash-only until credit is wired.

---

## 3. Domain & Module Guidelines

Reference specifications: `docs/product-inventory-and-selling-options.md` and `docs/store-management-system-plan.md`.

1. **Single Unified Selling Model**: Keep product inventory in one `base_unit` on `Product`, and represent packs, bundles, promos, weight/volume presets, and flexible prices via `ProductSellingOption` (`quantity` in `base_unit` + `price`). Do not create separate pricing models per selling method.
2. **Numeric Precision**:
   - Monetary values (`cost_price`, `selling_price`, `price`, `unit_price`, `unit_cost`, `subtotal`, totals): `DECIMAL(12, 2)`.
   - Inventory and option quantities (`current_stock`, `reorder_level`, `quantity`, `base_quantity`): `DECIMAL(12, 4)` to support fractional weights and volumes.
   - **SQLite Persistence Rule**: SQLite has no native `DECIMAL` type. Store monetary columns as scaled integer centavos (`× 100`) and quantity columns as scaled integer ten-thousandths (`× 10,000`), converting at the repository mapper boundary so arithmetic and SQL `SUM()` stay exact.
3. **Transactional Integrity & Relational DB Portability**:
   - Sales processing and inventory deductions must execute atomically via a `UnitOfWork` / transaction port defined in `shared/ports.js` or `domain.js`.
   - Keep all repository and `UnitOfWork` port methods `async` (Promise-returning) even for synchronous SQLite (`node:sqlite`), use application-generated IDs (`IdGenerator`), and isolate dialect-specific SQL/DDL in `<dialect>-repo.js` and `db/<dialect>.js` so PostgreSQL or MySQL adapters can be plugged in without changing `domain.js`, `use-cases.js`, or `routes.js`.
4. **Historical Snapshots & Cost Policy**: Always snapshot `unit_price`, `unit_cost`, `option_name_snapshot`, and `base_quantity` on `SalesItem` at the time of sale so historical revenue and profit remain accurate. On `STOCK_IN`, update `Product.cost_price` to the latest `unit_cost`.
5. **Backend Validation & Data Integrity**: Enforce all quantity, stock, payment, credit-limit, cross-table barcode uniqueness, product soft-delete (`deleted_at`), soft-disable (`is_active = false`), and sign rules in domain/application layers regardless of UI validation. Use `PHP (₱)` and `Asia/Manila` (`UTC+8`) for daily cutoffs.

---

## 4. Coding Standards

- **Tech Stack**:
  - **Backend (`backend/`)**: Node.js, Express, plain JavaScript (ESM, no TypeScript), plain JS validation functions (no Zod), built-in `node:sqlite` (plain SQL), Vitest.
  - **Frontend (`frontend/`)**: React, Vite, plain JavaScript / JSX (no TypeScript), built-in React state (`useState`, `useReducer`, `useContext`; no external state library), Tailwind CSS.

### Simplicity & Beginner-Friendly Code (Ponytail Mode)
- Follow `.agents/skills/ponytail/SKILL.md`: take the smallest complete change that solves the task.
- Use **fundamental, beginner-maintainable JavaScript patterns**: plain functions, simple objects, `if`/`else`, `for` loops, `try`/`catch`, `async`/`await`, early returns, and clear intermediate variables.
- **No ternary operators (`? :`)**: always use explicit `if`/`else` statements.
- **No object spread syntax (`{ ...obj }`)**: always use `Object.assign({}, existing, updates)` or explicit property assignment so copied/updated fields are clear to beginners.
- **No complex arguments or parameters**: keep parameter lists short and flat (or pass one simple flat object when multiple fields are needed); avoid nested destructuring, default-value gymnastics, or spread/rest tricks in function signatures.
- Avoid advanced or clever patterns: no `Proxy`/`Reflect`, decorators, complex class inheritance/mixins, currying, dense functional chains, or tricky one-liners.
- No speculative abstractions, wrappers, options, config, or "for later" boilerplate nobody asked for—while keeping the Clean Architecture layer boundaries intact.
- Never cut trust-boundary validation, error handling that prevents data loss, or security. Mark any intentional shortcut with `shortcut: <limit>, <when to upgrade>`.

### Variable Naming
- Use descriptive, concise, and meaningful names for variables, functions, classes, and files that communicate purpose and meaning.
- Avoid single-letter variable names (`x`, `i`, `j`, `n`), except for conventional loop counters when appropriate.
- Avoid unclear two-letter variable names (`id`, `db`, `fn`) when a more descriptive name improves readability.
- Apply consistent naming conventions throughout the codebase.

### Single Responsibility
- **One function per responsibility**: every function must do one clear job only.
- Keep functions small and focused; split validation, calculation, and side effects into separate helper functions rather than mixing them in one function.

### Loose Coupling
- Keep components independent and avoid unnecessary dependencies between modules.
- Depend on abstractions (`domain.js` port contracts) where appropriate and use dependency injection when it improves flexibility and testability.

### Code Reusability & Consistent Patterns
- Reuse existing utilities, validators, error classes, and helpers (`backend/src/shared/`, `frontend/src/api.js`, `frontend/src/components/`) instead of duplicating logic.
- Follow the **same repeatable pattern** in every module so any file feels familiar to a beginner:
  - **File naming**: `kebab-case.js` for backend modules and utilities; `PascalCase.jsx` for React components.
  - **Use cases**: Plain factory function `create<UseCaseName>(dependencies)` returning an `async function execute(input)` (or a single named `async` function) with uniform input/output objects.
  - **Repositories**: Plain factory function `createSqlite<Entity>Repository(database)` returning an object of `async` methods matching the `domain.js` port contract.
  - **Express routes**: One `create<Module>Router(useCases)` per module returning a consistent JSON shape (`{ data }` on success, `{ error: { code, message } }` on failure via one shared error middleware).
  - **Frontend**: Shared API client wrapper and reusable UI components (buttons, inputs, modals, tables) used consistently across features.
- Do not introduce abstractions without a practical need; extract shared code only when it is genuinely reused across two or more places.

### Error Handling
- Validate inputs at appropriate boundaries using plain JavaScript guards and domain rules.
- Handle expected errors explicitly; never silently ignore errors.
- Provide clear and useful error messages.

### Comments and Documentation
- Write comments only when they provide useful context; explain *why* something is done rather than repeating *what* the code does.
- Document important business rules and complex logic.
- Keep comments short, accurate, and up to date.

### UI & UX Standards (Owner-First, No Clutter)
- **Think like a store owner / cashier**: Design every screen strictly around the real daily use case (fast checkout, quick stock-in, clear utang balance, clear shift cash count).
- **No clutter or overloaded text**: No filler paragraphs, redundant subtitles, decorative widgets, or unnecessary labels—show only the fields and actions needed for the task.
- **Scannable & fast**: Use short, plain labels, clear visual hierarchy (prices, totals, stock alerts stand out), and minimal clicks to complete primary actions.
- **Single font**: Use Inter for all text, including digits. `font-mono` resolves to Inter, and tabular numbers keep numeric columns aligned.

---

## 5. Testing, Maintainability & Implementation Workflow

### Testing
- Write unit tests for important business logic covering normal cases, edge cases (negative stock, fractional quantities, precision limits, transaction sign rules), and failure cases.
- Keep code easy to test independently: `domain.js` and `use-cases.js` tests must run without a database or network using in-memory fakes for repository ports.

### Maintainability
- Follow existing project conventions and preserve existing functionality.
- Avoid unrelated changes; remove dead code only when safe.
- Keep documentation consistent with the implementation.

### Implementation Practices
- Inspect existing code and understand the architecture and dependencies before making changes.
- Improve existing implementations instead of rewriting them unnecessarily.
- Choose the simplest solution that satisfies the requirements.
- Verify changes with required checks before completing work:
  ```bash
  cd backend && npm test
  ```
