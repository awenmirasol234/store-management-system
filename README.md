# Store Management System

Local-first point-of-sale (POS) and inventory management system for Philippine retail stores.

Use this README for prerequisites, local setup, seeding, deployment entry points, and verification commands. Detailed rules belong in the linked architecture and domain documents.

- **Currency**: Philippine Peso (`₱`), stored as scaled integer centavos (`× 100`).
- **Timezone**: `Asia/Manila` (`UTC+8`) for business-day calculations and receipt sequencing.
- **Backend**: Node.js 24, Express, plain SQL via `node:sqlite`, Vitest.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Vitest.
- **Deployment**: Docker Compose with Nginx reverse proxy and persistent SQLite volume.

---

## 1. Prerequisites

- Node.js 24 or compatible
- npm 10+
- Docker and Docker Compose (for containerized execution)

---

## 2. Local Development Setup

### Step 1: Install Dependencies

```bash
cd backend && npm ci
cd ../frontend && npm ci
```

### Step 2: Start the Backend API Server

The backend requires `PORT`, `DATABASE_PATH`, and `UPLOADS_DIR`. Default port is `3001`.

**PowerShell (Windows):**

```powershell
cd backend
$env:PORT="3001"
$env:DATABASE_PATH="./data/store.db"
$env:UPLOADS_DIR="./uploads"
npm start
```

**Bash (Linux / macOS):**

```bash
cd backend
PORT=3001 DATABASE_PATH=./data/store.db UPLOADS_DIR=./uploads npm start
```

### Step 3: Start the Frontend Application

In a separate terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/uploads` requests to `http://localhost:3001`.

### Step 4: First-Time Setup & Authentication

1. Open `http://localhost:5173` in a browser.
2. Complete the setup wizard to create the initial `OWNER` account and PIN.
3. Use the created PIN to sign in.
4. Set `ENFORCE_AUTH=true` in the backend environment when route-level authentication and role checks must be enforced. Default is `false` for development ease.

---

## 3. Database Seeding & Reset

Run all seed commands from `backend/`:

- **Seed Sample Catalog & Sales**:
  ```bash
  npm run seed
  ```
  Applies base units, categories, suppliers, 50 sample products, selling options, initial inventory movements, and sample sales transactions.

- **Clean and Reseed Database**:
  ```bash
  npm run seed -- --clean
  ```
  > [!WARNING]
  > `--clean` removes all products, selling options, inventory transactions, sales, returns, customer accounts, credit records, cashier shifts, and user accounts. `store_settings` are retained.

---

## 4. Docker Deployment

Deploy the entire stack (Nginx frontend proxy on port `8080` + private Express backend) with Docker Compose:

### Start Services

```bash
docker compose up -d --build
docker compose exec backend node src/db/seed.js
```

Open `http://localhost:8080`.

### Operational Commands

- **Check service status**: `docker compose ps`
- **Follow backend logs**: `docker compose logs -f backend`
- **Stop containers**: `docker compose down`
- **Purge volume and data**: `docker compose down -v` *(Deletes database and image uploads)*

For production image tags, updates, and rollbacks, see [docs/docker-deployment.md](docs/docker-deployment.md).

---

## 5. Verification & Testing

Run test suites before every commit:

- **Backend Tests (Unit & SQLite Integration)**:
  ```bash
  cd backend && npm test
  ```

- **Frontend Tests (Components, Cart & POS)**:
  ```bash
  cd frontend && npm test
  ```

- **Frontend Production Build**:
  ```bash
  cd frontend && npm run build
  ```

- **Diff & Whitespace Check**:
  ```bash
  git diff --check
  ```

---

## 6. Documentation Index

- [ARCHITECTURE.md](ARCHITECTURE.md): Clean Architecture layers, module layout, data scaling, and API contracts.
- [CONTRIBUTING.md](CONTRIBUTING.md): Pre-change requirements, development constraints, and verification procedures.
- [AGENTS.md](AGENTS.md): Mandatory rules, code conventions, and execution boundaries for coding agents.
- [docs/product-inventory-and-selling-options.md](docs/product-inventory-and-selling-options.md): Core domain specifications, selling modes, and inventory calculation formulas.
- [docs/store-management-system-plan.md](docs/store-management-system-plan.md): Architectural roadmap and current implementation status.
- [docs/design-system.md](docs/design-system.md): Tailwind v4 design tokens, POS cockpit layout, and UI component specifications.
- [docs/docker-deployment.md](docs/docker-deployment.md): Container architecture, image publishing, and volume maintenance.
