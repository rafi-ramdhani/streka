import { expect, test } from 'vitest';
import { hashPassword, verifyPassword } from './password';

test('hashPassword then verifyPassword succeeds', async () => {
  const stored = await hashPassword('correct horse battery');
  expect(stored.startsWith('$argon2id$')).toBe(true);
  expect(await verifyPassword('correct horse battery', stored)).toBe(true);
});

test('verifyPassword fails on the wrong password', async () => {
  const stored = await hashPassword('correct horse battery');
  expect(await verifyPassword('wrong password', stored)).toBe(false);
});

test('two hashes of the same password differ (random salt)', async () => {
  const a = await hashPassword('same-password');
  const b = await hashPassword('same-password');
  expect(a).not.toBe(b);
});

test('a malformed stored hash returns false, does not throw', async () => {
  expect(await verifyPassword('pw', 'not-a-real-hash')).toBe(false);
  expect(await verifyPassword('pw', '')).toBe(false);
});
