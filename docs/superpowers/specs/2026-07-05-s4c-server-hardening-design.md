# S4c: Server Launch-Hardening Design

**Status:** approved (2026-07-05)
**Slice:** S4c (follows S4b; see [[web-backend-stack]] roadmap)
**Scope:** `apps/server` only. No wire-contract, client, mobile, or `packages/core` changes.

## Goal

Close the launch-blocking carry-forwards logged from the S2/S3 reviews so the
Hono API is safe to expose to real traffic: a production migration path, brute-force
protection on auth, a stable JSON error surface, session-table hygiene, and a
correctly typed injected `db`.

## Deploy assumptions

These two assumptions shape the simple options chosen below. If either changes,
the design must be revisited before implementation.

1. **Single-instance deploy.** One Node process (one container / VPS). This makes
   in-memory rate-limiting, a boot-time migration step, and an in-process interval
   session sweep all safe. Multiple instances behind a load balancer would require
   a shared rate-limit store, a release-pipeline migrate step, and DB-coordinated
   pruning instead.
2. **Reverse proxy in front.** The server trusts the `X-Forwarded-For` first hop
   for the client IP used in rate-limiting. Without a proxy that sets this header,
   the value is client-spoofable and the limiter is bypassable.

## Items

### 1. Production migrator

**Problem.** Production has no way to apply migrations. `db:migrate` uses the
`drizzle-kit` CLI, which is a `devDependency` and is not in the `tsup` dist. Tests
apply migrations via `drizzle-orm/pglite/migrator` against `./drizzle`, but nothing
runs them against real Postgres in prod.

**Design.**
- Add a `runMigrations(url)` helper that opens a dedicated `postgres` client
  (pool size 1), runs `drizzle-orm/postgres-js/migrator`'s `migrate` against the
  shipped `drizzle/` folder, then closes the client.
- Resolve the migrations folder relative to the module (`new URL('./drizzle', import.meta.url)`)
  so the built artifact is self-contained.
- Add `src/migrate.ts` as a second `tsup` entry: it reads `DATABASE_URL`, calls
  `runMigrations`, logs the outcome, and exits (0 on success, non-zero on failure).
- Configure `tsup` to copy the `drizzle/` folder into `dist/` on build so
  `dist/migrate.js` finds `dist/drizzle/` at runtime.
- Change the `start` script to `node dist/migrate.js && node dist/index.js`, so
  migrations run as an explicit pre-serve step, decoupled from request serving but
  still a single deploy command. This same entrypoint can run standalone in a
  release pipeline if the deploy later becomes multi-instance.

**Testing.** The migration SQL is already proven to apply cleanly by the existing
pglite path in `test-helpers.ts` (same `drizzle/` folder). The new glue
(`runMigrations` + `migrate.ts`) is driver-specific to postgres-js and cannot run
on pglite; it is verified manually against Docker Postgres. Do not fake a pglite
test of the postgres-js migrator.

### 2. Rate-limit signin / signup

**Problem.** `POST /auth/signin` and `/auth/signup` have no throttle; an attacker
can brute-force passwords or mass-create accounts.

**Design.**
- Add `auth/rate-limit.ts`: `createRateLimiter({ limit, windowMs })` returning
  `{ check(key): { allowed: boolean; retryAfterS: number } }`. Fixed-window counter
  in a module-scoped `Map<string, { count: number; resetAt: number }>`. Expired
  buckets are cleaned lazily on access. Time source is injectable (`now = () => Date.now()`)
  so tests use a fake clock.
- Apply as Hono middleware on `/auth/signin` and `/auth/signup`.
- **Key by client IP only, not by email.** Per-email limiting lets an attacker lock
  a legitimate user out (a denial-of-service), so it is deliberately excluded.
  Derive the IP from the `X-Forwarded-For` first hop; if absent, fall back to a
  single shared bucket (fail-closed toward throttling, never crash).
- Limits: signin **10 per 15 minutes**, signup **5 per hour**.
- On limit, return HTTP 429 with body `{ error: 'too many requests' }` and a
  `Retry-After` header (seconds).

**Testing.** Unit-test the limiter with a fake clock: allows up to `limit`, blocks
the next, resets after `windowMs`, isolates distinct keys. Route-level test: the
Nth+1 signin from one IP returns 429.

### 3. App-level onError + notFound + date tightening

**Problem.** There is no `app.onError`, so an unhandled throw yields Hono's default
text 500 rather than the JSON shape clients expect. Concretely: the sync `day`
validator only regex-checks `^\d{4}-\d{2}-\d{2}$`, so `2026-13-45` passes zod and
then throws at the Postgres `date` column, surfacing as an uncaught 500.

**Design.**
- `app.onError((err, c))`: if `err` is a Hono `HTTPException`, return its status
  with `{ error: <message> }` JSON; otherwise `console.error(err)` (server-side only,
  never leak internals to the client) and return `{ error: 'internal error' }` with 500.
- `app.notFound((c))`: return `{ error: 'not found' }` with 404.
- Tighten the sync `day` validator to reject impossible calendar dates
  (`2026-13-45`, `2026-02-30`) as a clean 400, so they never reach the `date` column.
  Keep the format regex and add a refinement that confirms the string is a real
  calendar date (month 01-12, day valid for that month/year).

**Testing.** A route that throws returns a 500 with `{ error: 'internal error' }`;
an `HTTPException` maps to its status + JSON; an unknown path returns 404 JSON;
the `day` validator rejects `2026-13-45` and `2026-02-30` (400) while accepting
`2026-02-28`.

### 4. Prune expired sessions

**Problem.** The `sessions` table accumulates rows whose `expires_at` has passed;
nothing deletes them.

**Design.**
- Add `pruneExpiredSessions(db)` to `auth/sessions.ts`:
  `DELETE FROM sessions WHERE expires_at <= now()`, returning the deleted count.
- Wire in `index.ts`: run one sweep on boot, then `setInterval` every 6 hours.
  Call `.unref()` on the interval handle so it never holds the process open during
  shutdown.

**Testing.** Unit-test `pruneExpiredSessions`: seed one expired and one live
session, prune, assert only the live one remains and the returned count is 1. The
`setInterval` wiring in `index.ts` is thin and is not unit-tested.

### 5. Type the injected db

**Problem.** `db` is typed `PgDatabase<any, any>` everywhere, which discards the
schema generic and disables `db.query` relational inference.

**Design.**
- Define a shared `type AppDb = PgDatabase<any, typeof schema>` (exported from
  `db/client.ts`).
- Replace `PgDatabase<any, any>` with `AppDb` in `app.ts`, `auth/routes.ts`,
  `auth/sessions.ts`, `auth/middleware.ts`, and `sync/routes.ts`.
- This is mechanical. The workspace typecheck (`pnpm -r exec tsc --noEmit`) confirms
  both the postgres-js and pglite drizzle instances remain assignable to `AppDb`.

## Testing gate

- Full `apps/server` vitest suite green.
- `pnpm -r exec tsc --noEmit` exits 0 (covers `.test.ts`; note raw array indexing in
  tests needs `!` under `noUncheckedIndexedAccess`).
- Item 1's postgres-js migrator glue verified manually against Docker Postgres.

## Out of scope (deferred, not this slice)

- Multi-instance concerns (shared rate-limit store, release-pipeline migrate).
- The `PgDatabase<any, ...>` first generic stays `any`; only the schema generic is fixed.
- Landing-page honesty (store buttons, badges) is a separate pre-launch item.
