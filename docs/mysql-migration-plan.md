# MySQL Migration Plan

Instructions for replacing SQLite with a fresh MySQL database in Docker Compose.

> **Optional:** Use this plan only when migrating the backend from SQLite to MySQL. It is not required for the current SQLite setup.

## Objective

Run the backend against MySQL without changing the frontend API or business rules.

## Execute

1. Add `mysql2` to the backend dependencies.
2. Create `backend/src/db/mysql.js` for pooling and transactions.
3. Convert all `*-sqlite-repo.js` files to MySQL adapters.
4. Convert `backend/src/db/schema.sql` to MySQL syntax.
5. Update `app.js`, `server.js`, `seed.js`, and `create-admin.js`.
6. Add a MySQL service, health check, and persistent volume to `compose.yaml`.
7. Replace `DATABASE_PATH` with MySQL environment variables.
8. Update `.env.example` and deployment documentation.
9. Seed the fresh MySQL database.
10. Test sales, inventory, credit, shifts, reports, authentication, and rollback behavior.

## Preserve

- Existing API responses.
- Domain rules and use cases.
- Product uploads in `/data/uploads`.
- Existing SQLite files as backups.

## Verify

- MySQL starts and becomes healthy.
- The backend connects successfully.
- Seeding and admin creation work.
- All backend tests pass.
- Production code no longer requires SQLite.
- No secrets are committed.

## Risks

- SQLite SQL and triggers need MySQL equivalents.
- Barcode uniqueness needs a MySQL-compatible design.
- Existing SQLite records will not be migrated.
