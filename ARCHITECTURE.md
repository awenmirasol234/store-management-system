# Architecture

The project uses a module-first Clean Architecture layout. Presentation code calls application use cases, application code depends on domain rules and ports, and infrastructure implements those ports.

## Layers

### Presentation

Backend route files and frontend pages/components are presentation code.

- Translate HTTP or user input into use-case input.
- Call application use cases or the REST API.
- Format responses and user-facing state.
- Do not call repositories or database clients directly.
- Do not implement core business rules.

### Application

Backend `use-cases.js` files coordinate workflows.

- Validate workflow-specific input.
- Load and combine data through injected repository ports.
- Coordinate transactions through the unit-of-work port.
- Return application results.
- Depend on domain code and ports, not Express or SQLite.

### Domain

Backend `domain.js` files contain entities, validation, constants, domain errors, and repository contracts. Domain code is independent of Express, SQLite, React, and external services.

### Infrastructure

SQLite repositories and database code implement domain/application ports.

- Keep SQL, schema definitions, pragmas, and SQLite-specific behavior here.
- Convert scaled SQLite values at repository mapping boundaries.
- Keep repository and unit-of-work methods asynchronous.

## Backend modules

```text
backend/src/
├── shared/       # Decimal helpers, validation, errors, security headers, and ports
├── db/           # SQLite connection, schema, seed data, and unit of work
├── auth/         # Owner/cashier accounts, PINs, sessions, and RBAC
├── inventory/    # Products, selling options, categories, suppliers, and stock
├── sales/        # Checkout, sales, returns, and receipts
├── credit/       # Customers, balances, and credit transactions
├── shifts/       # Cashier shifts and cash movements
├── reports/      # Sales and inventory reports
├── app.js        # Composition root, middleware, routers, and error handling
└── server.js     # Environment loading and HTTP server entry point
```

Each module keeps its domain, use cases, SQLite adapter, and routes as flat sibling files. `app.js` creates repositories, use cases, middleware, and routers.

## Frontend modules

```text
frontend/src/
├── api.js, cart.js, format.js, navigation.js, products.js
├── components/  # Shared forms, tables, modals, navigation, and receipt UI
├── pages/       # Dashboard, POS, inventory, customers, transactions, reports, auth
├── App.jsx      # Authentication, page routing, and application shell
└── main.jsx     # React/Vite entry point
```

All backend requests go through `frontend/src/api.js`. Page orchestration stays in `pages/`; reusable UI stays in `components/`.

## Persistence and business boundaries

- Product inventory is kept in one `base_unit`.
- Selling options represent packs, bundles, promotions, weight/volume presets, and flexible prices; they do not own inventory.
- Money is stored in SQLite as integer centavos (`× 100`).
- Quantities are stored as integer ten-thousandths (`× 10,000`).
- Sales, inventory deductions, returns, and related records use one transaction.
- Sale items snapshot price, cost, option name, and base quantity.
- Products are soft-deleted with `deleted_at`; `is_active = false` disables records without deleting history.

## API and security boundary

- Health check: `GET /api/health`.
- Authentication: `/api/auth`; user management: `/api/users`.
- Business APIs: products, inventory, sales, reports, customers, credit, and shifts under `/api`.
- Product uploads are served under `/uploads`.
- Successful responses use `{ data }`; failures use `{ error: { code, message } }`.
- With `ENFORCE_AUTH=true`, reports require `OWNER`; sales, customers, units, and shifts require authentication; inventory and write operations require owner permissions as configured in `app.js`.
- The shared error handler does not expose internal errors, credentials, or file paths.

See [`docs/product-inventory-and-selling-options.md`](docs/product-inventory-and-selling-options.md) for the complete inventory specification.
