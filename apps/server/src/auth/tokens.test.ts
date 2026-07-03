import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { generateSessionToken, hashToken } from './tokens';

test('generateSessionToken returns distinct tokens', () => {
  expect(generateSessionToken().token).not.toBe(generateSessionToken().token);
});

test('tokenHash is the sha256 hex of the token', () => {
  const { token, tokenHash } = generateSessionToken();
  expect(tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
  expect(hashToken(token)).toBe(tokenHash);
});
