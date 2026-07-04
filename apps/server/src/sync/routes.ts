import type { PgDatabase } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import { requireAuth } from '../auth/middleware';
import { pullChanges, pushEntries, pushSettings } from './merge';
import { syncRequestSchema } from './validation';

// One combined endpoint: push the client's outbox, then pull everything newer
// than the cursor (including the just-pushed rows, so a stale client self-
// corrects). Push and pull run in one transaction, so a failed row applies
// nothing. user_id always comes from the session, never the request body.
export function createSyncRoutes(db: PgDatabase<any, any>) {
  const app = new Hono<{ Variables: { userId: string } }>();

  app.post('/', requireAuth(db), async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = syncRequestSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid sync request' }, 400);
    const userId = c.get('userId');

    const result = await db.transaction(async (tx) => {
      await pushEntries(tx, userId, parsed.data.entries);
      await pushSettings(tx, userId, parsed.data.settings);
      return pullChanges(tx, userId, parsed.data.cursor);
    });

    return c.json(result);
  });

  return app;
}
