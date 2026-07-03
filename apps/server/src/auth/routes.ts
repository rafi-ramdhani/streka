import { eq } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { users } from '../db/schema';
import { hashPassword, verifyPassword } from './password';
import { readToken, requireAuth, SESSION_COOKIE } from './middleware';
import { createSession, revokeSession } from './sessions';
import { credentialsSchema } from './validation';

const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

type UserRow = { id: string; email: string; passwordHash: string; createdAt: Date };
const publicUser = (u: UserRow) => ({ id: u.id, email: u.email, createdAt: u.createdAt });

function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: THIRTY_DAYS_S,
  });
}

// Cached argon2id hash used only to equalize signin timing on the unknown-email
// path, so response time does not reveal whether an email exists.
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  return (dummyHash ??= hashPassword('streka-timing-equalizer'));
}

export function createAuthRoutes(db: PgDatabase<any, any>) {
  const app = new Hono<{ Variables: { userId: string } }>();

  app.post('/signup', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = credentialsSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid email or password format' }, 400);
    const email = parsed.data.email.trim().toLowerCase();

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return c.json({ error: 'email already registered' }, 409);

    const passwordHash = await hashPassword(parsed.data.password);
    const [user] = await db.insert(users).values({ email, passwordHash }).onConflictDoNothing().returning();
    if (!user) return c.json({ error: 'email already registered' }, 409);
    const { token } = await createSession(db, user.id);
    setSessionCookie(c, token);
    return c.json({ user: publicUser(user) }, 201);
  });

  app.post('/signin', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = credentialsSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'invalid email or password format' }, 400);
    const email = parsed.data.email.trim().toLowerCase();

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      await verifyPassword(parsed.data.password, await getDummyHash());
      return c.json({ error: 'invalid email or password' }, 401);
    }
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) return c.json({ error: 'invalid email or password' }, 401);

    const { token } = await createSession(db, user.id);
    setSessionCookie(c, token);
    return c.json({ user: publicUser(user) });
  });

  app.post('/signout', async (c) => {
    const token = readToken(c);
    if (token) await revokeSession(db, token);
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.body(null, 204);
  });

  app.get('/me', requireAuth(db), async (c) => {
    const userId = c.get('userId');
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    return c.json({ user: publicUser(user) });
  });

  return app;
}
