# Auth (S2): sign-up, sign-in, sessions, auth middleware

Date: 2026-07-04. Status: design for review. Slice S2 of the web-first backend pivot.

## Context

S1 stood up `apps/server` (Hono + Drizzle + Postgres) with a `users` table and a
`/health` check, but no way to create or authenticate a user. S2 adds our own auth: account
creation, login, logout, and the session-validation middleware that S3's sync endpoints hang
`user_id` off of. There is no web UI in this slice (that is S4); S2 delivers the API and the
auth primitives, tested against pglite.

| Slice | Scope | Depends on |
|------|-------|-----------|
| S1 (done) | `apps/server` skeleton, Docker Postgres, Drizzle schema, `/health` | - |
| **S2 (this doc)** | Auth: sign-up / sign-in / sign-out, sessions table, `requireAuth` middleware | S1 |
| S3 | Sync API: authed push/pull with `updated_at` last-write-wins merge | S1, S2 |
| S4 | Migrate `apps/web` to Next.js: SEO landing + authed dashboard on the API | S2, S3 |
| Later | Mobile sync transport (wire mobile's existing outbox to `apps/server`) | S3 |

## Locked decisions

- **Session model**: opaque, server-side sessions. Each login mints a random 32-byte token;
  only its SHA-256 hash is stored in a new `sessions` table with `user_id` and `expires_at`.
  Validation hashes the presented token, looks it up, and checks expiry. Chosen over JWT
  because every authed request already hits Postgres for sync, so statelessness buys nothing
  and costs revocation. Sessions are revocable (logout, and logout-all-devices later).
- **Token transport**: `httpOnly` cookie for web (S4), `Authorization: Bearer` for mobile
  (later). The middleware accepts either, so no client is privileged in the API.
- **Password hashing**: argon2id via `@noble/hashes` (audited, pure TypeScript, no native
  addon). OWASP's first-choice algorithm without node-gyp / bundle friction. The popular
  native `argon2` npm package was rejected to keep the clean, Docker-free build from S1.
- **Request validation**: `zod`. Bodies parsed with `safeParse`; no `@hono/zod-validator`
  dependency (keep the surface small).
- **Cookies**: via `hono/cookie` (already part of Hono, no new dependency).
- **Schema parity**: the `sessions` table is server-only infrastructure and deliberately
  does NOT mirror the mobile SQLite schema. Mobile stores its token in secure device storage,
  not in a synced table. The mobile-mirrored tables (`log_entries`, `settings`) are untouched.
- **Typed db**: adopt the S1 carry-forward `type Db = PgDatabase<any, typeof schema>` alias so
  auth db helpers and (later) S3 queries are schema-aware. Auth uses the Drizzle query builder
  (`select` / `insert` / `delete`), which works against both the pglite and postgres.js
  instances already injected into `createApp`.

## New table: sessions

Added to `apps/server/src/db/schema.ts`, with one generated Drizzle migration.

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references users(id) on delete cascade`
- `token_hash text not null unique` (SHA-256 hex of the raw token; the raw token is never
  stored)
- `created_at timestamptz not null default now()`
- `expires_at timestamptz not null` (30 days from issue)
- Index: `(user_id)` for listing / revoking a user's sessions.

`users` already exists (`id`, `email`, `password_hash`, `created_at`); S2 adds no columns to it.

## Password hashing

- `hashPassword(password): Promise<string>` runs argon2id (`@noble/hashes/argon2`) over the
  password with a fresh 16-byte random salt and returns a self-describing PHC-format string:
  `$argon2id$v=19$m=19456,t=2,p=1$<b64salt>$<b64hash>`. Parameters follow an OWASP argon2id
  baseline: `m=19456` KiB (19 MiB), `t=2`, `p=1`, `dkLen=32`.
- `verifyPassword(password, stored): Promise<boolean>` parses the stored PHC string, recomputes
  argon2id with the embedded params and salt, and compares with `crypto.timingSafeEqual`.
  Storing params inline means we can raise cost later and still verify old hashes.
- Email is normalized to `email.trim().toLowerCase()` before lookup and storage so uniqueness
  is case-insensitive.

## Tokens and sessions

- `generateSessionToken()` returns `{ token, tokenHash }`: `token` is 32 random bytes
  (`crypto.randomBytes`) as base64url; `tokenHash` is its SHA-256 hex.
- `createSession(db, userId)` inserts a row (`token_hash`, `user_id`, `expires_at = now + 30d`)
  and returns `{ token, expiresAt }`. Only the caller ever sees the raw `token`.
- `validateSession(db, token)` hashes the token, looks up the row, rejects if missing or
  `expires_at <= now`, and returns `{ userId }` or `null`.
- `revokeSession(db, token)` deletes the row for that token hash (idempotent).
- Cookie name `streka_session`; attributes `HttpOnly`, `Secure` (production), `SameSite=Lax`,
  `Path=/`, `Max-Age` matching the 30-day expiry.

## Endpoints

Mounted under `/auth` by `createAuthRoutes(db)`, which `createApp` attaches with
`app.route('/auth', ...)`. User responses never include `password_hash`; the returned shape is
`{ id, email, createdAt }`.

| Route | Body | Success | Errors |
|-------|------|---------|--------|
| `POST /auth/signup` | `{ email, password }` | `201 { user }` + `Set-Cookie` | `400` invalid body, `409` email already registered |
| `POST /auth/signin` | `{ email, password }` | `200 { user }` + `Set-Cookie` | `400` invalid body, `401` invalid credentials |
| `POST /auth/signout` | none | `204`, clears cookie | (idempotent: `204` even with no session) |
| `GET /auth/me` | none (behind `requireAuth`) | `200 { user }` | `401` unauthenticated |

- Signup: validate, normalize email, reject if the email already exists (`409`), hash the
  password, insert the user, create a session, set the cookie. Existence is checked with a
  `select` before insert; the `users.email` unique index is the integrity backstop.
- Signin: look up by normalized email, `verifyPassword`. On success create a session and set
  the cookie. On unknown email or wrong password, return the same generic `401`
  ("invalid email or password") to avoid user enumeration, and run a dummy argon2id verify on
  the unknown-email path so response timing does not distinguish the two cases.
- Signout: read the token (cookie or Bearer), `revokeSession`, `deleteCookie`, return `204`
  regardless of whether a valid session was present.

## Auth middleware

`requireAuth` (a Hono `MiddlewareHandler`) reads the token from the `streka_session` cookie or
an `Authorization: Bearer <token>` header, calls `validateSession`, and on success sets
`c.set('userId', userId)` for downstream handlers before calling `next()`. On a missing or
invalid session it returns `401` and does not proceed. The route env is typed
(`Hono<{ Variables: { userId: string } }>`) so `c.get('userId')` is typed for `/auth/me` now
and S3's sync handlers later. Only `/auth/me` uses it in S2; signup/signin/signout are public.

## Validation and errors

- `zod` schemas: `email` is `z.string().email()`, `password` is `z.string().min(8)`. Bodies
  are read with `c.req.json()` and `schema.safeParse`; a failure returns `400` with a short
  message (no raw zod dump).
- CSRF: `SameSite=Lax` covers the common cases now. Because web (S4) is same-origin Next.js, a
  stricter origin check or double-submit token can be added with S4 if warranted; not in S2.

## File layout

```
apps/server/src/
  auth/
    password.ts        hashPassword / verifyPassword (argon2id)
    password.test.ts
    tokens.ts          generateSessionToken / hashToken
    tokens.test.ts
    sessions.ts        createSession / validateSession / revokeSession (db ops)
    sessions.test.ts
    middleware.ts       requireAuth
    validation.ts      zod schemas for signup / signin bodies
    routes.ts          createAuthRoutes(db): signup / signin / signout / me
    routes.test.ts
  db/schema.ts         + sessions table
  app.ts               mounts app.route('/auth', createAuthRoutes(db))
```

New dependencies: `@noble/hashes`, `zod`. No new dev dependencies (`hono/cookie` and
`node:crypto` are already available).

## Testing (vitest + pglite, no Docker)

Reuses the existing `makeTestDb()` helper, which runs the migrations folder (so the new
`sessions` migration applies automatically).

- password: hash then verify succeeds; wrong password fails; two hashes of the same password
  differ (random salt); a tampered stored string fails to verify.
- tokens: `generateSessionToken` returns distinct tokens; `tokenHash` matches SHA-256 of the
  token.
- sessions: `createSession` then `validateSession` returns the `userId`; an unknown token
  returns `null`; an expired session returns `null`; `revokeSession` makes a valid token stop
  validating.
- routes: signup creates a user and sets a cookie; duplicate email returns `409`; signin with
  correct password returns `200` and a cookie; wrong password returns `401`; unknown email
  returns `401`; `GET /auth/me` with a valid cookie returns the user; `/auth/me` without a
  session returns `401`; signout revokes the session so the same cookie then `401`s on `/me`.
- validation: signup/signin with a bad email or a short password returns `400`.

## Out of scope for S2 (YAGNI)

Email verification, password reset, OAuth / social login, MFA, rate limiting (noted as a
follow-up before public launch), session sliding-expiry / refresh, and all sync push/pull
endpoints (S3). No change to `apps/web`, `apps/mobile`, or `packages/core`.

## Open notes

- Rate limiting on signin/signup is deliberately deferred, but it is the first hardening item
  before this endpoint faces the public internet in S4.
- Signout is intentionally lenient (always `204`) so a client with a stale token can always
  clear it cleanly; it is not an authenticated route.
- The 30-day fixed expiry is a starting point; sliding expiry / refresh can be added later
  without a schema change (the `expires_at` column already carries it).
