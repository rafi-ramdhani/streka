import { describe, expect, it } from 'vitest';
import { BackupError, parseBackup, serializeBackup } from './backup';
import type { LogEntry } from './types';

const entries: LogEntry[] = [
  { id: 'a', ts: 1000, day: '2026-07-01', tracker: 'meals', source: 'manual', data: { kind: 'meal', kcal: 550 } },
  { id: 'b', ts: 2000, day: '2026-07-01', tracker: 'weight', source: 'manual', data: { kind: 'weight', kg: 72.4 }, deleted: true },
];

describe('backup', () => {
  it('round-trips entries exactly, tombstones included', () => {
    const text = serializeBackup(entries, 5000);
    expect(parseBackup(text)).toEqual(entries);
  });

  it('writes an identifiable, versioned envelope', () => {
    const parsed = JSON.parse(serializeBackup(entries, 5000));
    expect(parsed.app).toBe('streka');
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe(5000);
  });

  it('rejects non-JSON', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
  });

  it('rejects a foreign file that is valid JSON', () => {
    expect(() => parseBackup(JSON.stringify({ hello: 'world' }))).toThrow(BackupError);
  });

  it('rejects a backup whose entries are corrupted', () => {
    const bad = JSON.stringify({ app: 'streka', version: 1, entries: [{ id: 'x' }] });
    expect(() => parseBackup(bad)).toThrow(BackupError);
  });

  it('preserves ids and timestamps so a restore is merge-safe', () => {
    const restored = parseBackup(serializeBackup(entries, 5000));
    expect(restored.map((e) => e.id)).toEqual(['a', 'b']);
    expect(restored.map((e) => e.ts)).toEqual([1000, 2000]);
  });
});
