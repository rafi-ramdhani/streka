import { expect, test } from 'vitest';
import { createRateLimiter } from './rate-limit';

test('allows up to the limit, then blocks, then resets after the window', () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
  expect(rl.check('a').allowed).toBe(true);
  expect(rl.check('a').allowed).toBe(true);
  const blocked = rl.check('a');
  expect(blocked.allowed).toBe(false);
  expect(blocked.retryAfterS).toBe(1);
  t = 1000;
  expect(rl.check('a').allowed).toBe(true);
});

test('tracks distinct keys independently', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
  expect(rl.check('a').allowed).toBe(true);
  expect(rl.check('b').allowed).toBe(true);
  expect(rl.check('a').allowed).toBe(false);
});
