import { Hono } from 'hono';
import { beforeEach, expect, test } from 'vitest';
import { users } from '../db/schema';
import { makeTestDb } from '../test-helpers';
import { createSession } from './sessions';
import { requireAuth } from './middleware';

let db: Awaited<ReturnType<typeof makeTestDb>>;
beforeEach(async () => {
  db = await makeTestDb();
});

function protectedApp() {
  const app = new Hono<{ Variables: { userId: string } }>();
  app.get('/protected', requireAuth(db), (c) => c.json({ userId: c.get('userId') }));
  return app;
}

test('requireAuth rejects a request with no token', async () => {
  const res = await protectedApp().request('/protected');
  expect(res.status).toBe(401);
});

test('requireAuth rejects an invalid token', async () => {
  const res = await protectedApp().request('/protected', {
    headers: { Authorization: 'Bearer not-a-real-token' },
  });
  expect(res.status).toBe(401);
});

test('requireAuth accepts a valid bearer token and sets userId', async () => {
  const [user] = await db
    .insert(users)
    .values({ email: 'mw@example.com', passwordHash: 'x' })
    .returning();
  const { token } = await createSession(db, user!.id);
  const res = await protectedApp().request('/protected', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ userId: user!.id });
});
