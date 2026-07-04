import { serve } from '@hono/node-server';
import { createApp } from './app';
import { pruneExpiredSessions } from './auth/sessions';
import { createDb } from './db/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = createDb(url);
const app = createApp(db);
const port = Number(process.env.PORT ?? 3001);

// Session-table housekeeping: sweep once on boot, then every 6 hours. unref() so
// the timer never keeps the process alive during shutdown.
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const sweep = () =>
  pruneExpiredSessions(db).catch((err) => console.error('session prune failed', err));
sweep();
setInterval(sweep, SIX_HOURS_MS).unref();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`streka server listening on :${info.port}`);
});
