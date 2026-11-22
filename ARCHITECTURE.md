# Architecture

This project uses a module-first Clean Architecture layout. Dependencies point inward from presentation to application to domain. Infrastructure implements the ports defined by the inner layers.

## Layers

### Presentation

Backend route files and frontend pages/components belong to the presentation layer.

- Translate HTTP or user input into use-case input.
- Call application use cases or the REST API.
- Format responses and user-facing state.
- Do not call repositories or database clients directly.
- Do not implement core business rules.

### Application

Backend `use-cases.js` files coordinate workflows.

- Validate workflow-specific input.
- Load and combine data through injected repository ports.
- Coordinate transactions through the injected unit-of-work port.
- Return application results.
- Depend on domain code and ports, not Express or SQLite.

### Domain

Backend `domain.js` files contain business rules.

- Define entities, value validation, domain errors, constants, and repository contracts.
- Keep domain functions independent of Express, SQLite, React, and external services.
- Keep money, quantity, payment, inventory, soft-delete, and historical-snapshot rules here.

### Infrastructure

SQLite repositories and database code belong to the infrastructure layer.

- Implement repository and unit-of-work contracts.
- Convert SQLite storage values to domain values and back.
- Keep SQL, schema definitions, pragmas, and SQLite-specific behavior here.
- Do not move database-specific details into domain or application code.

## Backend modules

Backend modules use a flat structure:

```text
backend/src/
├── shared/       # Decimal helpers, validation, errors, and ports
├── db/           # SQLite connection, schema, and unit of work
├── inventory/    # Products, selling options, suppliers, stock
├── sales/        # Checkout, sales, returns
├── credit/       # Customers, balances, and credit transactions
├── reports/      # Sales and inventory reports
├── app.js        # Composition root and middleware
└── server.js     # Runtime entry point
```

Each business module should keep its domain, use cases, repository adapter, and routes as sibling files. Split large files into additional sibling files instead of adding nested module directories.

`app.js` is the composition root. It creates the database, repositories, unit of work, shared dependencies, use cases, and routers.

## Frontend modules

```text
frontend/src/
├── api.js
├── format.js
├── products.js
├── cart.js
├── navigation.js
├── components/
├── pages/
├── App.jsx
└── main.jsx
```

Use shared helpers for calculations and formatting. Keep page orchestration in `pages/` and reusable UI in `components/`. Send all API requests through `api.js`.

## Persistence rules

- Store money in SQLite as integer centavos (`× 100`).
- Store quantities in SQLite as integer ten-thousandths (`× 10,000`).
- Convert scaled values at repository mapping boundaries.
- Keep repository and unit-of-work methods asynchronous.
- Generate identifiers through the application ID generator.
- Process a sale and its inventory deductions in one transaction.
- Preserve sale-time price, cost, option name, and base quantity snapshots.

## API boundary

- Mount backend routers under `/api`.
- Return `{ data }` for successful responses.
- Return `{ error: { code, message } }` for failures through the shared error handler.
- Validate request data at the route boundary and enforce business rules again in domain/application code.
- Serve product uploads through `/uploads`.

## Business boundaries

The inventory model uses one product `base_unit`. Packs, bundles, promotions, weight/volume presets, and flexible prices are `ProductSellingOption` records. Selling options do not own inventory.

Products are soft-deleted with `deleted_at` so historical sales and inventory remain available. `is_active = false` disables records without deleting them.

See [`docs/product-inventory-and-selling-options.md`](docs/product-inventory-and-selling-options.md) for the complete inventory and selling specification.
