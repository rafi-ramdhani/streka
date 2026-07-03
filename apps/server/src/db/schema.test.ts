import { beforeAll, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestDb } from '../test-helpers';
import { logEntries, sessions, users } from './schema';

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

test('sessions round-trips with a user FK', async () => {
  const [user] = await db
    .insert(users)
    .values({ email: 'sess@example.com', passwordHash: 'x' })
    .returning();

  const expiresAt = new Date(Date.now() + 60_000);
  await db.insert(sessions).values({
    userId: user!.id,
    tokenHash: 'deadbeef',
    expiresAt,
  });

  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, 'deadbeef'));
  expect(rows).toHaveLength(1);
  expect(rows[0]!.userId).toBe(user!.id);
  expect(rows[0]!.expiresAt.getTime()).toBe(expiresAt.getTime());
});
