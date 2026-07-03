# Backend Foundation (S1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/server`, a Node + Hono service with a Drizzle-managed Postgres schema (`users`, `log_entries`, `settings`) mirroring mobile's SQLite schema, a `/health` endpoint, and CI-safe tests, plus Turborepo task orchestration for the monorepo.

**Architecture:** A standalone `apps/server` workspace built on Node + Hono, with a dependency-injected Drizzle database so the same Hono app runs against real Postgres (via `postgres.js`) in dev/prod and against in-process Postgres (pglite) in tests. The Postgres schema mirrors `packages/core/src/schema.ts` with three deltas: add `user_id`, drop the local-only `synced_at`, and use `jsonb`/`boolean` column types. No auth and no sync endpoints in this slice.

**Tech Stack:** pnpm workspaces + Turborepo, Node 22, Hono + `@hono/node-server`, Drizzle ORM + drizzle-kit, `postgres.js` (dev/prod driver), `@electric-sql/pglite` (test driver), vitest, tsup (build), Docker Postgres (local dev).

## Global Constraints

- Package manager stays **pnpm** (never migrate to Bun in this slice). Node **22**, pnpm **11**.
- All packages are ESM (`"type": "module"`); strict TypeScript; `moduleResolution: bundler` inherited from `tsconfig.base.json`.
- **Do not modify `apps/mobile` or `packages/core`.** Reuse `@streka/core` via **type-only imports** (`import type { ... }`); never import its runtime (zustand store).
- Postgres schema mirrors `packages/core/src/schema.ts` for account-sync replication parity. Server deltas: add `user_id`, drop `synced_at`, `payload` is `jsonb`, `deleted` is `boolean`.
- **No em dashes** in any code, comment, doc, commit message, or UI copy. Use commas, periods, parentheses, or a hyphen.
- **No AI attribution** in commit messages (no "Co-Authored-By", no "Generated with" lines).
- Work happens on the `staging` branch (current branch). Do not merge into `main`.

## File Structure

New and changed files across the slice:

- `turbo.json` (create) - Turborepo task pipelines.
- `package.json` (modify, root) - add `packageManager`, `turbo` dev dep, `turbo run` scripts.
- `apps/server/package.json` (create) - the server workspace manifest + scripts.
- `apps/server/tsconfig.json` (create) - extends base, Node types.
- `apps/server/drizzle.config.ts` (create) - drizzle-kit config.
- `apps/server/tsup.config.ts` (create) - build config.
- `apps/server/docker-compose.yml` (create) - local Postgres.
- `apps/server/.env.example` (create) - documents `DATABASE_URL`, `PORT`.
- `apps/server/.gitignore` (create) - ignore `dist/`, `.env`.
- `apps/server/README.md` (create) - dev workflow.
- `apps/server/drizzle/` (generated) - migration SQL + journal (committed).
- `apps/server/src/db/schema.ts` (create) - Drizzle table definitions.
- `apps/server/src/db/schema.test.ts` (create) - schema round-trip test.
- `apps/server/src/db/client.ts` (create) - production `postgres.js` Drizzle factory.
- `apps/server/src/test-helpers.ts` (create) - pglite test-db factory.
- `apps/server/src/app.ts` (create) - Hono app factory (`createApp(db)`).
- `apps/server/src/app.test.ts` (create) - `/health` test.
- `apps/server/src/index.ts` (create) - Node server entrypoint.

---

## Task 1: Adopt Turborepo

**Files:**
- Create: `turbo.json`
- Modify: `package.json` (root)

**Interfaces:**
- Consumes: nothing.
- Produces: root scripts `pnpm build` / `pnpm dev` / `pnpm test` now delegate to `turbo run <task>`. `turbo.json` defines `build`, `test`, `dev` tasks.

- [ ] **Step 1: Install Turborepo at the workspace root**

Run:
```bash
pnpm add -w -D turbo
```
Expected: `turbo` added to root `devDependencies`; install completes without error.

- [ ] **Step 2: Add the `packageManager` field to the root `package.json`**

Turborepo requires it. Edit root `package.json` to add the field (Turbo reads the pnpm version here):
```json
"packageManager": "pnpm@11.0.8",
```
Place it next to `"private": true`.

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- [ ] **Step 4: Update root `package.json` scripts**

Replace the `scripts` block so `test` runs through Turbo and `build`/`dev` exist. Keep `typecheck` on the existing pnpm form (packages have no per-package `typecheck` script yet, and this keeps mobile untouched):
```json
"scripts": {
  "build": "turbo run build",
  "dev": "turbo run dev",
  "test": "turbo run test",
  "typecheck": "pnpm --filter '!landing' -r exec tsc --noEmit"
}
```

- [ ] **Step 5: Verify Turbo runs the existing tests**

Run:
```bash
pnpm install
pnpm test
```
Expected: Turbo executes `test` in packages that define it (e.g. `@streka/core`, `web`) and they pass. Output shows a Turborepo summary (tasks run, cached count).

- [ ] **Step 6: Verify caching on a second run**

Run:
```bash
pnpm test
```
Expected: Turbo reports the tasks as cached (`>>> FULL TURBO` or `cached, replaying logs`), confirming orchestration + caching work.

- [ ] **Step 7: Commit**

```bash
git add turbo.json package.json pnpm-lock.yaml
git commit -m "build: adopt Turborepo for task orchestration"
```

---

## Task 2: Scaffold apps/server with the Drizzle schema

**Files:**
- Create: `apps/server/package.json`, `apps/server/tsconfig.json`, `apps/server/drizzle.config.ts`
- Create: `apps/server/src/db/schema.ts`, `apps/server/src/test-helpers.ts`
- Test: `apps/server/src/db/schema.test.ts`
- Generated: `apps/server/drizzle/` (migration SQL + journal)

**Interfaces:**
- Consumes: `@streka/core` types (`TrackerId`, `LogSource`, `LogData`) via type-only import.
- Produces:
  - `users`, `logEntries`, `settings` Drizzle tables from `src/db/schema.ts`.
  - `makeTestDb(): Promise<PgliteDatabase<typeof schema>>` from `src/test-helpers.ts` (a migrated in-memory Postgres).

- [ ] **Step 1: Create the server package manifest**

`apps/server/package.json`:
```json
{
  "name": "server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@streka/core": "workspace:*"
  }
}
```

- [ ] **Step 2: Install server dependencies**

Run:
```bash
pnpm --filter server add drizzle-orm postgres
pnpm --filter server add -D drizzle-kit vitest tsx typescript @types/node @electric-sql/pglite
```
Expected: deps resolve and install; `apps/server/package.json` gains the versions.

- [ ] **Step 3: Create the server tsconfig**

`apps/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src", "drizzle.config.ts", "tsup.config.ts"]
}
```

- [ ] **Step 4: Write the failing schema round-trip test**

`apps/server/src/db/schema.test.ts`:
```ts
import { beforeAll, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestDb } from '../test-helpers';
import { logEntries, users } from './schema';

let db: Awaited<ReturnType<typeof makeTestDb>>;

beforeAll(async () => {
  db = await makeTestDb();
});

test('log_entries round-trips with a user FK', async () => {
  const [user] = await db
    .insert(users)
    .values({ email: 'jt@example.com', passwordHash: 'x' })
    .returning();
  expect(user).toBeDefined();

  await db.insert(logEntries).values({
    id: 'test-entry-1',
    userId: user!.id,
    ts: 1_720_000_000_000,
    day: '2026-07-04',
    tracker: 'steps',
    source: 'manual',
    kind: 'steps',
    payload: { kind: 'steps', count: 8200 },
    updatedAt: 1_720_000_000_000,
  });

  const rows = await db
    .select()
    .from(logEntries)
    .where(eq(logEntries.id, 'test-entry-1'));
  expect(rows).toHaveLength(1);
  expect(rows[0]!.payload).toEqual({ kind: 'steps', count: 8200 });
  expect(rows[0]!.deleted).toBe(false);
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run:
```bash
pnpm --filter server test
```
Expected: FAIL - cannot resolve `./schema` or `../test-helpers` (modules not created yet).

- [ ] **Step 6: Write the Drizzle schema**

`apps/server/src/db/schema.ts`:
```ts
import {
  bigint,
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { LogData, LogSource, TrackerId } from '@streka/core';

// Auth columns (sessions/tokens) are fleshed out in S2; S1 needs the table so
// log_entries.user_id has a foreign key to point at.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Mirrors packages/core/src/schema.ts log_entries. Deltas from the SQLite table:
// per-user (user_id), jsonb payload, boolean deleted, and no local-only synced_at.
export const logEntries = pgTable(
  'log_entries',
  {
    id: text('id').primaryKey(), // client-generated UUID, stored verbatim
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ts: bigint('ts', { mode: 'number' }).notNull(),
    day: date('day').notNull(), // YYYY-MM-DD
    tracker: text('tracker').$type<TrackerId>().notNull(),
    source: text('source').$type<LogSource>().notNull(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').$type<LogData>().notNull(),
    deleted: boolean('deleted').notNull().default(false),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(), // LWW in S3
  },
  (t) => [
    index('idx_log_entries_user_day').on(t.userId, t.day),
    index('idx_log_entries_user_updated').on(t.userId, t.updatedAt),
  ],
);

// Mirrors core kv (per-user settings, LWW on updated_at).
export const settings = pgTable(
  'settings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);
```

- [ ] **Step 7: Create the drizzle-kit config**

`apps/server/drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
```

- [ ] **Step 8: Generate the initial migration**

Run:
```bash
pnpm --filter server db:generate
```
Expected: creates `apps/server/drizzle/0000_*.sql` (the three tables + indexes) and `apps/server/drizzle/meta/` journal. `db:generate` diffs the schema and needs no database connection.

- [ ] **Step 9: Write the pglite test-db factory**

`apps/server/src/test-helpers.ts`:
```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './db/schema';

// In-process Postgres for tests: no Docker needed. Applies the same generated
// migrations that real Postgres runs, so the test exercises the actual schema.
export async function makeTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  return db;
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run:
```bash
pnpm --filter server test
```
Expected: PASS - the migration applies to pglite and the log_entries row round-trips.

- [ ] **Step 11: Commit**

```bash
git add apps/server/package.json apps/server/tsconfig.json apps/server/drizzle.config.ts apps/server/src apps/server/drizzle pnpm-lock.yaml
git commit -m "feat(server): drizzle schema for users, log_entries, settings"
```

---

## Task 3: Hono app with a db-backed /health endpoint

**Files:**
- Create: `apps/server/src/app.ts`, `apps/server/src/db/client.ts`, `apps/server/src/index.ts`
- Test: `apps/server/src/app.test.ts`

**Interfaces:**
- Consumes: `makeTestDb()` from `src/test-helpers.ts`; the Drizzle tables from `src/db/schema.ts`.
- Produces:
  - `createApp(db: PgDatabase<any, any>): Hono` from `src/app.ts`.
  - `createDb(url: string): Db` and `type Db` from `src/db/client.ts`.

- [ ] **Step 1: Install Hono**

Run:
```bash
pnpm --filter server add hono @hono/node-server
```
Expected: both packages install into `apps/server`.

- [ ] **Step 2: Write the failing /health test**

`apps/server/src/app.test.ts`:
```ts
import { beforeAll, expect, test } from 'vitest';
import { createApp } from './app';
import { makeTestDb } from './test-helpers';

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  app = createApp(await makeTestDb());
});

test('GET /health returns ok when the db is reachable', async () => {
  const res = await app.request('/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true, db: 'up' });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:
```bash
pnpm --filter server test app.test.ts
```
Expected: FAIL - cannot resolve `./app`.

- [ ] **Step 4: Write the Hono app factory**

`apps/server/src/app.ts`:
```ts
import { sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';

// The db is injected so the same app runs against postgres.js (dev/prod) and
// pglite (tests). PgDatabase<any, any> is the common base both drivers extend.
export function createApp(db: PgDatabase<any, any>) {
  const app = new Hono();

  app.get('/health', async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true, db: 'up' });
    } catch {
      return c.json({ ok: false, db: 'down' }, 503);
    }
  });

  return app;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
pnpm --filter server test app.test.ts
```
Expected: PASS.

- [ ] **Step 6: Write the production db factory**

`apps/server/src/db/client.ts`:
```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = ReturnType<typeof createDb>;

export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}
```

- [ ] **Step 7: Write the Node server entrypoint**

`apps/server/src/index.ts`:
```ts
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createDb } from './db/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const app = createApp(createDb(url));
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`streka server listening on :${info.port}`);
});
```

- [ ] **Step 8: Verify the whole test suite and typecheck pass**

Run:
```bash
pnpm --filter server test
pnpm --filter server exec tsc --noEmit
```
Expected: all tests PASS; `tsc` reports no type errors.

- [ ] **Step 9: Commit**

```bash
git add apps/server/src apps/server/package.json pnpm-lock.yaml
git commit -m "feat(server): hono app with db-backed /health endpoint"
```

---

## Task 4: Local dev tooling and build

**Files:**
- Create: `apps/server/docker-compose.yml`, `apps/server/.env.example`, `apps/server/.gitignore`, `apps/server/tsup.config.ts`, `apps/server/README.md`
- Modify: `apps/server/package.json` (add `build` + `start` scripts)

**Interfaces:**
- Consumes: `src/index.ts` (build entry).
- Produces: `pnpm --filter server build` emits `apps/server/dist/index.js`; documented local Postgres workflow.

- [ ] **Step 1: Install tsup**

Run:
```bash
pnpm --filter server add -D tsup
```

- [ ] **Step 2: Create the tsup config**

`apps/server/tsup.config.ts`:
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
});
```

- [ ] **Step 3: Add build and start scripts**

Add to `apps/server/package.json` `scripts` (keep the existing entries):
```json
"build": "tsup",
"start": "node dist/index.js"
```

- [ ] **Step 4: Create the local Postgres compose file**

`apps/server/docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: streka
      POSTGRES_PASSWORD: streka
      POSTGRES_DB: streka
    ports:
      - "5432:5432"
    volumes:
      - streka_pg:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U streka"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  streka_pg:
```

- [ ] **Step 5: Create `.env.example` and `.gitignore`**

`apps/server/.env.example`:
```
DATABASE_URL=postgres://streka:streka@localhost:5432/streka
PORT=3001
```

`apps/server/.gitignore`:
```
dist/
.env
```

- [ ] **Step 6: Verify the build emits a runnable artifact**

Run:
```bash
pnpm --filter server build
ls apps/server/dist/index.js
```
Expected: build succeeds; `apps/server/dist/index.js` exists.

- [ ] **Step 7: Verify the end-to-end path against real Postgres (local, needs Docker)**

Run:
```bash
cd apps/server
docker compose up -d
DATABASE_URL=postgres://streka:streka@localhost:5432/streka pnpm db:migrate
DATABASE_URL=postgres://streka:streka@localhost:5432/streka PORT=3001 node dist/index.js &
sleep 1
curl -s localhost:3001/health
```
Expected: `db:migrate` applies the `0000_*` migration; `curl` prints `{"ok":true,"db":"up"}`. Stop the server (`kill %1`) and `docker compose down` when done. If Docker is unavailable, note it and rely on the pglite tests, which exercise the same schema and app.

- [ ] **Step 8: Write the dev workflow README**

`apps/server/README.md`:
```markdown
# streka server

Hono + Drizzle + Postgres API. Local dev:

1. `docker compose up -d` starts Postgres (`DATABASE_URL=postgres://streka:streka@localhost:5432/streka`).
2. `pnpm --filter server db:migrate` applies migrations.
3. `pnpm --filter server dev` runs the server on Node (`:3001`).
4. `pnpm --filter server test` runs the suite against in-process Postgres (pglite); no Docker needed.

`GET /health` pings the database and returns `{ ok, db }`.

Schema (`src/db/schema.ts`) mirrors mobile's SQLite `log_entries` so account sync is a
straight replication problem. Auth and sync endpoints arrive in later slices.
```

- [ ] **Step 9: Commit**

```bash
git add apps/server/docker-compose.yml apps/server/.env.example apps/server/.gitignore apps/server/tsup.config.ts apps/server/README.md apps/server/package.json pnpm-lock.yaml
git commit -m "chore(server): local Postgres, build, and dev docs"
```

---

## Self-Review

**Spec coverage** (checked against `2026-07-04-backend-foundation-design.md`):
- Deliverable 1 (server workspace + scripts) → Task 2 Steps 1-3, Task 4 Step 3.
- Deliverable 2 (Hono app split app.ts / index.ts) → Task 3 Steps 4, 7.
- Deliverable 3 (`/health` pings db) → Task 3 Steps 2-5.
- Deliverable 4 (Drizzle schema + migration + config) → Task 2 Steps 6-8.
- Deliverable 5 (db connection via DATABASE_URL, postgres.js) → Task 3 Step 6, Task 3 Step 7.
- Deliverable 6 (docker-compose + .env.example) → Task 4 Steps 4-5.
- Deliverable 7 (reuse core types only) → Task 2 Step 6 (`import type` of `TrackerId`/`LogSource`/`LogData`).
- Deliverable 8 (tests: health, migrations apply, round-trip, pglite) → Task 2 Steps 4-10, Task 3 Steps 2-5.
- Deliverable 9 (turbo.json + root scripts) → Task 1.
- Schema (users, log_entries, settings + indexes) → Task 2 Step 6.
- Out of scope (auth, sync, Next.js, deploy, mobile/core edits) → respected; none of those are touched.

**Type consistency:** `createApp(db)` accepts `PgDatabase<any, any>`; `makeTestDb()` returns a pglite Drizzle db and `createDb(url)` returns a postgres.js Drizzle db, both assignable to that base. Schema exports `users`, `logEntries`, `settings`; tests reference `users`/`logEntries` by those exact names. `/health` response shape `{ ok, db }` matches the test assertion `{ ok: true, db: 'up' }`.

**Placeholder scan:** No TBD/TODO; every code and command step carries full content.
