import type { AppDb } from '../db/client';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { validateSession } from './sessions';

export const SESSION_COOKIE = 'streka_session';

export function readToken(c: Context): string | null {
  const cookie = getCookie(c, SESSION_COOKIE);
  if (cookie) return cookie;
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length);
  return null;
}

export function requireAuth(
  db: AppDb,
): MiddlewareHandler<{ Variables: { userId: string } }> {
  return async (c, next) => {
    const token = readToken(c);
    if (!token) return c.json({ error: 'unauthorized' }, 401);
    const session = await validateSession(db, token);
    if (!session) return c.json({ error: 'unauthorized' }, 401);
    c.set('userId', session.userId);
    await next();
  };
}
