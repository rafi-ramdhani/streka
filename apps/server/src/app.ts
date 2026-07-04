import { sql } from 'drizzle-orm';
import type { AppDb } from './db/client';
import { Hono } from 'hono';
import { createAuthRoutes } from './auth/routes';
import { createSyncRoutes } from './sync/routes';

// The db is injected so the same app runs against postgres.js (dev/prod) and
// pglite (tests). AppDb is the common base both drivers extend.
export function createApp(db: AppDb) {
  const app = new Hono();

  app.get('/health', async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true, db: 'up' });
    } catch {
      return c.json({ ok: false, db: 'down' }, 503);
    }
  });

  app.route('/auth', createAuthRoutes(db));
  app.route('/sync', createSyncRoutes(db));

  return app;
}
