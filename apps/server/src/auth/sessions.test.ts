import { eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';
import { sessions, users } from '../db/schema';
import { makeTestDb } from '../test-helpers';
import { createSession, revokeSession, validateSession } from './sessions';
import { hashToken } from './tokens';

let db: Awaited<ReturnType<typeof makeTestDb>>;
beforeEach(async () => {
  db = await makeTestDb();
});

async function makeUser() {
  const [u] = await db
    .insert(users)
    .values({ email: `u-${Math.random()}@example.com`, passwordHash: 'x' })
    .returning();
  return u!;
}

test('createSession then validateSession returns the userId', async () => {
  const u = await makeUser();
  const { token } = await createSession(db, u.id);
  expect(await validateSession(db, token)).toEqual({ userId: u.id });
});

test('validateSession returns null for an unknown token', async () => {
  expect(await validateSession(db, 'bogus-token')).toBeNull();
});

test('validateSession returns null for an expired session', async () => {
  const u = await makeUser();
  const { token } = await createSession(db, u.id);
  await db
    .update(sessions)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(sessions.tokenHash, hashToken(token)));
  expect(await validateSession(db, token)).toBeNull();
});

test('revokeSession invalidates the token', async () => {
  const u = await makeUser();
  const { token } = await createSession(db, u.id);
  await revokeSession(db, token);
  expect(await validateSession(db, token)).toBeNull();
});
