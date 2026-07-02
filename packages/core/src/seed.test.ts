import { describe, expect, it } from 'vitest';
import { createMockScan } from './services';
import { intentionalDays, streak } from './streak';
import { isDemoData, seedDemo } from './seed';

const TODAY = '2026-07-02';

describe('seedDemo', () => {
  it('yields an 11-day streak ending yesterday, 12 after one log today', () => {
    const { entries } = seedDemo(TODAY);
    const days = intentionalDays(entries);
    expect(streak(days, TODAY)).toBe(11);
    days.add(TODAY);
    expect(streak(days, TODAY)).toBe(12);
  });

  it('places every entry before today', () => {
    const { entries } = seedDemo(TODAY);
    expect(entries.every((e) => e.day < TODAY)).toBe(true);
  });

  it('latest weight is 72.4', () => {
    const { entries } = seedDemo(TODAY);
    const weights = entries
      .filter((e) => e.data.kind === 'weight')
      .sort((a, b) => a.ts - b.ts);
    const last = weights[weights.length - 1]!;
    expect(last.data).toEqual({ kind: 'weight', kg: 72.4 });
  });

  it('marks the demo account settings', () => {
    const { settings } = seedDemo(TODAY);
    expect(settings.hasAccount).toBe(true);
    expect(settings.healthConnected).toBe(true);
    expect(settings.onboarded).toBe(true);
    expect(Object.values(settings.picked!).every(Boolean)).toBe(true);
  });
});

describe('createMockScan', () => {
  it('alternates high and low confidence, starting high', async () => {
    const scan = createMockScan(0);
    const first = await scan.analyze();
    expect(first.confidence).toBe('high');
    expect(first.dish).toBe('Chicken fried rice');
    expect(first.ingredients.map((i) => i.kcal)).toEqual([280, 180, 70, 90]);
    const second = await scan.analyze();
    expect(second.confidence).toBe('low');
    expect(second.matches?.[0]).toEqual({ name: 'Beef stew', kcal: 450, likely: true });
    const third = await scan.analyze();
    expect(third.confidence).toBe('high');
  });
});

describe('isDemoData', () => {
  it('detects seeded entries by id prefix', () => {
    const { entries } = seedDemo('2026-07-02');
    expect(isDemoData(entries)).toBe(true);
    expect(isDemoData([{ id: 'uuid-1' }])).toBe(false);
    expect(isDemoData([])).toBe(false);
  });
});
