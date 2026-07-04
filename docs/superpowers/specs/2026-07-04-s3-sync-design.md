# Sync API (S3): authed push/pull with last-write-wins merge

Date: 2026-07-04. Status: design for review. Slice S3 of the web-first backend pivot.

## Context

S1 built `apps/server` (Hono + Drizzle + Postgres) with the `log_entries` and `settings`
tables that mirror the mobile SQLite schema. S2 added accounts and the `requireAuth`
middleware. S3 adds the sync endpoint those slices were building toward: one authed route that
uploads a client's outbox and downloads the account's changes, merged last-write-wins (LWW).

S3 builds the server endpoint and its tests only. The wire contract is shaped to match the
client sync logic that already exists in `packages/core/src/schema.ts` (the `selectPending`
outbox, `markSynced`, and the `upsertMerge` LWW rule). Mobile transport wiring and the web
dashboard are later slices.

| Slice | Scope | Depends on |
|------|-------|-----------|
| S1 (done) | server skeleton, schema, `/health` | - |
| S2 (done) | auth: sign-up/in/out, sessions, `requireAuth` | S1 |
| **S3 (this doc)** | Sync API: authed `POST /sync` push/pull with LWW merge | S1, S2 |
| S4 | Migrate `apps/web` to Next.js: SEO landing + authed dashboard | S2, S3 |
| Later | Mobile sync transport (wire mobile's outbox to `/sync`) | S3 |

## Locked decisions

- **Pull cursor**: a server-assigned monotonic `server_seq` (from one Postgres sequence
  `sync_seq`), bumped on every accepted write. Pull returns rows with `server_seq > cursor`
  ordered by seq; the cursor is the highest seq the client has received. LWW conflict
  resolution still uses the client `updated_at`; only pull ordering uses the seq. This is
  immune to device clock skew (a laggy clock cannot hide a row behind the puller's cursor).
- **Endpoint**: one combined `POST /sync` (push then pull in a single round trip), behind
  `requireAuth`. The pull half returns everything `> cursor` INCLUDING rows the client just
  pushed: this is deliberate and self-correcting. If the client's write won LWW the echo is an
  idempotent no-op; if the server's copy won (client pushed stale), the echo carries the
  winning row so the client fixes itself.
- **`user_id` is always taken from the session**, never from the request body. The wire format
  has no `user_id` field, so there is nothing to spoof.
- **`log_entries` primary key becomes composite `(user_id, id)`** (it was `id` alone in S1).
  For a multi-tenant upsert (`ON CONFLICT (user_id, id)`) this is required: with `id` alone a
  client controls its own `id` values and a crafted push could target another account's row.
  Composite PK gives each account an independent id namespace, making cross-account overwrite
  structurally impossible, and matches `settings` (already `(user_id, key)`).
- **Validation is structural only** (zod): the envelope of each pushed row is checked; the
  `payload` is stored opaquely as `jsonb` and is not deep-validated, and `tracker`/`source` are
  not enumerated server-side, so new tracker types never require a lockstep server deploy.
- **Merge is per-row LWW**, `WHERE excluded.updated_at > stored.updated_at` (strictly greater,
  mirroring the client's `>` rule), applied to the whole push batch in one transaction.

## Schema changes (one S3 migration)

In `apps/server/src/db/schema.ts`:

- `log_entries`: drop the `id`-only primary key; add composite primary key `(user_id, id)`.
- Add a shared sequence `sync_seq` (Drizzle `pgSequence`).
- `log_entries`: add `server_seq bigint not null` (populated from `nextval('sync_seq')` on every
  accepted insert and update). Replace the `(user_id, updated_at)` index with
  `(user_id, server_seq)`. Keep `(user_id, day)`.
- `settings`: add `server_seq bigint not null` (same population), and add index
  `(user_id, server_seq)`.

`server_seq` uses Drizzle `bigint(..., { mode: 'number' })`, consistent with `ts`/`updated_at`;
a sequence will not exceed `Number.MAX_SAFE_INTEGER` in practice.

## Wire contract

```
POST /sync            (requireAuth; 401 if unauthenticated)

request  = {
  cursor:   number,            // 0 on first sync, else the last server_seq the client stored
  entries:  PushEntry[],       // the client's outbox rows; may be empty
  settings: PushSetting[],     // the client's outbox settings; may be empty
}

response = {
  cursor:   number,            // new cursor to store
  entries:  PullEntry[],       // server rows with server_seq > request.cursor (post-merge)
  settings: PullSetting[],
  hasMore:  boolean,           // true if a page limit was hit; client loops until false
}

PushEntry  = { id, ts, day, tracker, source, kind, payload, deleted, updatedAt }
PullEntry  = { id, ts, day, tracker, source, kind, payload, deleted, updatedAt }
PushSetting = { key, value, updatedAt }
PullSetting = { key, value, updatedAt }
```

- `id` is the client-generated UUID; `ts`/`updatedAt` are epoch-ms integers; `day` is
  `YYYY-MM-DD`; `payload` is a JSON object (the domain `LogData`); `deleted` is a boolean
  tombstone. The shapes mirror the SQLite row minus the local-only `synced_at`, so replication
  parity holds at the wire level. `server_seq` is server-internal and is never on the wire.
- `payload` is typed `unknown`/`Record<string, unknown>` server-side (stored opaquely); the
  client casts it back to `LogData`. `LogData`/`TrackerId`/`LogSource` may be imported from
  `@streka/core` as types only if useful, never at runtime.

## Merge semantics

For each pushed entry, within one transaction:

```
INSERT INTO log_entries (id, user_id, ts, day, tracker, source, kind, payload, deleted,
                         updated_at, server_seq)
VALUES (..., <session user_id>, ..., nextval('sync_seq'))
ON CONFLICT (user_id, id) DO UPDATE SET
  ts = excluded.ts, day = excluded.day, tracker = excluded.tracker, source = excluded.source,
  kind = excluded.kind, payload = excluded.payload, deleted = excluded.deleted,
  updated_at = excluded.updated_at, server_seq = nextval('sync_seq')
WHERE excluded.updated_at > log_entries.updated_at
```

Settings use the identical pattern keyed by `(user_id, key)`, LWW on `updated_at`. A stale push
(incoming `updated_at` not greater) is a no-op and does not bump `server_seq`, so idempotent
re-pushes do not churn the cursor. Tombstones replicate as `deleted = true`. The push batch is
atomic: if any row errors, the whole `POST /sync` fails and nothing is applied.

## Cursor and pagination

- One shared `sync_seq`, so a single `cursor` covers both streams.
- Pull queries each table: `WHERE user_id = <session> AND server_seq > cursor ORDER BY
  server_seq ASC LIMIT L` with `L = 500`.
- New cursor rule (never advance past an unreturned row): if neither table hit `L`, the new
  cursor is the maximum `server_seq` across all returned rows (or the request cursor unchanged
  when nothing was returned), and `hasMore = false`. If a table returned exactly `L` rows
  (truncated), the new cursor is the minimum, over the truncated tables, of that table's
  greatest returned `server_seq`, and `hasMore = true`. The client repeats `POST /sync` (with
  empty push arrays) until `hasMore` is false. A non-truncated stream may re-send a few rows on
  the next page, which is an idempotent echo, never a gap.

## Validation and errors

zod schemas validate each pushed row's envelope: `id` is a UUID (`z.uuid()`), `ts` and
`updatedAt` are integers, `day` matches `^\d{4}-\d{2}-\d{2}$`, `tracker`/`source`/`kind` are
non-empty strings, `deleted` is a boolean, `payload` is an object; settings require a non-empty
`key`, any JSON `value`, and an integer `updatedAt`. `cursor` is a non-negative integer. A batch
exceeding 500 entries or 500 settings, or any row failing validation, rejects the whole request
with `400` (a client bug should be loud). Missing/invalid session is `401` (from `requireAuth`).

## File layout

```
apps/server/src/
  sync/
    validation.ts     zod schemas: syncRequestSchema (cursor, entries, settings) + row shapes
    merge.ts          pushEntries / pushSettings (LWW upsert + nextval), pullChanges (cursor)
    merge.test.ts
    routes.ts         createSyncRoutes(db): POST /sync behind requireAuth(db)
    routes.test.ts
  db/schema.ts        composite PK, server_seq columns, sync_seq sequence, indexes
  app.ts              mount app.route('/sync', createSyncRoutes(db))
```

`createSyncRoutes(db)` takes the injected `db: PgDatabase<any, any>`, reads `c.get('userId')`
from `requireAuth`, and never trusts a client-supplied user id.

## Testing (vitest + pglite, no Docker)

- push stores entries scoped to the session user, each with a `server_seq`; a fresh pull
  (cursor 0) returns them.
- LWW both directions: a push with a greater `updated_at` overwrites; a push with an equal or
  lesser `updated_at` is a no-op (stored row unchanged, cursor not bumped).
- tombstone (`deleted: true`) replicates through pull.
- **isolation**: user B's pull never returns user A's rows; user B pushing an entry whose `id`
  collides with one of user A's rows does NOT modify A's row (composite PK), and A still reads
  its original.
- cursor: pull-since returns only rows newer than the cursor; a repeated identical push is an
  idempotent echo; `hasMore` drives a pagination loop that terminates and loses nothing.
- settings sync mirrors entries (LWW, isolation, pull-since).
- validation: a bad `id`/`day`/`updatedAt`, an over-limit batch, or a malformed body returns
  `400`.
- auth: `POST /sync` without a session returns `401`.

## Out of scope for S3

Mobile transport wiring (later), the web dashboard UI and retiring `apps/landing` (S4),
realtime/websocket push, sub-row (per-field) merge, and tombstone compaction/pruning. No change
to `apps/mobile` or `packages/core`.

## Open notes

- The `(user_id, day)` index is retained for the S4 dashboard's day-range reads even though S3
  does not query by day.
- Page limit `L = 500` is a safety bound; per-account volume is small, so the pagination loop
  rarely runs more than once. It can be raised later without a contract change.
- Deleting a user cascades to `log_entries`, `settings`, and `sessions` (existing FKs); S3 adds
  no new delete paths.
