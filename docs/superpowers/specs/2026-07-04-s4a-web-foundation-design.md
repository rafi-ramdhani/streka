# Web foundation (S4a): Next.js app with landing, auth, and a session-guarded shell

Date: 2026-07-04. Status: design for review. Slice S4a of the web-first backend pivot.

## Context

S1 built `apps/server` (Hono + Drizzle + Postgres). S2 added accounts, sessions, and the
`requireAuth` middleware plus the `/auth/{signup,signin,signout,me}` endpoints. S3 added the
authed `POST /sync` push/pull endpoint. Every backend piece the web needs now exists, but there
is no web client for it: the current `apps/web` is a Vite SPA whose data comes from
`localStorage` + `seedDemo` (a demo, not real accounts), and `apps/landing` is a separate static
`index.html` served by its own Vite process. Neither talks to the API, and there is no web UI for
signing up or signing in at all.

S4 (migrate the web surface to Next.js) is split into two slices so the risky part gets its own
review gate:

| Slice | Scope | Depends on |
|------|-------|-----------|
| S1 (done) | server skeleton, schema, `/health` | - |
| S2 (done) | auth: sign-up/in/out, sessions, `requireAuth` | S1 |
| S3 (done) | Sync API: authed `POST /sync` push/pull with LWW merge | S1, S2 |
| **S4a (this doc)** | Next.js app: landing (SSG/SEO), auth pages + flow, session-guarded `/app` shell, retire `apps/landing` | S2 |
| S4b | Dashboard on `/sync`: port Board/Trends/Goals onto the live sync API, retire the Vite dashboard | S3, S4a |
| Later | Mobile sync transport (wire mobile's outbox to `/sync`) | S3 |

S4a is the **first live client of the auth API**. It builds the Next.js app, the marketing
landing, the sign-up / sign-in / sign-out flow, and an authed shell at `/app` that proves the
session works. It deliberately stops short of the dashboard: `/app` renders a greeting and a
sign-out button, and S4b fills it with the real Board/Trends/Goals views on `/sync`.

## Locked decisions

- **Next.js 15, App Router, React 19, Node runtime.** React 19 matches the existing
  `react@19.2.3` in `apps/web`; App Router is the current default and pairs with React Server
  Components for the SSG landing. No edge runtime.
- **Convert `apps/web` in place** (keep the workspace name `web`). Remove the Vite entry points
  (`vite.config.ts`, `index.html`, `src/main.tsx`). Keep `src/sections/*` and `src/components/*`
  (Board, Trends, Goals, bits, Modal, Toast) untouched in the tree: they are the **S4b port
  source**, not dead code. The spec records this so the code review does not flag them as unused.
- **Same-origin, zero server changes.** Next.js `rewrites()` proxies `/api/:path*` on the web
  origin to the Hono server (base URL from env `STREKA_API_ORIGIN`, default
  `http://localhost:3001`). The browser only ever talks to the web origin, so the existing
  `streka_session` cookie (`httpOnly`, `SameSite=Lax`, `secure` in prod) keeps working with no
  change, and the server needs no CORS. Cross-origin + CORS was the alternative and is rejected:
  it would force `SameSite=None; Secure` and a new CORS layer on `apps/server` for no benefit.
- **Client-side session guard** for `/app` in S4a: the segment layout calls `/api/auth/me` and
  redirects to `/signin` on 401. A server-side (middleware) guard that removes the brief auth
  flash is noted as a later enhancement, not S4a scope.
- **Archivo via `next/font/google`** (self-hosted at build time). This drops the runtime Google
  Fonts CDN `<link>` that both current apps use.
- **`apps/server` is not modified by S4a.** No route, cookie, or CORS change.

## Architecture

Two independent processes, same origin from the browser's point of view:

```
browser ──▶ Next.js (apps/web, :3000)
                 │  static: /, /signin, /signup
                 │  guarded: /app
                 └─ rewrites /api/:path*  ──▶ Hono API (apps/server, :3001)
                                                /auth/*, /sync, /health
```

In dev, `pnpm --filter web dev` starts Next on `:3000` and the rewrite forwards `/api/*` to the
server on `:3001`, so one command gives a working same-origin app. In prod the same rewrite
points `STREKA_API_ORIGIN` at the internal server URL (an external reverse proxy could do the
same routing, but the rewrite keeps deployment to a single knob).

## File structure

```
apps/web/
  package.json            next, react 19, react-dom 19; keep @streka/tokens, vitest, testing-library
  next.config.ts          rewrites: /api/:path* -> `${STREKA_API_ORIGIN}/:path*`
  tsconfig.json           Next's TS config (extends the workspace base where practical)
  app/
    layout.tsx            root <html>/<body>, Archivo via next/font/google, global reset
    page.tsx              "/"  landing (server component, SSG) + `metadata` for SEO
    globals.css           minimal base styles ported from the current index.css / landing
    signin/page.tsx       "/signin"  renders <AuthForm mode="signin">
    signup/page.tsx       "/signup"  renders <AuthForm mode="signup">
    app/
      layout.tsx          session guard (client): fetch /api/auth/me, redirect /signin on 401
      page.tsx            authed shell: greeting from /api/auth/me + <SignOutButton>
  components/
    auth/AuthForm.tsx     shared email+password form; posts to /api/auth/{signin,signup}
    auth/SignOutButton.tsx POST /api/auth/signout then redirect "/"
  src/sections/*          RETAINED unchanged as the S4b port source (not imported yet)
  src/components/*         RETAINED unchanged as the S4b port source (not imported yet)
```

Removed in S4a: `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/main.tsx`, and
the whole `apps/landing/` directory (its markup is ported into `app/page.tsx`).

## Components and data flow

**Landing (`app/page.tsx`)** is a server component rendered as static HTML. Its markup is a port
of `apps/landing/index.html` (hero, features, "get the app" section). The inline-styled sections
are carried over initially to minimize risk; SEO title and description move to the Next
`metadata` export (title "Streka - One slash a day. Keep the streak." and the existing
description). Store-badge links stay placeholder anchors, exactly as today.

**AuthForm (`components/auth/AuthForm.tsx`)** is a client component with `mode: 'signin' |
'signup'`. It holds email + password state and submits with
`fetch('/api/auth/' + mode, { method: 'POST', credentials: 'same-origin', headers: {'content-type':'application/json'}, body: JSON.stringify({ email, password }) })`.
On a 200 it navigates to `/app` (`router.push('/app')`). It maps error status to inline copy:
400 -> "Enter a valid email and a password of at least 8 characters" (mirrors the server's
`credentialsSchema`), 401 -> "Wrong email or password", 409 -> "That email is already
registered". Any other non-2xx -> a generic "Something went wrong, try again". The password field
uses `type="password"`; the form is disabled while a request is in flight.

**Session guard (`app/app/layout.tsx`)** is a client component that on mount calls
`fetch('/api/auth/me', { credentials: 'same-origin' })`. While pending it renders a minimal
loading state; on 401 it `router.replace('/signin')`; on 200 it renders its children and provides
the user's email to the shell. This is the client-side guard from Locked Decisions.

**Authed shell (`app/app/page.tsx`)** renders a greeting using the email from `/api/auth/me` and a
`<SignOutButton>`. This is intentionally minimal: it proves the end-to-end session works and is
the mount point S4b extends with the dashboard.

**SignOutButton** POSTs `/api/auth/signout` (`credentials: 'same-origin'`) then
`router.replace('/')`.

## Error handling

- Auth submit failures render inline, per the status mapping above; the form never throws to a
  blank screen.
- A `/api/auth/me` request that rejects at the network layer (server down) is treated like a 401
  for the guard (redirect to `/signin`) so a dead API never hangs `/app` on the loading state.
- The rewrite target being unreachable surfaces as a failed `fetch`; the forms show the generic
  error rather than a Next error overlay.

## Testing

vitest + `@testing-library/react` (both already dev deps of `apps/web`), `jsdom` environment.
`fetch` is mocked per test.

- **AuthForm**: a successful signin calls `fetch` with the right URL/body and navigates to
  `/app`; a 401 renders "Wrong email or password"; a 409 (signup) renders the duplicate-email
  copy; the form is disabled while the request is in flight.
- **Landing**: `page.tsx` (or the exported `metadata`) exposes the SEO title and description, and
  the hero headline text renders.
- **Session guard**: with `/api/auth/me` mocked 401 the guard redirects to `/signin`; with 200 it
  renders its children.

No Playwright / end-to-end browser tests in S4a (YAGNI); e2e can come later if wanted. Manual
verification: `pnpm --filter web dev` + the running server, walk signup -> `/app` -> signout.

## Non-goals (S4a)

- The dashboard and any `/sync` call. `/app` shows only the greeting + sign-out; Board/Trends/
  Goals on live data are S4b.
- Retiring the Vite dashboard *code*: `src/sections/*` and `src/components/*` stay as the S4b
  port source.
- Any change to `apps/server` (no CORS, no cookie change, no new route).
- Server-side/middleware auth guard (the flash-free version); client guard is enough for S4a.
- Password reset, email verification, "remember me", OAuth. Out of scope for the whole S4.

## Retirement in S4a

- Delete `apps/landing/` (content ported into `app/page.tsx`). Remove it from the workspace and
  any root scripts / Turbo pipeline references.
- Remove `apps/web`'s Vite files (`vite.config.ts`, `index.html`, `src/main.tsx`) and Vite
  dev-deps that Next replaces; keep `@streka/tokens`, vitest, and testing-library.
- The `landing` dev server currently running on `:5199` stops being part of the project.
