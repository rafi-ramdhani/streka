import { beforeEach, expect, test } from 'vitest';
import { createApp } from '../app';
import { makeTestDb } from '../test-helpers';

let app: ReturnType<typeof createApp>;
beforeEach(async () => {
  app = createApp(await makeTestDb());
});

const creds = { email: 'ana@example.com', password: 'hunter2horse' };
const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function sessionCookie(res: Response): string {
  const raw = res.headers.get('set-cookie') ?? '';
  const m = raw.match(/streka_session=([^;]+)/);
  if (!m) throw new Error('no session cookie in response');
  return `streka_session=${m[1]}`;
}

test('signup creates a user, sets a cookie, and hides the hash', async () => {
  const res = await app.request('/auth/signup', json(creds));
  expect(res.status).toBe(201);
  const body = (await res.json()) as { user: { email: string; passwordHash?: string } };
  expect(body.user.email).toBe('ana@example.com');
  expect(body.user.passwordHash).toBeUndefined();
  expect(res.headers.get('set-cookie')).toMatch(/streka_session=/);
});

test('signup with a duplicate email returns 409 (case-insensitive)', async () => {
  await app.request('/auth/signup', json(creds));
  const res = await app.request('/auth/signup', json({ ...creds, email: 'ANA@example.com' }));
  expect(res.status).toBe(409);
});

test('signup with a short password returns 400', async () => {
  const res = await app.request('/auth/signup', json({ email: 'x@example.com', password: 'short' }));
  expect(res.status).toBe(400);
});

test('signin with the right password returns 200 and a cookie', async () => {
  await app.request('/auth/signup', json(creds));
  const res = await app.request('/auth/signin', json(creds));
  expect(res.status).toBe(200);
  expect(res.headers.get('set-cookie')).toMatch(/streka_session=/);
});

test('signin with the wrong password returns 401', async () => {
  await app.request('/auth/signup', json(creds));
  const res = await app.request('/auth/signin', json({ ...creds, password: 'wrongpassword' }));
  expect(res.status).toBe(401);
});

test('signin with an unknown email returns 401', async () => {
  const res = await app.request('/auth/signin', json(creds));
  expect(res.status).toBe(401);
});

test('GET /auth/me with a valid cookie returns the user', async () => {
  const signup = await app.request('/auth/signup', json(creds));
  const cookie = sessionCookie(signup);
  const res = await app.request('/auth/me', { headers: { Cookie: cookie } });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { user: { email: string } };
  expect(body.user.email).toBe('ana@example.com');
});

test('GET /auth/me without a session returns 401', async () => {
  const res = await app.request('/auth/me');
  expect(res.status).toBe(401);
});

test('signout revokes the session so the cookie stops working', async () => {
  const signup = await app.request('/auth/signup', json(creds));
  const cookie = sessionCookie(signup);
  const out = await app.request('/auth/signout', { method: 'POST', headers: { Cookie: cookie } });
  expect(out.status).toBe(204);
  const me = await app.request('/auth/me', { headers: { Cookie: cookie } });
  expect(me.status).toBe(401);
});

test('signout without a session is idempotent (204)', async () => {
  const res = await app.request('/auth/signout', { method: 'POST' });
  expect(res.status).toBe(204);
});

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
