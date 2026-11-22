# Docker deployment

## Services and storage

Compose runs:

- `nginx`: the published frontend and reverse proxy on host port `8080`.
- `backend`: the Express API on the private Compose network at port `3001`.

The `store_data` volume stores `/data/store.db` and `/data/uploads`. Only Nginx publishes a host port. Both services have health checks, and Nginx waits for a healthy backend.

## Build and start

```bash
docker compose up -d --build
docker compose exec backend node src/db/seed.js
```

Open `http://localhost:8080`.

Run seeding while the shop is idle. Cleaning existing data deletes sales and inventory history.

## Published images

CI publishes these images to GitHub Container Registry:

```text
ghcr.io/awenmirasol234/store-management-system-backend
ghcr.io/awenmirasol234/store-management-system-frontend
```

Pull a pinned build and recreate the services:

```bash
docker login ghcr.io
IMAGE_TAG=sha-abc1234 docker compose pull
IMAGE_TAG=sha-abc1234 docker compose up -d
```

`IMAGE_TAG` defaults to `latest`. SHA and release tags are safer for repeatable deployments. Pull requests test and build without publishing; pushes to `main` and version tags publish images.

To roll back, set `IMAGE_TAG` to an earlier tag, then run `docker compose pull` and `docker compose up -d`. The data volume is unchanged.

## Recreating services

Nginx resolves `backend:3001` when it starts. After recreating only the backend, restart Nginx:

```bash
docker compose up -d --force-recreate backend
docker compose restart nginx
```

## Commands

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

`docker compose down -v` deletes `store_data`, including the database and uploaded images. Back up required data before using it.

## Configuration

Compose sets:

```text
PORT=3001
DATABASE_PATH=/data/store.db
UPLOADS_DIR=/data/uploads
```

To change the host port, edit the `8080:80` mapping in `compose.yaml`. The backend remains private inside the Compose network.

## Local development without Docker

From `backend/`, set the required variables:

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
