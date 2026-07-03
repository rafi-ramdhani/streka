import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createDb } from './db/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const app = createApp(createDb(url));
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`streka server listening on :${info.port}`);
});
