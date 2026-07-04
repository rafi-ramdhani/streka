import { asc, eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';
import { logEntries, users } from './schema';
import { makeTestDb } from '../test-helpers';

let db: Awaited<ReturnType<typeof makeTestDb>>;
beforeEach(async () => {
  db = await makeTestDb();
});

async function seedUser(email: string): Promise<string> {
  const [u] = await db.insert(users).values({ email, passwordHash: 'x' }).returning();
  return u!.id;
}

const row = (id: string, userId: string, updatedAt: number) => ({
  id,
  userId,
  ts: updatedAt,
  day: '2026-07-04',
  tracker: 'gym',
  source: 'manual',
  kind: 'workout',
  payload: { kind: 'workout' },
  deleted: false,
  updatedAt,
});

test('server_seq auto-populates and increases with each insert', async () => {
  const userId = await seedUser('a@example.com');
  await db.insert(logEntries).values(row('id-1', userId, 1));
  await db.insert(logEntries).values(row('id-2', userId, 2));
  const rows = await db.select().from(logEntries).orderBy(asc(logEntries.serverSeq));
  expect(rows).toHaveLength(2);
  expect(typeof rows[0]!.serverSeq).toBe('number');
  expect(rows[0]!.serverSeq).toBeLessThan(rows[1]!.serverSeq);
});

test('composite PK lets two users hold the same client id independently', async () => {
  const a = await seedUser('a@example.com');
  const b = await seedUser('b@example.com');
  await db.insert(logEntries).values(row('shared-id', a, 1));
  await db.insert(logEntries).values(row('shared-id', b, 2));
  const rows = await db.select().from(logEntries);
  expect(rows).toHaveLength(2);
});

test('log_entries round-trips a jsonb payload and defaults deleted to false', async () => {
  const userId = await seedUser('jt@example.com');
  await db.insert(logEntries).values({
    id: 'test-entry-1',
    userId,
    ts: 1_720_000_000_000,
    day: '2026-07-04',
    tracker: 'steps',
    source: 'manual',
    kind: 'steps',
    payload: { kind: 'steps', count: 8200 },
    updatedAt: 1_720_000_000_000,
    // deleted omitted on purpose: column default should apply
  });
  const rows = await db.select().from(logEntries).where(eq(logEntries.id, 'test-entry-1'));
  expect(rows).toHaveLength(1);
  expect(rows[0]!.payload).toEqual({ kind: 'steps', count: 8200 });
  expect(rows[0]!.deleted).toBe(false);
});
