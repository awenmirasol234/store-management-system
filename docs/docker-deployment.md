# Docker Deployment Guide

Tactical deployment instructions for containerized execution with Docker Compose.

Use this guide before changing or operating the Docker deployment. Confirm the target environment and data-preservation requirements before any operation that can remove volumes or stored data.

---

## 1. Architecture & Port Mapping

Docker Compose orchestrates two container services and one persistent volume:

```
[ Host: Port 8080 ]
        ↓
  [ nginx (Frontend Static Assets & Reverse Proxy) ]
        ↓ (Private Compose Network: backend:3001)
  [ backend (Node.js Express API) ]
        ↓
  [ store_data Volume: /data/store.db & /data/uploads ]
```

- **`nginx`**: Serves the Vite production build and proxies `/api` and `/uploads` to `backend:3001`. Publicly exposed on host port `8080`.
- **`backend`**: Node.js Express API listening on private port `3001`. Does not expose ports directly to the host.
- **`store_data`**: Named volume mounted to `/data` across containers, storing `store.db` and uploaded images in `/data/uploads`.

---

## 2. Initial Setup & Startup

### Step 1: Build and Launch Containers

Run from the project root:

```bash
docker compose up -d --build
```

### Step 2: Initialize Database and Seed Data

Execute the seed script inside the running backend container:

```bash
docker compose exec backend node src/db/seed.js
```

This seeds base units and product categories only. Add `--demo` when a demo
catalog and sample sales are needed:

```bash
docker compose exec backend node src/db/seed.js --demo
```

### Step 3: Verify Running Services

```bash
docker compose ps
```

Both containers must report `healthy` status. Open `http://localhost:8080` in a browser.

---

## 3. Creating Another Owner Account

Run the interactive account tool in the backend container. Use `-it` so it can securely prompt for the account details and hidden PIN:

```bash
docker compose exec -it backend node create-admin.js
```

The script creates an `OWNER` account in the configured database. The new owner can sign in through the app with the username and PIN entered at the prompt.

---

## 4. Production Deployment with Published Images

CI publishes container images to GitHub Container Registry (GHCR):
- `ghcr.io/awenmirasol234/store-management-system-backend`
- `ghcr.io/awenmirasol234/store-management-system-frontend`

### Automatic Deployment

When push-triggered CI is enabled and succeeds for `main`, the CD workflow
deploys the images on a self-hosted GitHub Actions runner. CI is currently
manual-only, so this deployment is paused as well.

1. Install Docker Engine and the Docker Compose plugin on the runner.
2. Keep the deployment checkout containing `compose.yaml` at
   `/opt/projects/store-management-system` on the runner.
3. Ensure the runner can access the Docker daemon.

The deployment path is defined directly in the workflow. Do not add it to `.env`
files. The workflow runs:

```bash
docker compose pull
docker compose up -d --remove-orphans
```

### Deploying a Specific Release / Tag

1. Authenticate to GHCR:
   ```bash
   docker login ghcr.io
   ```
2. Pull pinned images and recreate services:
   ```bash
   IMAGE_TAG=sha-abc1234 docker compose pull
   IMAGE_TAG=sha-abc1234 docker compose up -d
   ```

### Rolling Back to a Previous Build

Set `IMAGE_TAG` to the desired earlier SHA or release tag and re-run:

```bash
IMAGE_TAG=sha-previous docker compose pull
IMAGE_TAG=sha-previous docker compose up -d
```
*Note: SQLite data in `store_data` is preserved during rollbacks.*

---

## 5. Recreating Services & Upstream Resolution

Nginx resolves `backend:3001` at container startup. When recreating only the backend container, always restart Nginx to refresh DNS resolution:

```bash
docker compose up -d --force-recreate backend
docker compose restart nginx
```

---

## 6. Routine Management Commands

- **Stream Backend Logs**:
  ```bash
  docker compose logs -f backend
  ```
- **Stream Nginx Proxy Logs**:
  ```bash
  docker compose logs -f nginx
  ```
- **Stop Services (Preserve Data)**:
  ```bash
  docker compose down
  ```
- **Permanently Wipe Data and Volumes**:
  ```bash
  docker compose down -v
  ```
  > [!CAUTION]
  > `docker compose down -v` permanently deletes the `store_data` volume containing the SQLite database and all uploaded product images. Never run this on active systems.

---

## 7. Container Environment Variables

The root `compose.yaml` passes these required values to the backend:

| Variable | Container Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Internal HTTP listening port |
| `DATABASE_PATH` | `/data/store.db` | Absolute SQLite database file path on the `store_data` volume |
| `UPLOADS_DIR` | `/data/uploads` | Directory for product image attachments |

The backend also supports these optional environment variables. Compose does
not set them by default, so the application defaults apply unless they are
added to the service environment:

| Variable | Application Default | Description |
| :--- | :--- | :--- |
| `ENFORCE_AUTH` | `true` | Set to `false` only for intentional local development access |
| `STORE_OPERATION_MODE` | `single_user` | Use `multi_user` to enable staff management and roles |
| `ENABLE_CASH_DRAWER` | `false` | Enables shifts, cash movements, and drawer reconciliation |
| `ENABLE_CUSTOMER_CREDIT` | `true` | Enables customer credit and payment features |
| `ENABLE_SELLING_OPTIONS` | `true` | Enables packs, bundles, and other selling options |
| `ENABLE_CUSTOM_AMOUNT_SALES` | `true` | Enables custom peso or “tingi” sales |
| `ENABLE_PRODUCT_CATALOG_EXTRAS` | `true` | Enables categories, suppliers, and related catalog extras |
| `ENABLE_PRODUCT_IMAGES` | `true` | Enables product image uploads and remote image imports |
| `ENABLE_DATABASE_BACKUP` | `true` | Enables the database backup endpoint |
