# Store Management System — Architecture & Plan

Authoritative status, architectural contracts, implemented capabilities, and verification roadmap.

Use this document to understand project scope, reported implementation status, and deferred work. It is a planning reference; use [ARCHITECTURE.md](../ARCHITECTURE.md) for detailed layer contracts and the domain specifications for business rules.

---

## 1. System Scope & Architecture

StoreFlow is a local-first retail point-of-sale (POS) and inventory management system designed for Philippine retail stores (Sari-Sari stores, mini-groceries).

### Core Standards
- **Currency**: Philippine Peso (`₱`), stored in database as integer centavos (`× 100`).
- **Timezone**: `Asia/Manila` (`UTC+8`) for business-day calculations and receipt sequencing (`YYYYMMDD-####`).
- **Architecture**: Module-first Clean Architecture. Inward dependency rule: Presentation $\to$ Application $\to$ Domain $\leftarrow$ Infrastructure.
- **Transactions**: All multi-table updates (sales checkout, returns, restock) execute inside an atomic `UnitOfWork`.

---

## 2. Technology Stack & Storage Standards

| Component | Technology | Role & Storage Pattern |
| :--- | :--- | :--- |
| **Backend API** | Node.js 24, Express, ESM | REST API server, Clean Architecture modules, centralized error handling |
| **Persistence** | SQLite (`node:sqlite`) | Synchronous WAL-mode database with scaled integer storage (`PRAGMA foreign_keys = ON`) |
| **Frontend UI** | React 19, Vite, Tailwind v4 | Desktop POS cockpit, admin management screens, responsive mobile layout |
| **Frontend State** | React built-in (`useState`) | Component state; no external state management libraries |
| **Containerization** | Docker Compose + Nginx | Reverse proxy (`:8080`) routing to private backend (`:3001`) with persistent volume |
| **Testing** | Vitest | In-memory unit tests, SQLite integration tests, route contract tests |

---

## 3. Implemented Modules & Capabilities

### 3.1 Inventory Management (`backend/src/inventory/`)
- Product catalog CRUD with soft delete (`deleted_at`) and temporary disablement (`is_active = 0`).
- Category and supplier management.
- Selling options (packs, bundles, promos, weight/volume presets).
- Global barcode uniqueness across `products` and `product_selling_options`.
- Image attachments stored in `uploads/products/` with static serving.
- Bulk stock-in with pack multiplier, stock adjustments (`ADJUSTMENT`, `DAMAGED`, `EXPIRED`), low-stock alerts.

### 3.2 Sales & POS Checkout (`backend/src/sales/`)
- Fast POS checkout supporting default base units, preset selling options, and ad-hoc custom peso ("tingi") sales.
- Atomic stock deduction and sales item snapshots (`unit_price`, `unit_cost`, `base_quantity`, `option_name_snapshot`).
- Daily sequential receipt generation (`YYYYMMDD-0001`).
- Line-item and order-level discount handling.
- Sales returns restoring inventory and processing cash or credit refunds.

### 3.3 Customer Credit / Utang Ledger (`backend/src/credit/`)
- Customer profile management with credit limits and running balance tracking.
- Payment breakdown support: `CASH`, `CREDIT`, or `SPLIT` (cash + credit).
- Credit transactions audit ledger (`CHARGE`, `PAYMENT`, `RETURN_ADJUSTMENT`).

### 3.4 User Roles & Cashier Shifts (`backend/src/auth/` & `backend/src/shifts/`)
- Role-Based Access Control: `OWNER` (full administrative rights) and `CASHIER` (POS and shift duties).
- First-time wizard creating the initial `OWNER` account; scrypt PIN hashing.
- Cashier shift tracking: opening cash, cash movements (`CASH_IN`, `CASH_OUT`), expected cash calculation, variance reconciliation, shift closing.

### 3.5 Reports & Analytics (`backend/src/reports/`)
- Daily sales, gross revenue, net profit (`SUM(subtotal - base_quantity * unit_cost)`).
- Product sales performance rankings.
- Inventory valuation and stock movement audit logs.
- Client-side CSV export and browser receipt print layout.

---

## 4. Verification & Testing Requirements

Execute tests before every commit:

1. **Backend Tests**:
   ```bash
   cd backend && npm test
   ```
   *Verifies domain rules, in-memory use-case fakes, SQLite transactions, rollback integrity, and REST routes.*

2. **Frontend Tests & Build**:
   ```bash
   cd frontend && npm test
   cd frontend && npm run build
   ```
   *Verifies component rendering, POS cart math, responsive navigation, and Vite production bundle compilation.*

3. **Code Style & Diff Checks**:
   ```bash
   git diff --check
   ```

---

## 5. Roadmap & Deferred Items (Phase 5)

- **Direct Hardware ESC/POS Printer Adapter**: WebUSB or serial ESC/POS thermal printing (browser print via `@media print` currently supported).
- **Automated Cloud Sync**: Background cloud backup snapshot synchronization without coupling core domain logic to external cloud providers.
