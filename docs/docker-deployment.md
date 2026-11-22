# Docker deployment

## Start

```bash
docker compose up -d --build
docker compose exec backend node src/db/seed.js
```

Open `http://localhost:8080`.

Run seeding while the shop is idle. `--clean` deletes existing sales and inventory history first.

## Recreating services

Nginx resolves `backend:3001` once at startup. After recreating only the backend (`docker compose up -d --force-recreate backend`), run `docker compose restart nginx` to avoid a 502 from the old address.

## Commands

```bash
docker compose ps
docker compose logs -f backend
docker compose down
docker compose down -v
```

`down -v` deletes the `store_data` volume, including the database and uploaded images.

## Configuration

All values are fixed in `compose.yaml`. Change the host port by editing `8080:80`. The backend listens on the internal port `3001` and is reached only as `backend:3001` from Nginx.

Only the Nginx host port is published. The backend has no host port.

## Local development without Docker

`server.js` requires these variables. From `backend/`:

```powershell
$env:PORT="3001"; $env:DATABASE_PATH="./data/store.db"; $env:UPLOADS_DIR="./uploads"; npm start
```

```bash
PORT=3001 DATABASE_PATH=./data/store.db UPLOADS_DIR=./uploads npm start
```

## Published images

GitHub Actions runs tests for both apps, then builds both images. It publishes them to GitHub Container Registry on pushes to `main` and on `v*` tags:

- `ghcr.io/awenmirasol234/store-management-system-backend`
- `ghcr.io/awenmirasol234/store-management-system-frontend`

Every published image is tagged with `sha-<short-sha>`. Pushes to `main` also tag `latest`. Version tags such as `v1.2.3` also tag `1.2.3` and `1.2`. Pull requests run tests and build both images without publishing.

Authentication uses the workflow `GITHUB_TOKEN`, so no extra repository secrets are required. The first published package is private until its visibility is changed to public in the GitHub package settings.
