# streka server

Hono + Drizzle + Postgres API. Local dev:

1. `docker compose up -d` starts Postgres (`DATABASE_URL=postgres://streka:streka@localhost:5432/streka`).
2. `pnpm --filter server db:migrate` applies migrations.
3. `pnpm --filter server dev` runs the server on Node (`:3001`).
4. `pnpm --filter server test` runs the suite against in-process Postgres (pglite); no Docker needed.

`GET /health` pings the database and returns `{ ok, db }`.

Schema (`src/db/schema.ts`) mirrors mobile's SQLite `log_entries` so account sync is a
straight replication problem. Auth and sync endpoints arrive in later slices.
