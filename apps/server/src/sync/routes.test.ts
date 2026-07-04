import { beforeEach, expect, test } from 'vitest';
import { createApp } from '../app';
import { makeTestDb } from '../test-helpers';

let app: ReturnType<typeof createApp>;
beforeEach(async () => {
  app = createApp(await makeTestDb());
});

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

async function signUp(email: string): Promise<string> {
  const res = await app.request('/auth/signup', json({ email, password: 'hunter2horse' }));
  return sessionCookie(res);
}

const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const entry = (over: Record<string, unknown> = {}) => ({
  id: UUID,
  ts: 1,
  day: '2026-07-04',
  tracker: 'gym',
  source: 'manual',
  kind: 'workout',
  payload: { kind: 'workout' },
  deleted: false,
  updatedAt: 100,
  ...over,
});

function sync(cookie: string, body: unknown) {
  return app.request('/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
}

test('POST /sync without a session returns 401', async () => {
  const res = await app.request('/sync', json({ cursor: 0 }));
  expect(res.status).toBe(401);
});

test('push then the same call echoes the row back', async () => {
  const cookie = await signUp('a@example.com');
  const res = await sync(cookie, { cursor: 0, entries: [entry()] });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { cursor: number; entries: { id: string }[]; hasMore: boolean };
  expect(body.entries).toHaveLength(1);
  expect(body.entries[0]!.id).toBe(UUID);
  expect(body.cursor).toBeGreaterThan(0);
  expect(body.hasMore).toBe(false);
});

test('one account cannot see another account rows', async () => {
  const a = await signUp('a@example.com');
  const b = await signUp('b@example.com');
  await sync(a, { cursor: 0, entries: [entry()] });
  const res = await sync(b, { cursor: 0 });
  const body = (await res.json()) as { entries: unknown[] };
  expect(body.entries).toHaveLength(0);
});

test('a malformed entry returns 400', async () => {
  const cookie = await signUp('a@example.com');
  const res = await sync(cookie, { cursor: 0, entries: [entry({ id: 'not-a-uuid' })] });
  expect(res.status).toBe(400);
});
