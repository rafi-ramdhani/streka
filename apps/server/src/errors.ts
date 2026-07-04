import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

// One JSON error surface for the whole app. A thrown HTTPException carries its
// own status and message; anything else is an unexpected fault, logged
// server-side and returned as an opaque 500 so internals never reach the client.
export function installErrorHandlers(app: Hono<any>): void {
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error(err);
    return c.json({ error: 'internal error' }, 500);
  });

  app.notFound((c) => c.json({ error: 'not found' }, 404));
}
