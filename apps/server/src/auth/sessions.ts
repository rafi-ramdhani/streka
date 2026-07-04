import { eq, lte } from 'drizzle-orm';
import type { AppDb } from '../db/client';
import { sessions } from '../db/schema';
import { generateSessionToken, hashToken } from './tokens';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(
  db: AppDb,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
  await db.insert(sessions).values({ userId, tokenHash, expiresAt });
  return { token, expiresAt };
}

export async function validateSession(
  db: AppDb,
  token: string,
): Promise<{ userId: string } | null> {
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return { userId: row.userId };
}

export async function revokeSession(db: AppDb, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

// Housekeeping: drop sessions whose expiry has passed so the table does not grow
// without bound. Returns how many rows were removed. Called on boot and on an
// interval from index.ts.
export async function pruneExpiredSessions(db: AppDb): Promise<number> {
  const removed = await db
    .delete(sessions)
    .where(lte(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return removed.length;
}
