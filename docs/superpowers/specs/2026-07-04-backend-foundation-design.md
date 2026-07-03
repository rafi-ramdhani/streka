# Backend foundation (S1): apps/server, Postgres, Drizzle schema

Date: 2026-07-04. Status: design for review. Slice S1 of the web-first backend pivot.

## Context

The web surface is moving off its localStorage demo to a real Postgres-backed product with
accounts and account sync. The old "honest web reconcile" frontend spec (2026-07-03) is
shelved. The full effort is decomposed into slices, each with its own spec and plan:

| Slice | Scope | Depends on |
|------|-------|-----------|
| **S1 (this doc)** | `apps/server` Hono skeleton, Docker Postgres, Drizzle schema + migrations, `/health` | - |
| S2 | Auth: sign-up / sign-in, sessions, auth middleware | S1 |
| S3 | Sync API: authed push/pull with `updated_at` last-write-wins merge | S1, S2 |
| S4 | Migrate `apps/web` to Next.js: SEO landing + authed dashboard on the API | S2, S3 |
| Later | Mobile sync transport (wire mobile's existing outbox to `apps/server`) | S3 |

S1 is the bedrock everything else sits on, and it derisks the toolchain (Hono + Drizzle +
Postgres inside the existing pnpm monorepo). It deliberately ships **no auth and no sync
endpoints**; it proves the server boots, the schema migrates, and a log row round-trips.

## Locked decisions

- **Package manager**: pnpm workspaces (unchanged). Bun was considered and dropped to avoid
  re-locking the stable installed mobile build.
- **Task orchestration**: Turborepo, layered on top of pnpm. `build`/`test`/`dev`
  pipelines with `dependsOn` ordering and caching (`typecheck` stays on the existing pnpm
  form, since packages have no per-package `typecheck` script). Adopted now (not deferred)
  since the task graph grows with `apps/server` and the Next.js `apps/web`.
- **Runtime**: Node, via `@hono/node-server`.
- **API framework**: Hono.
- **DB**: our own managed Postgres. Local dev via Docker Postgres.
- **ORM / migrations**: Drizzle + drizzle-kit. Driver: `postgres.js`.
- **Tests**: vitest.
- **Topology**: standalone `apps/server`, shared by web now and mobile later. `apps/web` and
  `apps/mobile` are untouched in S1.
- **Schema parity**: the Postgres schema mirrors the mobile SQLite schema in
  `packages/core/src/schema.ts` so account sync is a straight replication problem. Server
  deltas: add `user_id`, drop the local-only `synced_at`, `payload` becomes `jsonb`,
  `deleted` becomes `boolean`.

## Deliverables

1. New `apps/server` pnpm workspace: `package.json`, `tsconfig.json`, source layout, scripts
   (`dev`, `build`, `start`, `test`, `db:generate`, `db:migrate`).
2. Hono app split into a testable `app.ts` (routes) and a thin `index.ts` (starts the Node
   server), so tests exercise the app without binding a port.
3. `GET /health`: runs `select 1` and returns `{ ok: true, db: "up" }` (or 503 on failure).
4. Drizzle schema (`users`, `log_entries`, `settings`), a generated initial migration, and
   `drizzle.config.ts`.
5. DB connection module reading `DATABASE_URL`, using `postgres.js` + `drizzle-orm/postgres-js`.
6. `docker-compose.yml` for local Postgres (16), plus `.env.example` documenting
   `DATABASE_URL`.
7. Reuse `@streka/core` **types only** (`TrackerId`, `LogSource`, `LogData`, `LogEntry`) so
   the API and columns stay in lockstep with the shared model. Type-only imports, so no
   runtime coupling to core's zustand store.
8. Tests: `/health` returns 200; migrations apply cleanly; a `log_entries` insert/select
   round-trips through Drizzle. Tests run against an in-process Postgres (pglite) so CI needs
   no Docker; the Docker Postgres is for real local dev.
9. Root **`turbo.json`** with `build`, `test`, `dev` pipelines (`build` uses
   `dependsOn: ["^build"]` and outputs `dist/**`; `test` depends on upstream builds; `dev`
   is long-running and uncached). `turbo` added as a root dev dependency, and the root
   `package.json` `build`/`dev`/`test` scripts delegate to `turbo run ...`. `typecheck`
   stays on the existing `pnpm --filter '!landing' -r exec tsc --noEmit` form. `apps/server`'s
   package scripts become the tasks Turbo drives; mobile's build is untouched.

## Schema (Postgres via Drizzle)

Mirrors `core/schema.ts` with the server deltas noted above.

### users (minimal in S1; auth columns fleshed out in S2)
- `id uuid primary key default gen_random_uuid()`
- `email text not null unique`
- `password_hash text not null`
- `created_at timestamptz not null default now()`

### log_entries (per-user, append-only event table)
- `id text primary key` (client-generated UUID; `text` to mirror the client/SQLite `id` and
  accept the client's UUID verbatim for replication)
- `user_id uuid not null references users(id) on delete cascade`
- `ts bigint not null` (epoch ms)
- `day date not null` (serialized to/from `YYYY-MM-DD` at the API boundary)
- `tracker text not null`, `source text not null`, `kind text not null`
- `payload jsonb not null`
- `deleted boolean not null default false`
- `updated_at bigint not null` (drives last-write-wins in S3)
- Indexes: `(user_id, day)` and `(user_id, updated_at)` (the latter for pull-since queries)

### settings (per-user key/value, mirrors core `kv`)
- `user_id uuid not null references users(id) on delete cascade`
- `key text not null`
- `value jsonb not null`
- `updated_at bigint not null`
- Primary key `(user_id, key)`

No `synced_at` server-side (local-only outbox marker). The merge/LWW upsert itself lands in
S3; S1 only establishes the tables and confirms a round-trip.

## Local dev workflow

1. `docker compose up -d` starts Postgres and exposes `DATABASE_URL`.
2. `pnpm --filter server db:migrate` applies migrations.
3. `pnpm --filter server dev` runs the server (tsx watch) on Node.
4. `pnpm --filter server test` runs vitest against pglite.

## Directory layout

Repo root gains `turbo.json` and updated root `package.json` scripts (`turbo run ...`). New app:

```
apps/server/
  package.json
  tsconfig.json
  drizzle.config.ts
  docker-compose.yml
  .env.example
  drizzle/                 generated migrations
  src/
    index.ts               starts the Node server
    app.ts                 builds the Hono app (routes), exported for tests
    db/
      client.ts            postgres.js + drizzle connection
      schema.ts            Drizzle table definitions
    routes/
      health.ts
    app.test.ts
    db/schema.test.ts
```

## Out of scope for S1

Auth logic and endpoints (S2); sync push/pull and the LWW merge (S3); the Next.js web app
and retiring `apps/landing` + Vite (S4); production hosting/deploy; any change to
`apps/mobile` or `packages/core`.

## Open notes

- `id` is `text` for exact client parity; `uuid` is a valid alternative if we prefer native
  UUID storage, at the cost of coercing on ingest. Chosen: `text`.
- `day` stored as `date` (cleaner than SQLite's `TEXT`); the API always serializes
  `YYYY-MM-DD`, so replication parity holds at the wire level.
- pglite for tests keeps CI Docker-free; if any behavior diverges from real Postgres we fall
  back to a Dockerized test database.
