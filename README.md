# Store Management System

A local-first store management and point-of-sale system for small Philippine retail stores.

## Current features

- Product, category, supplier, unit, and selling-option management.
- Stock-in, stock adjustments, low-stock alerts, and inventory history.
- POS checkout with base units, packs, bundles, fractional quantities, discounts, and custom peso amounts.
- Sales returns and printable receipts.
- Customer credit (utang), payments, and customer ledgers.
- Cashier shifts, cash movements, and shift closing.
- Owner and cashier accounts with PIN authentication and role-based access.
- Daily sales, product, and inventory reports.
- SQLite persistence with Docker Compose support.

Currency is Philippine peso (`₱`). Business-day calculations use `Asia/Manila` (`UTC+8`).

## Stack

- Backend: Node.js 24, Express, ESM JavaScript, built-in `node:sqlite`, and Vitest.
- Frontend: React 19, Vite, JavaScript/JSX, Tailwind CSS v4, and Vitest.
- Deployment: Docker Compose with an Nginx frontend proxy and persistent SQLite/uploads volume.

## Requirements

- Node.js 24 or compatible.
- npm.
- Docker and Docker Compose for containerized use.

## Local development

Install dependencies:

```bash
cd backend
npm ci
cd ../frontend
npm ci
```

The backend requires `PORT`, `DATABASE_PATH`, and `UPLOADS_DIR`. Start it from `backend/`:

PowerShell:

```powershell
$env:PORT="3001"
$env:DATABASE_PATH="./data/store.db"
$env:UPLOADS_DIR="./uploads"
npm start
```

Bash:

```bash
PORT=3001 DATABASE_PATH=./data/store.db UPLOADS_DIR=./uploads npm start
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/uploads` to `http://localhost:3001`.

On the first visit, create the initial owner account. The application then requires login. Set `ENFORCE_AUTH=true` when the backend must enforce authentication and role checks for API routes.

## Seed local data

Run this from `backend/`:

```bash
npm run seed
```

Seeding uses the configured database path. Cleaning existing data removes sales and inventory history, so use clean options only when that data loss is intended.

## Docker

Start the full application:

```bash
docker compose up -d --build
docker compose exec backend node src/db/seed.js
```

Open `http://localhost:8080`.

Useful commands:

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

The `store_data` volume contains the database and uploaded images. `docker compose down -v` deletes that volume and its data.

See [`docs/docker-deployment.md`](docs/docker-deployment.md) for published images, updates, rollback, and service recreation.

## Tests and build

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md): layers, modules, dependency rules, and API boundaries.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): contribution and verification workflow.
- [`docs/product-inventory-and-selling-options.md`](docs/product-inventory-and-selling-options.md): inventory and selling rules.
- [`docs/store-management-system-plan.md`](docs/store-management-system-plan.md): current implementation status and roadmap.
- [`docs/docker-deployment.md`](docs/docker-deployment.md): Docker deployment instructions.
- [`docs/design-system.md`](docs/design-system.md): frontend visual system and remaining UI work.
- [`AGENTS.md`](AGENTS.md): persistent instructions for coding agents.
