import { and, eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';
import { logEntries, users } from '../db/schema';
import { makeTestDb } from '../test-helpers';
import { pullChanges, pushEntries, pushSettings } from './merge';
import type { PushEntry } from './validation';

let db: Awaited<ReturnType<typeof makeTestDb>>;
beforeEach(async () => {
  db = await makeTestDb();
});

async function seedUser(email: string): Promise<string> {
  const [u] = await db.insert(users).values({ email, passwordHash: 'x' }).returning();
  return u!.id;
}

const entry = (over: Partial<PushEntry> = {}): PushEntry => ({
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  ts: 1,
  day: '2026-07-04',
  tracker: 'gym',
  source: 'manual',
  kind: 'workout',
  payload: { kind: 'workout', minutes: 30 },
  deleted: false,
  updatedAt: 100,
  ...over,
});

test('push then pull returns the stored entry with a cursor', async () => {
  const userId = await seedUser('a@example.com');
  await pushEntries(db, userId, [entry()]);
  const res = await pullChanges(db, userId, 0);
  expect(res.entries).toHaveLength(1);
  expect(res.entries[0]!.id).toBe(entry().id);
  expect(res.entries[0]!.payload).toEqual({ kind: 'workout', minutes: 30 });
  expect(res.cursor).toBeGreaterThan(0);
  expect(res.hasMore).toBe(false);
});

test('a newer updatedAt overwrites (LWW forward)', async () => {
  const userId = await seedUser('a@example.com');
  await pushEntries(db, userId, [entry({ updatedAt: 100, kind: 'workout' })]);
  await pushEntries(db, userId, [entry({ updatedAt: 200, kind: 'run' })]);
  const [stored] = await db.select().from(logEntries).where(eq(logEntries.userId, userId));
  expect(stored!.kind).toBe('run');
  expect(stored!.updatedAt).toBe(200);
});

test('an equal or older updatedAt is a no-op and does not bump the cursor', async () => {
  const userId = await seedUser('a@example.com');
  await pushEntries(db, userId, [entry({ updatedAt: 200, kind: 'run' })]);
  const afterWin = await pullChanges(db, userId, 0);
  const cursor = afterWin.cursor;

  await pushEntries(db, userId, [entry({ updatedAt: 200, kind: 'meal' })]); // equal: reject
  await pushEntries(db, userId, [entry({ updatedAt: 150, kind: 'meal' })]); // older: reject

  const [stored] = await db.select().from(logEntries).where(eq(logEntries.userId, userId));
  expect(stored!.kind).toBe('run');
  const afterStale = await pullChanges(db, userId, cursor);
  expect(afterStale.entries).toHaveLength(0);
});

test('a tombstone replicates through pull', async () => {
  const userId = await seedUser('a@example.com');
  await pushEntries(db, userId, [entry({ updatedAt: 100 })]);
  await pushEntries(db, userId, [entry({ updatedAt: 200, deleted: true })]);
  const res = await pullChanges(db, userId, 0);
  expect(res.entries).toHaveLength(1);
  expect(res.entries[0]!.deleted).toBe(true);
});

test('isolation: a colliding id does not cross accounts', async () => {
  const a = await seedUser('a@example.com');
  const b = await seedUser('b@example.com');
  await pushEntries(db, a, [entry({ updatedAt: 100, kind: 'workout' })]);
  await pushEntries(db, b, [entry({ updatedAt: 999, kind: 'run' })]); // same id, higher updatedAt

  const aRes = await pullChanges(db, a, 0);
  expect(aRes.entries).toHaveLength(1);
  expect(aRes.entries[0]!.kind).toBe('workout'); // A's row untouched

  const bRes = await pullChanges(db, b, 0);
  expect(bRes.entries).toHaveLength(1);
  expect(bRes.entries[0]!.kind).toBe('run');

  const aRows = await db
    .select()
    .from(logEntries)
    .where(and(eq(logEntries.userId, a), eq(logEntries.id, entry().id)));
  expect(aRows[0]!.kind).toBe('workout');
});

test('pull only returns rows newer than the cursor', async () => {
  const userId = await seedUser('a@example.com');
  await pushEntries(db, userId, [entry({ id: '11111111-1111-4111-8111-111111111111', updatedAt: 1 })]);
  const first = await pullChanges(db, userId, 0);
  await pushEntries(db, userId, [entry({ id: '22222222-2222-4222-8222-222222222222', updatedAt: 2 })]);
  const second = await pullChanges(db, userId, first.cursor);
  expect(second.entries).toHaveLength(1);
  expect(second.entries[0]!.id).toBe('22222222-2222-4222-8222-222222222222');
});

test('pagination: hasMore drives a loop that terminates and loses nothing', async () => {
  const userId = await seedUser('a@example.com');
  const ids = ['a', 'b', 'c', 'd', 'e'].map((c) => `${c}0000000-0000-4000-8000-000000000000`);
  for (const id of ids) await pushEntries(db, userId, [entry({ id, updatedAt: 1 })]);

  const seen = new Set<string>();
  let cursor = 0;
  let hasMore = true;
  let rounds = 0;
  while (hasMore) {
    const page = await pullChanges(db, userId, cursor, 2); // small limit forces pages
    for (const e of page.entries) seen.add(e.id);
    cursor = page.cursor;
    hasMore = page.hasMore;
    if (++rounds > 20) throw new Error('pagination did not terminate');
  }
  expect(seen.size).toBe(5);
});

test('settings sync mirrors entries (LWW, isolation, pull-since)', async () => {
  const a = await seedUser('a@example.com');
  const b = await seedUser('b@example.com');
  await pushSettings(db, a, [{ key: 'theme', value: 'dark', updatedAt: 100 }]);
  await pushSettings(db, a, [{ key: 'theme', value: 'light', updatedAt: 50 }]); // older: reject
  await pushSettings(db, b, [{ key: 'theme', value: 'blue', updatedAt: 100 }]);

  const aRes = await pullChanges(db, a, 0);
  expect(aRes.settings).toHaveLength(1);
  expect(aRes.settings[0]!.value).toBe('dark');
  const bRes = await pullChanges(db, b, 0);
  expect(bRes.settings[0]!.value).toBe('blue');
});
