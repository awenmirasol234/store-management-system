# Docker Deployment Guide

Tactical deployment instructions for containerized execution with Docker Compose.

---

## 1. Architecture & Port Mapping

Docker Compose orchestrates two container services and two persistent volumes:

```
 [ Host: Ports 8080 and 8443 ]
         ↓
   [ caddy (HTTPS, Frontend Static Assets & Reverse Proxy) ]
        ↓ (Private Compose Network: backend:3001)
  [ backend (Node.js Express API) ]
        ↓
  [ store_data Volume: /data/store.db & /data/uploads ]
```

- **`caddy`**: Provides local HTTPS for `store.home.arpa`, serves the Vite production build, and proxies `/api` and `/uploads` to `backend:3001`. Caddy uses its internal CA and persists certificates in `caddy_data`.
- **`backend`**: Node.js Express API listening on private port `3001`. Does not expose ports directly to the host.
- **`caddy_data`**: Named volume mounted to Caddy's `/data` directory for local CA and certificate data.
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

### Step 3: Verify Running Services

```bash
docker compose ps
```

Both containers must report `healthy` status. Resolve `store.home.arpa` to the Docker host and open `https://store.home.arpa:8443` in a browser.

### Trust Caddy's Certificate on Windows

Run these commands in PowerShell from the project root:

```powershell
$certPath = Join-Path $env:TEMP "store-caddy-root.crt"
docker cp store-management-system-caddy:/data/caddy/pki/authorities/local/root.crt $certPath
certutil -user -addstore Root $certPath
```

This trusts the local Caddy certificate for your Windows user. Restart the browser afterward. Only trust a certificate from your own app.

---

## 3. Production Deployment with Published Images

CI publishes container images to GitHub Container Registry (GHCR):
- `ghcr.io/awenmirasol234/store-management-system-backend`
- `ghcr.io/awenmirasol234/store-management-system-frontend`

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

## 4. Recreating Services & Upstream Resolution

Caddy resolves `backend:3001` through the Compose network. When recreating only the backend container, recreate Caddy if it does not recover the upstream connection:

```bash
docker compose up -d --force-recreate backend
docker compose restart caddy
```

---

## 5. Routine Management Commands

- **Stream Backend Logs**:
  ```bash
  docker compose logs -f backend
  ```
- **Stream Caddy Proxy Logs**:
  ```bash
  docker compose logs -f caddy
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

## 6. Container Environment Variables

Compose passes the following defaults to the backend service:

| Variable | Container Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Internal HTTP listening port |
| `DATABASE_PATH` | `/data/store.db` | Absolute SQLite database file path on `store_data` volume |
| `UPLOADS_DIR` | `/data/uploads` | Directory for product image attachments |
| `NODE_ENV` | `production` | Node.js production runtime optimization |
