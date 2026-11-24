# Architecture Specification

Clean Architecture rules, module responsibilities, persistence boundaries, and API contracts.

---

## 1. Core Architectural Rules

Dependencies must strictly point inward:

```
[ Presentation (Routes, Pages) ]
            ↓
  [ Application (Use Cases) ]
            ↓
       [ Domain (Rules, Ports) ]
            ↑
[ Infrastructure (SQLite Adapters) ]
```

1. **Domain Layer**:
   - Resides in `<module>/domain.js`.
   - Defines core entities, business validation, domain errors, and repository port contracts.
   - Must remain pure JavaScript: zero imports from Express, SQLite, React, or third-party libraries.
2. **Application Layer**:
   - Resides in `<module>/use-cases.js`.
   - Coordinates business workflows, validates use-case input, orchestrates transactions via `UnitOfWork`.
   - Injects repository ports and system clocks; never directly references databases or HTTP code.
3. **Infrastructure Layer**:
   - Resides in `<module>/sqlite-repo.js` and `db/sqlite.js`.
   - Implements domain repository ports using plain SQL with `node:sqlite`.
   - Manages DDL, pragmas (`PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`), and parameter binding.
   - Exposes all repository and unit-of-work methods as asynchronous (`async`).
4. **Presentation Layer**:
   - Backend routes (`<module>/routes.js`) translate HTTP requests, parse query/body inputs, and delegate to application use cases.
   - Frontend UI (`frontend/src/pages/` and `frontend/src/components/`) renders views and delegates API operations to `frontend/src/api.js`.
   - Routes and UI components must never execute database queries or implement core business rules.

---

## 2. Directory & Module Structure

The project uses a flat, single-level module structure:

```text
backend/src/
├── shared/                  # Decimal helpers, errors, base validation, ID and clock ports
├── db/                      # SQLite connection, schema.sql, UnitOfWork, seed execution
├── auth/                    # PIN hashing (scrypt), sessions, RBAC middleware, user routes
├── inventory/               # Products, selling options, categories, suppliers, stock movements
├── sales/                   # POS checkout, sales items, returns, receipt sequencing
├── credit/                  # Customers, credit limit enforcement, utang ledgers
├── shifts/                  # Cashier shifts, cash movements, drawer reconciliation
├── reports/                 # Daily/monthly sales summaries, inventory valuation, profit metrics
├── app.js                   # Composition root: wires repos, use cases, middleware, routers
└── server.js                # Environment configuration and HTTP listener entry point

frontend/src/
├── api.js                   # Single REST API client for all Express endpoints
├── format.js                # Peso (₱), 4-decimal quantity, and Asia/Manila date formatters
├── products.js              # Product search filters and stock-level classifications
├── cart.js                  # Pure cart math (subtotals, discounts, tingi conversions, totals)
├── export.js                # Client-side CSV generator and print helpers
├── navigation.js            # Route keys, path mappings, role visibility definitions
├── components/              # Shared UI primitives (buttons, inputs, modals, layout, stat cards)
├── pages/                   # Page screens (POS, Inventory, Customers, Shifts, Reports, etc.)
├── App.jsx                  # Root state orchestration (auth check, page router, debug overlay)
└── main.jsx                 # Vite application mount
```

---

## 3. Data Scaling & Persistence Rules

All financial and inventory metrics are stored in SQLite as scaled integers to avoid floating-point drift:

| Metric | Business Unit | Database Storage Representation | Conversion Helper |
| :--- | :--- | :--- | :--- |
| **Monetary Values** | Philippine Peso (`₱`), 2 decimals | Scaled integer centavos (`× 100`) | `toMoneyInt(val)` / `fromMoneyInt(int)` |
| **Quantities** | Base units, up to 4 decimals | Scaled integer ten-thousandths (`× 10,000`) | `toQuantityInt(val)` / `fromQuantityInt(int)` |

### Persistence Invariants

1. **Base Unit Canonical Inventory**: Stock is stored exclusively on `products.current_stock_int`. `product_selling_options` represent packaging or unit presets and never maintain independent stock.
2. **Snapshot Invariants**: Every `sales_items` row snapshots `unit_price_int`, `unit_cost_int`, `base_quantity_int`, and `option_name_snapshot` at the time of sale. Historical profit calculations remain immutable.
3. **Atomic Unit of Work**: Sales, inventory deductions, return adjustments, and shift cash transactions must execute inside a `unitOfWork.run()` transaction block.
4. **Soft Deletions**: Products are deactivated via `deleted_at`. Deleted products are excluded from POS catalog queries and inventory calculations while preserving historical relational integrity.

---

## 4. API & Security Contracts

### Standard REST Response Envelope

- **Success (`200 OK`, `201 Created`)**:
  ```json
  {
    "data": { ... }
  }
  ```
- **Failure (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal`)**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable safe explanation"
    }
  }
  ```

### Authentication & RBAC Rules

1. Route-level security is enforced when `ENFORCE_AUTH=true`.
2. `OWNER` role is required for user administration, product and catalog changes, manual stock changes, and financial reports.
3. `CASHIER` role allows POS checkout, inventory browsing, recording customer utang payments, and opening/closing own shifts. The cashier dashboard shows inventory alerts.
4. Internal stack traces, SQL syntax errors, database file paths, and PIN hashes must never leak in API response payloads.
