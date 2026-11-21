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
