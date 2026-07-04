# S4a Web Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `apps/web` into a Next.js 15 App Router app with an SEO landing page, a sign-up / sign-in / sign-out flow against the existing Hono auth API, and a session-guarded `/app` shell, and retire the standalone `apps/landing`.

**Architecture:** Next.js and the Hono API stay two separate processes; Next `rewrites()` proxies `/api/:path*` on the web origin to the server so the browser is always same-origin and the existing `streka_session` cookie keeps working with no server change. The landing is a static (SSG) server component; auth pages and the `/app` shell are client components that talk to `/api/*`. A client-side guard on the `/app` segment redirects to `/signin` when `/api/auth/me` is not authenticated.

**Tech Stack:** Next.js 15 (App Router, React 19, Node runtime), TypeScript strict, `@streka/tokens` for colors, `next/font/google` for Archivo, vitest + @testing-library/react (jsdom) for tests.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec `docs/superpowers/specs/2026-07-04-s4a-web-foundation-design.md`.

- **Next.js 15, App Router, React 19, Node runtime.** No edge runtime.
- **Convert `apps/web` in place.** Keep the workspace name `web`. Remove the Vite *app* entry points (`vite.config.ts`, `index.html`, `src/main.tsx`) and the Vite app scripts. Keep `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, and testing-library: they remain as vitest's engine, not an app bundler.
- **Retain `apps/web/src/sections/*` and `apps/web/src/components/*` untouched.** They are the S4b port source, not dead code. Do NOT delete them and do NOT import them from any `app/` route in S4a. The existing `apps/web/src/App.test.tsx` continues to run and pass.
- **Same-origin proxy.** `next.config.ts` rewrites `/api/:path*` to `${STREKA_API_ORIGIN}/:path*`, `STREKA_API_ORIGIN` defaulting to `http://localhost:3001`. Browser code calls relative `/api/...` with `credentials: 'same-origin'`. The server routes live at the root (`/auth/*`, `/sync`, `/health`), so `/api/auth/signin` proxies to `${origin}/auth/signin`.
- **`apps/server` is NOT modified by S4a.** No route, cookie, or CORS change.
- **Client-side session guard only** for `/app` (no Next middleware in S4a).
- **Archivo via `next/font/google`** (self-hosted at build). No runtime Google Fonts `<link>`. `next build`/`next dev` downloads the font on first run (needs network once).
- **Auth API contract** (do not change it, just consume it): `POST /auth/signup` -> `201 { user: { id, email, createdAt } }`, `400`, or `409`. `POST /auth/signin` -> `200 { user }`, `400`, or `401`. `POST /auth/signout` -> `204` (no body). `GET /auth/me` -> `200 { user }` or `401`. Treat any `res.ok` (2xx) as success.
- **Password minimum is 8** (mirrors the server `credentialsSchema`); the 400 auth error copy states "at least 8 characters".
- **No em dashes** anywhere: prose, docs, UI copy, code comments, commit messages. Use commas, periods, parentheses, or a hyphen. This applies to the ported landing copy: strip every em dash listed in Task 2.
- **No AI attribution** in commit messages (no "Co-Authored-By", no "Generated with").
- **pnpm only** (never Bun). Work on the `staging` branch. Run web commands with `pnpm --filter web exec ...`.
- **Path alias `@/*`** maps to the `apps/web` root (so `@/components/auth/AuthForm` is `apps/web/components/auth/AuthForm.tsx`). Configure it in both `tsconfig.json` and `vitest.config.ts`.

---

## File Structure

```
apps/web/
  package.json          MODIFY: add next; next scripts; drop vite app scripts
  next.config.ts        CREATE: transpilePackages + /api rewrite
  tsconfig.json         MODIFY: extend base + Next options + @/* paths
  next-env.d.ts         CREATE: Next type references
  vitest.config.ts      CREATE (replaces vite.config.ts): react plugin, jsdom, @ alias
  vite.config.ts        DELETE
  index.html            DELETE
  src/main.tsx          DELETE
  src/test-setup.ts     MODIFY: keep matchMedia shim, add next/font/google mock
  app/
    layout.tsx          CREATE: root html/body, Archivo font, globals import
    globals.css         CREATE: base styles ported from src/index.css
    page.tsx            CREATE: Task 1 placeholder, REPLACED in Task 2 by the landing + metadata
    page.test.tsx       CREATE (Task 2): metadata + hero + no-em-dash tests
    signin/page.tsx     CREATE (Task 3)
    signup/page.tsx     CREATE (Task 3)
    app/
      layout.tsx        CREATE (Task 4): client session guard
      layout.test.tsx   CREATE (Task 4)
      page.tsx          CREATE (Task 4): greeting + SignOutButton
      page.test.tsx     CREATE (Task 4)
  components/auth/
    AuthForm.tsx        CREATE (Task 3)
    AuthForm.test.tsx   CREATE (Task 3)
    AuthedContext.tsx   CREATE (Task 4): email context provider + hook
    SignOutButton.tsx   CREATE (Task 4)
    SignOutButton.test.tsx CREATE (Task 4)
  src/sections/*        RETAINED unchanged (S4b port source)
  src/components/*      RETAINED unchanged (S4b port source)
  src/App.tsx, core.ts, lib.ts, App.test.tsx, index.css  RETAINED unchanged

apps/landing/           DELETE entire directory (Task 5)
package.json (root)     MODIFY (Task 5): typecheck script drops the '!landing' filter
```

---

## Task 1: Scaffold the Next.js app (convert `apps/web` in place)

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/next.config.ts`, `apps/web/tsconfig.json` (overwrite), `apps/web/next-env.d.ts`, `apps/web/vitest.config.ts`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/page.tsx`
- Modify: `apps/web/src/test-setup.ts`
- Delete: `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/main.tsx`

**Interfaces:**
- Produces: a booting Next.js app whose root layout applies Archivo and imports `globals.css`; a placeholder `app/page.tsx` (replaced in Task 2); the `/api/:path*` rewrite; the `@/*` alias. Later tasks add routes under `app/` and components under `components/`.

- [ ] **Step 1: Add Next and rewrite the web `package.json` scripts**

Run: `pnpm --filter web add next@^15 && pnpm --filter web add -D @types/node`

Then set `apps/web/package.json` `scripts` to exactly:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  }
```

Keep `react`, `react-dom`, `@streka/tokens`, and `@streka/core` in `dependencies` (the retained `src/*` port source and its `App.test.tsx` import `@streka/core`, so it must stay resolvable). Keep `@testing-library/react`, `@testing-library/user-event`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `jsdom`, `typescript`, `vite`, `vitest`, and the added `@types/node`, `next` where pnpm placed them. Do not remove `vite` or `@vitejs/plugin-react` (vitest needs them). Note: `@streka/core` is NOT added to `transpilePackages` in S4a because no `app/` route imports it (only the retained, un-bundled `src/*` does); S4b adds it when the dashboard is wired in.

- [ ] **Step 2: Create `apps/web/next.config.ts`**

```ts
import type { NextConfig } from 'next';

// The Hono API is a separate process. Proxy /api/* to it so the browser is
// always same-origin and the streka_session cookie keeps working unchanged.
// Server routes live at the root, so /api/auth/x -> ${origin}/auth/x.
const apiOrigin = process.env.STREKA_API_ORIGIN ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // @streka/tokens ships raw TS (main: src/index.ts); Next must transpile it.
  transpilePackages: ['@streka/tokens'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Overwrite `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "preserve",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "app", "components", "src", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `apps/web/next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 5: Create `apps/web/vitest.config.ts` and delete `vite.config.ts`**

```ts
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Run: `git rm apps/web/vite.config.ts apps/web/index.html apps/web/src/main.tsx`

- [ ] **Step 6: Add the `next/font/google` mock to `apps/web/src/test-setup.ts`**

Keep the existing `matchMedia` shim. Append:

```ts
import { vi } from 'vitest';

// next/font/google is a Next compiler feature with no runtime under vitest;
// stub it so any component importing a font is renderable in tests.
vi.mock('next/font/google', () => ({
  Archivo: () => ({ className: 'font-archivo', style: { fontFamily: 'Archivo' } }),
}));
```

- [ ] **Step 7: Create `apps/web/app/globals.css` (ported from `src/index.css`)**

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f5f7f3;
  color: #131712;
}

.tile {
  transition: box-shadow 0.15s ease, transform 0.05s ease;
  cursor: pointer;
}
.tile:hover {
  box-shadow: 0 6px 20px rgba(19, 23, 18, 0.08);
}
.tile:active {
  transform: scale(0.98);
}

.opt-row {
  cursor: pointer;
  transition: background 0.12s ease, transform 0.05s ease;
}
.opt-row:hover {
  background: #eef0ec !important;
}
.opt-row:active {
  transform: scale(0.98);
}

.pressable {
  cursor: pointer;
  transition: transform 0.05s ease;
}
.pressable:active {
  transform: scale(0.97);
}
```

- [ ] **Step 8: Create `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Streka',
  description: 'One slash a day. Keep the streak.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={archivo.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create the placeholder `apps/web/app/page.tsx`**

```tsx
// Placeholder home. Task 2 replaces this file with the ported landing page
// and its SEO metadata export.
export default function Home() {
  return <main style={{ padding: 24 }}>Streka</main>;
}
```

- [ ] **Step 10: Generate types, typecheck, and build**

Run: `pnpm --filter web exec next build`
Expected: build completes; a `Route (app)` table lists `/`. This also generates `.next/types`. If Next appends fields to `tsconfig.json`, keep them (commit the result).

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 11: Confirm the retained old test still passes**

Run: `pnpm --filter web test`
Expected: `src/App.test.tsx` (the seeded board tests) passes. There are no new test files yet.

- [ ] **Step 12: Commit**

```bash
git add apps/web package.json pnpm-lock.yaml
git rm --cached --ignore-unmatch apps/web/vite.config.ts apps/web/index.html apps/web/src/main.tsx
git commit -m "feat(web): scaffold Next.js app, retire the Vite app entry"
```

(Ensure `apps/web/.next/` is git-ignored; if it is not already ignored at the repo root, add `.next/` to `.gitignore` in this commit.)

---

## Task 2: Landing page with SEO metadata

**Files:**
- Modify: `apps/web/app/page.tsx` (replace the Task 1 placeholder)
- Create: `apps/web/app/page.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: the landing at `/` as a server component with a `metadata` export.

The source is `apps/landing/index.html` (still present until Task 5). Port its `<body>` markup into JSX. This is a faithful mechanical port, not a redesign.

**Mechanical transform rules:**
1. `class="x"` -> `className="x"`; `style="a:b;c:d"` -> `style={{ a: 'b', c: 'd' }}` with camelCased CSS property names (`font-size` -> `fontSize`) and string values. Numeric-looking values stay strings (e.g. `flex: '1'`).
2. Self-close void elements: `<br>` -> `<br />`, `<meta ...>` is not ported (metadata moves to the `metadata` export).
3. SVG: keep attributes as they appear (`viewBox`, `fill`, `transform`, `rx`, `x`, `y`, `width`, `height` are all valid JSX SVG attributes). Close tags (`<rect .../>`).
4. Do NOT convert anything to `next/image`; there are no `<img>` tags in the source.
5. Comments `<!-- x -->` -> `{/* x */}` or drop them.
6. Move the `<title>` and `<meta name="description">` out of the markup into the `metadata` export (below). Drop the `<link rel="preconnect">` / Google Fonts `<link>` (the font is handled by the root layout).
7. The `<style>body{...}</style>` in the source head is already covered by `globals.css`; do not port it.

**Em-dash removal (mandatory).** Replace these exact strings during the port:

| Source (with em dash) | Replace with |
|---|---|
| `a run, a meal — the day counts. Works with no signal` | `a run, a meal, the day counts. Works with no signal` |
| `Every tracker is a tile — one tap logs it` | `Every tracker is a tile, one tap logs it` |
| `Basement gym, trail, airplane — everything works` | `Basement gym, trail, airplane, everything works` |
| `Log anything — a workout, a meal, a swim — and the day counts` | `Log anything, a workout, a meal, a swim, and the day counts` |
| `manual logging — that's what the big tiles are for` | `manual logging, that's what the big tiles are for` |
| `syncs everything to the web app — full dashboard on your computer` | `syncs everything to the web app, full dashboard on your computer` |

- [ ] **Step 1: Write the failing test `apps/web/app/page.test.tsx`**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Page, { metadata } from './page';

afterEach(cleanup);

describe('landing page', () => {
  it('exposes SEO metadata with no em dashes', () => {
    expect(metadata.title).toBe('Streka - One slash a day. Keep the streak.');
    expect(String(metadata.description)).toContain('fitness tracker for people building a habit');
    expect(String(metadata.title)).not.toContain('—');
    expect(String(metadata.description)).not.toContain('—');
  });

  it('renders the hero copy and contains no em dashes', () => {
    const { container } = render(<Page />);
    expect(screen.getByText(/fitness tracker for people building a habit/i)).toBeTruthy();
    expect(container.textContent).not.toContain('—');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web exec vitest run app/page.test.tsx`
Expected: FAIL (the placeholder page has no `metadata` export and no hero text).

- [ ] **Step 3: Replace `apps/web/app/page.tsx` with the ported landing + metadata**

Add at the top of the file:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Streka - One slash a day. Keep the streak.',
  description:
    'Streka is a free fitness tracker for people building a habit, not chasing a podium. Log a workout, a run, a meal, the day counts. Works offline.',
};

export default function Home() {
  return (
    <>
      {/* Faithful port of apps/landing/index.html <body>, em dashes removed. */}
      {/* ...ported hero, features, watch strip, web-app section, CTA, footer... */}
    </>
  );
}
```

Port the full `<body>` of `apps/landing/index.html` into the returned fragment, applying the transform rules and the em-dash replacements above. The hero paragraph must read: "Streka is a fitness tracker for people building a habit, not chasing a podium. Log a workout, a run, a meal, the day counts. Works with no signal, syncs when you're back."

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web exec vitest run app/page.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Typecheck and build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

Run: `pnpm --filter web exec next build`
Expected: `/` builds as a static route.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/page.test.tsx
git commit -m "feat(web): port the landing page to a Next.js SSG route with SEO metadata"
```

---

## Task 3: Auth pages (shared form, sign in, sign up)

**Files:**
- Create: `apps/web/components/auth/AuthForm.tsx`, `apps/web/components/auth/AuthForm.test.tsx`, `apps/web/app/signin/page.tsx`, `apps/web/app/signup/page.tsx`

**Interfaces:**
- Consumes: the auth API contract from Global Constraints.
- Produces: `AuthForm({ mode: 'signin' | 'signup' })` (a client component). Task 4 does not depend on it.

- [ ] **Step 1: Write the failing test `apps/web/components/auth/AuthForm.test.tsx`**

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

function mockFetch(res: Partial<Response> & { status: number; ok: boolean }) {
  const fn = vi.fn().mockResolvedValue({ json: async () => ({}), ...res } as Response);
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(cleanup);
beforeEach(() => {
  push.mockReset();
});

describe('AuthForm', () => {
  it('signin success posts credentials and navigates to /app', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200 });
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/signin');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' });
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'password123' });
  });

  it('signin 401 shows the wrong-credentials message and does not navigate', async () => {
    mockFetch({ ok: false, status: 401 });
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('Wrong email or password');
    expect(push).not.toHaveBeenCalled();
  });

  it('signup 409 shows the duplicate-email message', async () => {
    mockFetch({ ok: false, status: 409 });
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('That email is already registered');
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(new Promise((r) => (resolve = r))) as unknown as typeof fetch;
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect((screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement).disabled).toBe(true);
    resolve({ ok: true, status: 200, json: async () => ({}) });
  });
});
```

These assertions use only plain vitest matchers (no `@testing-library/jest-dom`), matching the repo's existing `App.test.tsx` style. Do not add jest-dom.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web exec vitest run components/auth/AuthForm.test.tsx`
Expected: FAIL ("Failed to resolve import './AuthForm'").

- [ ] **Step 3: Create `apps/web/components/auth/AuthForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@streka/tokens';

const ERROR_COPY: Record<number, string> = {
  400: 'Enter a valid email and a password of at least 8 characters',
  401: 'Wrong email or password',
  409: 'That email is already registered',
};

const GENERIC_ERROR = 'Something went wrong, try again';

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const label = mode === 'signin' ? 'Sign in' : 'Sign up';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push('/app');
        return;
      }
      setError(ERROR_COPY[res.status] ?? GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    }
    setBusy(false);
  }

  return (
    <main style={{ maxWidth: 380, margin: '0 auto', padding: '64px 20px' }}>
      <h1 style={{ font: "900 italic 28px 'Archivo'", letterSpacing: '-.03em', margin: '0 0 24px' }}>
        {label}
      </h1>
      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, margin: '14px 0 6px' }}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        {error && (
          <p role="alert" style={{ color: colors.danger, fontSize: 13, fontWeight: 600, margin: '14px 0 0' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} style={buttonStyle(busy)}>
          {busy ? 'Working...' : label}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 18, color: colors.mutedLight }}>
        {mode === 'signin' ? (
          <>New here? <a href="/signup">Create an account</a></>
        ) : (
          <>Already have an account? <a href="/signin">Sign in</a></>
        )}
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '11px 12px',
  borderRadius: 12,
  border: `1px solid ${colors.cardLightBorder}`,
  fontSize: 15,
  fontWeight: 500,
};

function buttonStyle(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    marginTop: 22,
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: colors.ink,
    color: colors.white,
    fontSize: 15,
    fontWeight: 900,
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.6 : 1,
  };
}
```

- [ ] **Step 4: Create the two route pages**

`apps/web/app/signin/page.tsx`:

```tsx
import { AuthForm } from '@/components/auth/AuthForm';

export default function SignInPage() {
  return <AuthForm mode="signin" />;
}
```

`apps/web/app/signup/page.tsx`:

```tsx
import { AuthForm } from '@/components/auth/AuthForm';

export default function SignUpPage() {
  return <AuthForm mode="signup" />;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter web exec vitest run components/auth/AuthForm.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck and build**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

Run: `pnpm --filter web exec next build`
Expected: `/signin` and `/signup` build.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/auth/AuthForm.tsx apps/web/components/auth/AuthForm.test.tsx apps/web/app/signin apps/web/app/signup
git commit -m "feat(web): add sign-in and sign-up pages on the auth API"
```

---

## Task 4: Session-guarded `/app` shell

**Files:**
- Create: `apps/web/components/auth/AuthedContext.tsx`, `apps/web/components/auth/SignOutButton.tsx`, `apps/web/components/auth/SignOutButton.test.tsx`, `apps/web/app/app/layout.tsx`, `apps/web/app/app/layout.test.tsx`, `apps/web/app/app/page.tsx`, `apps/web/app/app/page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/auth/me` -> `200 { user: { email } }` or `401`; `POST /api/auth/signout` -> `204`.
- Produces: the guarded `/app` route. This is the mount point S4b extends with the dashboard.

- [ ] **Step 1: Create the email context `apps/web/components/auth/AuthedContext.tsx`**

```tsx
'use client';

import { createContext, useContext } from 'react';

const AuthedEmailContext = createContext<string | null>(null);

export function AuthedEmailProvider({ email, children }: { email: string; children: React.ReactNode }) {
  return <AuthedEmailContext.Provider value={email}>{children}</AuthedEmailContext.Provider>;
}

export function useAuthedEmail(): string {
  const email = useContext(AuthedEmailContext);
  if (email === null) throw new Error('useAuthedEmail must be used within AuthedEmailProvider');
  return email;
}
```

- [ ] **Step 2: Write the failing guard test `apps/web/app/app/layout.test.tsx`**

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './layout';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

afterEach(cleanup);
beforeEach(() => replace.mockReset());

describe('app segment guard', () => {
  it('renders children when /api/auth/me is authenticated', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { email: 'a@b.com' } }),
    } as Response) as unknown as typeof fetch;

    render(<AppLayout><div>secret content</div></AppLayout>);
    expect(await screen.findByText('secret content')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to /signin when /api/auth/me is 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response) as unknown as typeof fetch;

    render(<AppLayout><div>secret content</div></AppLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/signin'));
    expect(screen.queryByText('secret content')).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter web exec vitest run app/app/layout.test.tsx`
Expected: FAIL ("Failed to resolve import './layout'").

- [ ] **Step 4: Create `apps/web/app/app/layout.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthedEmailProvider } from '@/components/auth/AuthedContext';

type State = { status: 'loading' } | { status: 'authed'; email: string };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setState({ status: 'authed', email: data.user.email });
        } else {
          router.replace('/signin');
        }
      })
      .catch(() => {
        // A dead API is treated like a missing session so /app never hangs.
        if (active) router.replace('/signin');
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (state.status === 'loading') {
    return <main style={{ padding: 24 }}>Loading...</main>;
  }
  return <AuthedEmailProvider email={state.email}>{children}</AuthedEmailProvider>;
}
```

- [ ] **Step 5: Run the guard test to verify it passes**

Run: `pnpm --filter web exec vitest run app/app/layout.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Write the failing SignOutButton test `apps/web/components/auth/SignOutButton.test.tsx`**

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignOutButton } from './SignOutButton';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

afterEach(cleanup);
beforeEach(() => replace.mockReset());

describe('SignOutButton', () => {
  it('posts to /api/auth/signout and returns to /', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<SignOutButton />);
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/signout');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' });
  });
});
```

- [ ] **Step 7: Run to verify it fails, then create `apps/web/components/auth/SignOutButton.tsx`**

Run: `pnpm --filter web exec vitest run components/auth/SignOutButton.test.tsx`
Expected: FAIL ("Failed to resolve import './SignOutButton'").

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@streka/tokens';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
    router.replace('/');
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        padding: '10px 18px',
        borderRadius: 14,
        border: `1px solid ${colors.cardLightBorder}`,
        background: colors.white,
        fontSize: 14,
        fontWeight: 800,
        cursor: busy ? 'default' : 'pointer',
      }}
    >
      Sign out
    </button>
  );
}
```

Run: `pnpm --filter web exec vitest run components/auth/SignOutButton.test.tsx`
Expected: PASS.

- [ ] **Step 8: Write the failing shell page test `apps/web/app/app/page.test.tsx`**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppHome from './page';
import { AuthedEmailProvider } from '@/components/auth/AuthedContext';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

afterEach(cleanup);

describe('app home', () => {
  it('greets the signed-in user and shows a sign-out button', () => {
    render(
      <AuthedEmailProvider email="a@b.com">
        <AppHome />
      </AuthedEmailProvider>,
    );
    expect(screen.getByText(/a@b\.com/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy();
  });
});
```

- [ ] **Step 9: Run to verify it fails, then create `apps/web/app/app/page.tsx`**

Run: `pnpm --filter web exec vitest run app/app/page.test.tsx`
Expected: FAIL ("Failed to resolve import './page'").

```tsx
'use client';

import { useAuthedEmail } from '@/components/auth/AuthedContext';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default function AppHome() {
  const email = useAuthedEmail();
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 20px' }}>
      <h1 style={{ font: "900 italic 32px 'Archivo'", letterSpacing: '-.03em', margin: 0 }}>
        You are signed in
      </h1>
      <p style={{ margin: '12px 0 28px', fontWeight: 600 }}>Signed in as {email}</p>
      <SignOutButton />
    </main>
  );
}
```

Run: `pnpm --filter web exec vitest run app/app/page.test.tsx`
Expected: PASS.

- [ ] **Step 10: Full web test run, typecheck, and build**

Run: `pnpm --filter web test`
Expected: all suites pass (landing, AuthForm, guard, SignOutButton, app home, and the retained `src/App.test.tsx`).

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

Run: `pnpm --filter web exec next build`
Expected: `/`, `/signin`, `/signup`, `/app` all build.

- [ ] **Step 11: Commit**

```bash
git add apps/web/components/auth apps/web/app/app
git commit -m "feat(web): add session-guarded /app shell with sign-out"
```

---

## Task 5: Retire `apps/landing` and finalize

**Files:**
- Delete: `apps/landing/` (entire directory)
- Modify: root `package.json` (typecheck script)

**Interfaces:**
- Consumes: nothing.
- Produces: a clean workspace with a single web app.

- [ ] **Step 1: Delete the standalone landing app**

Run: `git rm -r apps/landing`

- [ ] **Step 2: Update the root `package.json` typecheck script**

The `'!landing'` filter existed only because `apps/landing` had no `tsconfig.json`. With it gone, every remaining workspace (`web`, `server`, `mobile`, `core`, `tokens`) has a `tsconfig.json`, so drop the filter. Change:

```json
    "typecheck": "pnpm --filter '!landing' -r exec tsc --noEmit"
```
to:
```json
    "typecheck": "pnpm -r exec tsc --noEmit"
```

- [ ] **Step 3: Refresh the lockfile**

Run: `pnpm install`
Expected: completes; `apps/landing` no longer appears as a workspace project.

- [ ] **Step 4: Full verification**

Run: `pnpm -s typecheck`
Expected: passes across all workspaces (exit 0, no errors).

Run: `pnpm --filter web test`
Expected: all web suites pass.

Run: `pnpm --filter server exec vitest run`
Expected: 50/50 (confirms S4a did not touch the server).

Run: `pnpm --filter web exec next build`
Expected: `/`, `/signin`, `/signup`, `/app` build with no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git rm -r --cached --ignore-unmatch apps/landing
git commit -m "chore: retire the standalone apps/landing (folded into the Next.js web app)"
```

---

## Deferred to a later slice (do NOT do in S4a)

- **Server-side/middleware auth guard** (removes the brief `/app` auth flash). S4a uses the client guard.
- **TAD.md / DOGFOOD.md doc sync.** `docs/TAD.md` section 7 (apps/landing), its component tree, and milestone lines still describe the old layout. Leave them; the whole web surface reaches its final shape only after S4b, so sync the docs once at the end of S4 rather than twice.
- **turbo.json `build` outputs** still say `dist/**`; Next emits to `.next`. Caching is suboptimal for web but the build works. Revisit if build caching matters.
- **The Board/Trends/Goals dashboard on `/sync`** is S4b. The retained `src/sections/*` and `src/components/*` are its port source. Note for S4b: those files use the em-dash glyph as a no-data placeholder (e.g. `title="—"` in `Board.tsx`); replace per the no-em-dash rule when porting.

---

## Self-Review

**Spec coverage:** landing SSG + SEO (Task 2), auth pages + flow (Task 3), session-guarded `/app` shell (Task 4), same-origin `/api` rewrite with zero server change (Task 1), Archivo via next/font/google (Task 1), convert-in-place + retain src as port source (Task 1, constraints), retire apps/landing + root script (Task 5), vitest testing bar (all tasks). No server change anywhere. Covered.

**Placeholder scan:** the Task 1 `app/page.tsx` is an explicit, intentionally-temporary placeholder replaced in Task 2 (not a plan gap); the Task 2 landing body is a faithful port of a concrete existing file with explicit transform rules and an em-dash table (not a "TODO"). No other placeholders.

**Type consistency:** `AuthForm({ mode })`, `useAuthedEmail(): string`, `AuthedEmailProvider({ email, children })`, and the `/api/auth/*` URLs match across tasks and tests. The auth response shape `{ user: { email } }` is used consistently by the guard and the shell.
