# Store Management System

A local-first store management and point-of-sale system for small retail stores.

## Stack

- Backend: Node.js, Express, ESM JavaScript, SQLite, and Vitest.
- Frontend: React, Vite, JavaScript/JSX, Tailwind CSS, and Vitest.
- Deployment: Docker Compose with an Nginx frontend proxy.

The application supports inventory, selling options, stock movements, sales, returns, credit customers, and reports. Currency uses PHP (`₱`) and business-day calculations use `Asia/Manila`.

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

Start the backend from `backend/`:

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

Open `http://localhost:5173`. The Vite development server proxies `/api` and `/uploads` to `http://localhost:3001`.

## Seed local data

Run this from `backend/`:

```bash
npm run seed
```

Seeding uses the configured database path. Use the seed script's supported options carefully because cleaning existing data removes sales and inventory history.

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

`docker compose down -v` removes the `store_data` volume, including the database and uploaded images.

See [`docs/docker-deployment.md`](docs/docker-deployment.md) for deployment details and service recreation notes.

## Tests and build

Run backend tests:

```bash
cd backend
npm test
```

Run frontend tests and build:

```bash
cd frontend
npm test
npm run build
```

## Documentation

- [`AGENTS.md`](AGENTS.md): persistent instructions for coding agents.
- [`ARCHITECTURE.md`](ARCHITECTURE.md): layers, modules, and dependency rules.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): contribution and verification workflow.
- [`docs/product-inventory-and-selling-options.md`](docs/product-inventory-and-selling-options.md): inventory and selling rules.
- [`docs/store-management-system-plan.md`](docs/store-management-system-plan.md): broader implementation plan.
- [`docs/docker-deployment.md`](docs/docker-deployment.md): Docker deployment instructions.
