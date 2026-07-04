import { sql } from 'drizzle-orm';
import type { AppDb } from '../db/client';
import { Hono } from 'hono';
import { requireAuth } from '../auth/middleware';
import { pullChanges, pushEntries, pushSettings } from './merge';
import { syncRequestSchema } from './validation';

// One combined endpoint: push the client's outbox, then pull everything newer
// than the cursor (including the just-pushed rows, so a stale client self-
// corrects). Push and pull run in one transaction, so a failed row applies
// nothing. user_id always comes from the session, never the request body.
export function createSyncRoutes(db: AppDb) {
  const app = new Hono<{ Variables: { userId: string } }>();

  app.post('/', requireAuth(db), async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = syncRequestSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid sync request' }, 400);
    const userId = c.get('userId');

    const result = await db.transaction(async (tx) => {
      // Serialize concurrent syncs for the same account. server_seq comes from a
      // bare sequence, so without this two overlapping /sync transactions could
      // assign seqs in one order but commit in another, letting a puller advance
      // its cursor past a lower seq that commits slightly later (silent row loss).
      // The lock is held until this transaction commits (xact-scoped).
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}::text, 0))`);
      await pushEntries(tx, userId, parsed.data.entries);
      await pushSettings(tx, userId, parsed.data.settings);
      return pullChanges(tx, userId, parsed.data.cursor);
    });

    return c.json(result);
  });

  return app;
}
