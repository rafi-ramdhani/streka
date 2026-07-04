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

test('an unknown route on the real app returns JSON 404', async () => {
  const res = await app.request('/no-such-path');
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'not found' });
});
