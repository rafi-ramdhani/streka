import type { Context, MiddlewareHandler } from 'hono';

export type RateLimiter = {
  check(key: string): { allowed: boolean; retryAfterS: number };
};

// In-memory fixed-window limiter. Each limiter owns its own bucket map (closure
// state, not module-global) so a fresh app in tests starts clean. Expired
// buckets are reset lazily when their key is next seen. Single-instance only:
// the counts live in this process and are not shared across instances.
export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const { limit, windowMs, now = () => Date.now() } = opts;
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key) {
      const t = now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        buckets.set(key, { count: 1, resetAt: t + windowMs });
        return { allowed: true, retryAfterS: 0 };
      }
      if (bucket.count < limit) {
        bucket.count += 1;
        return { allowed: true, retryAfterS: 0 };
      }
      return { allowed: false, retryAfterS: Math.ceil((bucket.resetAt - t) / 1000) };
    },
  };
}

// Client IP from the reverse proxy's X-Forwarded-For first hop. Without a proxy
// the header is absent and everyone shares one bucket (fail toward throttling,
// never crash).
function clientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    if (first && first.trim()) return first.trim();
  }
  return 'shared';
}

export function rateLimitMiddleware(limiter: RateLimiter): MiddlewareHandler {
  return async (c, next) => {
    const { allowed, retryAfterS } = limiter.check(clientIp(c));
    if (!allowed) {
      c.header('Retry-After', String(retryAfterS));
      return c.json({ error: 'too many requests' }, 429);
    }
    await next();
  };
}
