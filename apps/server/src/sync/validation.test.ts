import { expect, test } from 'vitest';
import { syncRequestSchema } from './validation';

const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const entry = (over: Record<string, unknown> = {}) => ({
  id: UUID,
  ts: 1,
  day: '2026-07-04',
  tracker: 'gym',
  source: 'manual',
  kind: 'workout',
  payload: { kind: 'workout', minutes: 30 },
  deleted: false,
  updatedAt: 100,
  ...over,
});

test('accepts a well-formed request and defaults empty arrays', () => {
  const parsed = syncRequestSchema.safeParse({ cursor: 0 });
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(parsed.data.entries).toEqual([]);
    expect(parsed.data.settings).toEqual([]);
  }
});

test('accepts entries and settings', () => {
  const parsed = syncRequestSchema.safeParse({
    cursor: 5,
    entries: [entry()],
    settings: [{ key: 'theme', value: 'dark', updatedAt: 1 }],
  });
  expect(parsed.success).toBe(true);
});

test('rejects a non-uuid id', () => {
  expect(syncRequestSchema.safeParse({ cursor: 0, entries: [entry({ id: 'nope' })] }).success).toBe(false);
});

test('rejects a bad day format', () => {
  expect(syncRequestSchema.safeParse({ cursor: 0, entries: [entry({ day: '07-04-2026' })] }).success).toBe(false);
});

test('rejects a non-integer updatedAt', () => {
  expect(syncRequestSchema.safeParse({ cursor: 0, entries: [entry({ updatedAt: 1.5 })] }).success).toBe(false);
});

test('rejects a payload that is not an object', () => {
  expect(syncRequestSchema.safeParse({ cursor: 0, entries: [entry({ payload: 'x' })] }).success).toBe(false);
});

test('rejects a negative cursor', () => {
  expect(syncRequestSchema.safeParse({ cursor: -1 }).success).toBe(false);
});

test('rejects an over-limit entries batch', () => {
  const entries = Array.from({ length: 501 }, () => entry());
  expect(syncRequestSchema.safeParse({ cursor: 0, entries }).success).toBe(false);
});

test('rejects a setting with a missing value', () => {
  expect(syncRequestSchema.safeParse({ cursor: 0, settings: [{ key: 'k', updatedAt: 1 }] }).success).toBe(false);
});
