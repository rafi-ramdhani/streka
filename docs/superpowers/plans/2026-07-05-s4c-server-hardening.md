# S4c Server Launch-Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the launch-blocking server carry-forwards so the Hono API is safe to expose: production migrator, auth rate-limiting, a stable JSON error surface, session pruning, and a correctly typed injected `db`.

**Architecture:** All changes are internal to `apps/server`. Each item is a focused module wired into the existing `createApp(db)` / `index.ts` bootstrap. Tests run against in-process pglite (behavior) and a fake clock (the limiter); the postgres-js migrator glue is packaging-verified.

**Tech Stack:** Hono 4, Drizzle ORM (postgres-js + pglite), zod 4, vitest, tsup, Node 22, pnpm.

## Global Constraints

- Work on the `staging` branch. Do NOT modify `apps/mobile`, `packages/core`, `apps/web`, the DB schema, or the `POST /sync` wire contract. This slice is `apps/server`-internal only.
- Package manager is **pnpm** (never Bun). Runtime is **Node**.
- **No em dashes** (U+2014) anywhere: prose, code comments, commit messages. Use commas, periods, parentheses, or a hyphen. No AI attribution in commit messages.
- Deploy assumption: **single-instance** process, behind a **reverse proxy** that sets `X-Forwarded-For`.
- Rate-limit is keyed by **client IP only, never by email**. Limits: signin **10 per 15 minutes**, signup **5 per hour**.
- Error response bodies are exact JSON: `{ error: 'internal error' }` (500), `{ error: 'not found' }` (404), `{ error: 'too many requests' }` (429, plus a `Retry-After` header in seconds).
- `noUncheckedIndexedAccess` is on: raw array indexing in tests needs a `!` non-null assertion. The workspace typecheck `pnpm -r exec tsc --noEmit` covers `.test.ts` files; vitest/esbuild does not.
- Per-task quick test: `pnpm --filter server exec vitest run <file>`. Full gate: `pnpm --filter server test` green AND `pnpm -r exec tsc --noEmit` exit 0.

---

### Task 1: Type the injected db (`AppDb`)

**Files:**
- Modify: `apps/server/src/db/client.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/auth/routes.ts`
- Modify: `apps/server/src/auth/sessions.ts`
- Modify: `apps/server/src/auth/middleware.ts`
- Modify: `apps/server/src/sync/routes.ts`

**Interfaces:**
- Produces: `export type AppDb = PgDatabase<any, typeof schema>` from `db/client.ts`. Later tasks type `db` parameters as `AppDb`.

This is a type-only refactor. There is no new runtime behavior, so its verification is the typecheck plus the unchanged suite staying green.

- [ ] **Step 1: Add the `AppDb` type to `db/client.ts`**

Add the import and exported type. Full file after edit:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = ReturnType<typeof createDb>;

// The app injects a db typed at this common base so the same code runs against
// postgres.js (dev/prod) and pglite (tests). Fixing the schema generic to
// `typeof schema` (not `any`) keeps `db.query` relational inference working.
export type AppDb = PgDatabase<any, typeof schema>;

export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}
```

- [ ] **Step 2: Replace `PgDatabase<any, any>` with `AppDb` in `app.ts`**

Change the import and the `createApp` signature. In `apps/server/src/app.ts`, replace:

```ts
import type { PgDatabase } from 'drizzle-orm/pg-core';
```
with:
```ts
import type { AppDb } from './db/client';
```
and replace the signature line `export function createApp(db: PgDatabase<any, any>) {` with:
```ts
export function createApp(db: AppDb) {
```

- [ ] **Step 3: Replace `PgDatabase<any, any>` with `AppDb` in the auth and sync modules**

In each of `apps/server/src/auth/routes.ts`, `apps/server/src/auth/sessions.ts`, `apps/server/src/auth/middleware.ts`, and `apps/server/src/sync/routes.ts`:
- Replace the `import type { PgDatabase } from 'drizzle-orm/pg-core';` line with `import type { AppDb } from '../db/client';`.
- Replace every occurrence of `PgDatabase<any, any>` with `AppDb`.

(In `auth/routes.ts` this is the `createAuthRoutes(db: PgDatabase<any, any>)` parameter; in `auth/sessions.ts` the three functions `createSession`, `validateSession`, `revokeSession`; in `auth/middleware.ts` the `requireAuth` parameter; in `sync/routes.ts` the `createSyncRoutes` parameter.)

- [ ] **Step 4: Run the typecheck and the full server suite**

Run: `pnpm -r exec tsc --noEmit`
Expected: exit 0 (both the postgres-js and pglite drizzle instances are assignable to `AppDb`).

Run: `pnpm --filter server test`
Expected: PASS, same count as before (no behavior changed).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src
git commit -m "refactor(server): type the injected db as AppDb for db.query inference"
```

---

### Task 2: App-level onError and notFound

**Files:**
- Create: `apps/server/src/errors.ts`
- Create: `apps/server/src/errors.test.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/app.test.ts`

**Interfaces:**
- Produces: `export function installErrorHandlers(app: Hono<any>): void` from `errors.ts`. `createApp` calls it so every route shares one JSON error surface.

- [ ] **Step 1: Write the failing test for the error handlers**

Create `apps/server/src/errors.test.ts`:

```ts
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { expect, test, vi } from 'vitest';
import { installErrorHandlers } from './errors';

function makeApp() {
  const app = new Hono();
  installErrorHandlers(app);
  app.get('/boom', () => {
    throw new Error('kaboom');
  });
  app.get('/teapot', () => {
    throw new HTTPException(418, { message: "i'm a teapot" });
  });
  return app;
}

test('an unhandled throw becomes a JSON 500 that does not leak the message', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const res = await makeApp().request('/boom');
  expect(res.status).toBe(500);
  expect(await res.json()).toEqual({ error: 'internal error' });
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});

test('an HTTPException maps to its status and message as JSON', async () => {
  const res = await makeApp().request('/teapot');
  expect(res.status).toBe(418);
  expect(await res.json()).toEqual({ error: "i'm a teapot" });
});

test('an unknown route returns JSON 404', async () => {
  const res = await makeApp().request('/nope');
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'not found' });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter server exec vitest run src/errors.test.ts`
Expected: FAIL (cannot find module `./errors`).

- [ ] **Step 3: Implement `errors.ts`**

Create `apps/server/src/errors.ts`:

```ts
import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

// One JSON error surface for the whole app. A thrown HTTPException carries its
// own status and message; anything else is an unexpected fault, logged
// server-side and returned as an opaque 500 so internals never reach the client.
export function installErrorHandlers(app: Hono<any>): void {
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error(err);
    return c.json({ error: 'internal error' }, 500);
  });

  app.notFound((c) => c.json({ error: 'not found' }, 404));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec vitest run src/errors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the handlers into `createApp` and add an integration test**

In `apps/server/src/app.ts`, add the import near the other imports:

```ts
import { installErrorHandlers } from './errors';
```

and call it immediately after the app is constructed, so the block reads:

```ts
export function createApp(db: AppDb) {
  const app = new Hono();
  installErrorHandlers(app);

  app.get('/health', async (c) => {
```

Then add this test to the end of `apps/server/src/app.test.ts`:

```ts
test('an unknown route on the real app returns JSON 404', async () => {
  const res = await app.request('/no-such-path');
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'not found' });
});
```

- [ ] **Step 6: Run both affected files**

Run: `pnpm --filter server exec vitest run src/errors.test.ts src/app.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/errors.ts apps/server/src/errors.test.ts apps/server/src/app.ts apps/server/src/app.test.ts
git commit -m "feat(server): app-level onError and notFound JSON error surface"
```

---

### Task 3: Reject impossible calendar dates in sync validation

**Files:**
- Modify: `apps/server/src/sync/validation.ts`
- Modify: `apps/server/src/sync/validation.test.ts`

**Interfaces:**
- Produces: a tightened `day` field on `pushEntrySchema`. No exported symbol changes; `SyncRequest` shape is unchanged.

- [ ] **Step 1: Write the failing test**

Add to `apps/server/src/sync/validation.test.ts` (append; keep existing imports, and add `syncRequestSchema` to the import from `./validation` if it is not already imported):

```ts
const validEntry = {
  id: '00000000-0000-4000-8000-000000000000',
  ts: 1,
  day: '2026-02-28',
  tracker: 'meals',
  source: 'manual',
  kind: 'meal',
  payload: { kind: 'meal' },
  deleted: false,
  updatedAt: 1,
};
const withDay = (day: string) => ({ cursor: 0, entries: [{ ...validEntry, day }], settings: [] });

test('rejects an impossible calendar date', () => {
  expect(syncRequestSchema.safeParse(withDay('2026-13-45')).success).toBe(false);
  expect(syncRequestSchema.safeParse(withDay('2026-02-30')).success).toBe(false);
  expect(syncRequestSchema.safeParse(withDay('2026-00-10')).success).toBe(false);
});

test('accepts a real calendar date, including a leap day', () => {
  expect(syncRequestSchema.safeParse(withDay('2026-02-28')).success).toBe(true);
  expect(syncRequestSchema.safeParse(withDay('2024-02-29')).success).toBe(true);
});

test('rejects Feb 29 in a non-leap year', () => {
  expect(syncRequestSchema.safeParse(withDay('2026-02-29')).success).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter server exec vitest run src/sync/validation.test.ts`
Expected: FAIL (the regex-only `day` accepts `2026-13-45`, `2026-02-30`, etc.).

- [ ] **Step 3: Tighten the `day` validator**

In `apps/server/src/sync/validation.ts`, add this helper above `pushEntrySchema`:

```ts
// A real YYYY-MM-DD calendar date. The regex alone accepts nonsense like
// 2026-13-45 or 2026-02-30, which then throws at the Postgres `date` column;
// this also verifies the month and the day-of-month for that month and year
// (leap years included), so a bad date is a clean 400 instead of a 500.
function isRealCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}
```

Then change the `day` field in `pushEntrySchema` from:

```ts
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
```
to:
```ts
  day: z.string().refine(isRealCalendarDate, { message: 'invalid calendar date' }),
```

(`Date.UTC(year, month, 0)` uses month as the 1-based value with day 0, which resolves to the last day of that month, giving its length. `getUTCDate()` avoids any local-timezone shift.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec vitest run src/sync/validation.test.ts`
Expected: PASS (existing tests plus the three new ones).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/sync/validation.ts apps/server/src/sync/validation.test.ts
git commit -m "fix(server): reject impossible calendar dates in sync validation"
```

---

### Task 4: Rate-limit signin and signup

**Files:**
- Create: `apps/server/src/auth/rate-limit.ts`
- Create: `apps/server/src/auth/rate-limit.test.ts`
- Modify: `apps/server/src/auth/routes.ts`
- Modify: `apps/server/src/auth/routes.test.ts`

**Interfaces:**
- Produces from `rate-limit.ts`:
  - `type RateLimiter = { check(key: string): { allowed: boolean; retryAfterS: number } }`
  - `createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter`
  - `rateLimitMiddleware(limiter: RateLimiter): MiddlewareHandler` (keys by `X-Forwarded-For` first hop, falls back to a shared bucket).
- Consumes: `createAuthRoutes` (Task 1 typed it `db: AppDb`).

- [ ] **Step 1: Write the failing unit test for the limiter**

Create `apps/server/src/auth/rate-limit.test.ts`:

```ts
import { expect, test } from 'vitest';
import { createRateLimiter } from './rate-limit';

test('allows up to the limit, then blocks, then resets after the window', () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
  expect(rl.check('a').allowed).toBe(true);
  expect(rl.check('a').allowed).toBe(true);
  const blocked = rl.check('a');
  expect(blocked.allowed).toBe(false);
  expect(blocked.retryAfterS).toBe(1);
  t = 1000;
  expect(rl.check('a').allowed).toBe(true);
});

test('tracks distinct keys independently', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
  expect(rl.check('a').allowed).toBe(true);
  expect(rl.check('b').allowed).toBe(true);
  expect(rl.check('a').allowed).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter server exec vitest run src/auth/rate-limit.test.ts`
Expected: FAIL (cannot find module `./rate-limit`).

- [ ] **Step 3: Implement `rate-limit.ts`**

Create `apps/server/src/auth/rate-limit.ts`:

```ts
import type { Context, MiddlewareHandler } from 'hono';

export type RateLimiter = {
  check(key: string): { allowed: boolean; retryAfterS: number };
};

// In-memory fixed-window limiter. Each limiter owns its own bucket map (closure
// state, not module-global) so a fresh app in tests starts clean. Expired
// buckets are reset lazily when their key is next seen. Single-instance only:
// the counts live in this process and are not shared across instances.
export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const { limit, windowMs, now = () => Date.now() } = opts;
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key) {
      const t = now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        buckets.set(key, { count: 1, resetAt: t + windowMs });
        return { allowed: true, retryAfterS: 0 };
      }
      if (bucket.count < limit) {
        bucket.count += 1;
        return { allowed: true, retryAfterS: 0 };
      }
      return { allowed: false, retryAfterS: Math.ceil((bucket.resetAt - t) / 1000) };
    },
  };
}

// Client IP from the reverse proxy's X-Forwarded-For first hop. Without a proxy
// the header is absent and everyone shares one bucket (fail toward throttling,
// never crash).
function clientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    if (first && first.trim()) return first.trim();
  }
  return 'shared';
}

export function rateLimitMiddleware(limiter: RateLimiter): MiddlewareHandler {
  return async (c, next) => {
    const { allowed, retryAfterS } = limiter.check(clientIp(c));
    if (!allowed) {
      c.header('Retry-After', String(retryAfterS));
      return c.json({ error: 'too many requests' }, 429);
    }
    await next();
  };
}
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `pnpm --filter server exec vitest run src/auth/rate-limit.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the limiters into the auth routes**

In `apps/server/src/auth/routes.ts`, add the import near the other local imports:

```ts
import { createRateLimiter, rateLimitMiddleware } from './rate-limit';
```

Inside `createAuthRoutes`, immediately after `const app = new Hono<{ Variables: { userId: string } }>();`, create the two limiters:

```ts
  // Per-IP brute-force protection. Single-instance in-memory counters.
  const signinLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });
  const signupLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });
```

Then add the middleware as the second argument of the two route registrations. Change:

```ts
  app.post('/signup', async (c) => {
```
to:
```ts
  app.post('/signup', rateLimitMiddleware(signupLimiter), async (c) => {
```

and change:

```ts
  app.post('/signin', async (c) => {
```
to:
```ts
  app.post('/signin', rateLimitMiddleware(signinLimiter), async (c) => {
```

- [ ] **Step 6: Add a route-level rate-limit test**

Append to `apps/server/src/auth/routes.test.ts`:

```ts
test('signup is rate-limited per IP after 5 attempts in the window', async () => {
  const headers = { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' };
  const attempt = (n: number) =>
    app.request('/auth/signup', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: `rl-${n}@example.com`, password: 'hunter2horse' }),
    });

  for (let n = 0; n < 5; n++) {
    const res = await attempt(n);
    expect(res.status).toBe(201);
  }
  const blocked = await attempt(5);
  expect(blocked.status).toBe(429);
  expect(await blocked.json()).toEqual({ error: 'too many requests' });
  expect(blocked.headers.get('retry-after')).toBeTruthy();
});
```

- [ ] **Step 7: Run the affected files**

Run: `pnpm --filter server exec vitest run src/auth/rate-limit.test.ts src/auth/routes.test.ts`
Expected: PASS (existing auth-route tests still pass; each `beforeEach` builds a fresh app with fresh limiters, and the existing tests make far fewer than the limit within one test).

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/auth/rate-limit.ts apps/server/src/auth/rate-limit.test.ts apps/server/src/auth/routes.ts apps/server/src/auth/routes.test.ts
git commit -m "feat(server): per-IP rate-limit on signin and signup"
```

---

### Task 5: Prune expired sessions

**Files:**
- Modify: `apps/server/src/auth/sessions.ts`
- Modify: `apps/server/src/auth/sessions.test.ts`
- Modify: `apps/server/src/index.ts`

**Interfaces:**
- Produces: `export async function pruneExpiredSessions(db: AppDb): Promise<number>` from `sessions.ts` (returns the number of rows deleted).
- Consumes: `AppDb` (Task 1).

- [ ] **Step 1: Write the failing test**

Append to `apps/server/src/auth/sessions.test.ts` (add `pruneExpiredSessions` to the import from `./sessions`):

```ts
test('pruneExpiredSessions deletes only expired sessions and returns the count', async () => {
  const u = await makeUser();
  const { token: live } = await createSession(db, u.id);
  const { token: dead } = await createSession(db, u.id);
  await db
    .update(sessions)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(sessions.tokenHash, hashToken(dead)));

  const removed = await pruneExpiredSessions(db);

  expect(removed).toBe(1);
  expect(await validateSession(db, live)).not.toBeNull();
  expect(await validateSession(db, dead)).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter server exec vitest run src/auth/sessions.test.ts`
Expected: FAIL (`pruneExpiredSessions` is not exported).

- [ ] **Step 3: Implement `pruneExpiredSessions`**

In `apps/server/src/auth/sessions.ts`, change the drizzle import to include `lte`:

```ts
import { eq, lte } from 'drizzle-orm';
```

The db type is already imported as `AppDb` and used on the existing functions (Task 1 did that). Do NOT add a second import. Append this function:

```ts
// Housekeeping: drop sessions whose expiry has passed so the table does not grow
// without bound. Returns how many rows were removed. Called on boot and on an
// interval from index.ts.
export async function pruneExpiredSessions(db: AppDb): Promise<number> {
  const removed = await db
    .delete(sessions)
    .where(lte(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return removed.length;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server exec vitest run src/auth/sessions.test.ts`
Expected: PASS (existing session tests plus the new one).

- [ ] **Step 5: Wire the sweep into `index.ts`**

Replace the body of `apps/server/src/index.ts` with:

```ts
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { pruneExpiredSessions } from './auth/sessions';
import { createDb } from './db/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = createDb(url);
const app = createApp(db);
const port = Number(process.env.PORT ?? 3001);

// Session-table housekeeping: sweep once on boot, then every 6 hours. unref() so
// the timer never keeps the process alive during shutdown.
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const sweep = () =>
  pruneExpiredSessions(db).catch((err) => console.error('session prune failed', err));
sweep();
setInterval(sweep, SIX_HOURS_MS).unref();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`streka server listening on :${info.port}`);
});
```

- [ ] **Step 6: Typecheck (index.ts has no unit test; the typecheck is its gate)**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/auth/sessions.ts apps/server/src/auth/sessions.test.ts apps/server/src/index.ts
git commit -m "feat(server): prune expired sessions on boot and every 6h"
```

---

### Task 6: Production migrator

**Files:**
- Create: `apps/server/src/migrate.ts`
- Modify: `apps/server/tsup.config.ts`
- Modify: `apps/server/package.json`

**Interfaces:**
- Produces: a `dist/migrate.js` entrypoint and a `dist/drizzle/` copy of the migration SQL. The `start` script runs migrations, then serves.

The postgres-js migrator cannot run on pglite, so there is no unit test for the migration run itself (the migration SQL is already proven by the pglite path in `test-helpers.ts`). This task's automated verification is that the build produces a self-contained, correctly wired artifact; the actual migration run is verified manually against Docker Postgres.

- [ ] **Step 1: Create the migrate entrypoint**

Create `apps/server/src/migrate.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Standalone migration runner. `start` runs `node dist/migrate.js` before the
// server so production applies pending migrations without the drizzle-kit CLI
// (which is a devDependency and not in the dist). The drizzle/ folder is copied
// next to this file at build time, so it resolves relative to the module.
async function runMigrations(url: string): Promise<void> {
  const client = postgres(url, { max: 1 });
  try {
    const db = drizzle(client);
    const migrationsFolder = fileURLToPath(new URL('./drizzle', import.meta.url));
    await migrate(db, { migrationsFolder });
  } finally {
    await client.end();
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

runMigrations(url)
  .then(() => {
    console.log('migrations applied');
    process.exit(0);
  })
  .catch((err) => {
    console.error('migration failed', err);
    process.exit(1);
  });
```

- [ ] **Step 2: Add the entry and the drizzle copy to `tsup.config.ts`**

Replace `apps/server/tsup.config.ts` with:

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/migrate.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  // Ship the migration SQL next to the built files so dist/migrate.js resolves
  // ./drizzle at runtime. `clean` wipes dist first, so this runs after.
  onSuccess: 'cp -R drizzle dist/drizzle',
});
```

- [ ] **Step 3: Point the `start` script at migrate-then-serve**

In `apps/server/package.json`, change the `start` script from:

```json
    "start": "node dist/index.js",
```
to:
```json
    "start": "node dist/migrate.js && node dist/index.js",
```

- [ ] **Step 4: Build and verify the artifact is self-contained**

Run: `pnpm --filter server build`
Expected: build succeeds.

Run: `ls apps/server/dist/migrate.js apps/server/dist/index.js apps/server/dist/drizzle`
Expected: `dist/migrate.js` and `dist/index.js` exist, and `dist/drizzle` lists the `*.sql` files and the `meta` folder.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter server exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/migrate.ts apps/server/tsup.config.ts apps/server/package.json
git commit -m "feat(server): production migrator entrypoint bundled with migrations"
```

- [ ] **Step 7: Manual verification note (not automated)**

Against a Docker Postgres (`DATABASE_URL=postgres://...`), run `node apps/server/dist/migrate.js` on an empty database and confirm it exits 0 and creates the `users`, `sessions`, `log_entries`, and `settings` tables. Record the result in the progress ledger. This is the one step the pglite tests cannot cover.

---

## Final gate (after all tasks)

- Run: `pnpm --filter server test` -> all green.
- Run: `pnpm -r exec tsc --noEmit` -> exit 0.
- The manual Docker-Postgres migrator check (Task 6, Step 7) is recorded.
