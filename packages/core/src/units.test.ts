import { describe, expect, it } from 'vitest';
import { formatDistance, formatWeight, kgToLb, kmToMi, lbToKg } from './units';

describe('unit conversion', () => {
  it('kgToLb rounds to 0.1', () => {
    expect(kgToLb(72.4)).toBe(159.6);
    expect(kgToLb(70)).toBe(154.3);
  });

  it('lbToKg rounds to 0.1 and round-trips sanely', () => {
    expect(lbToKg(159.6)).toBe(72.4);
    expect(lbToKg(kgToLb(72.4))).toBe(72.4);
  });

  it('kmToMi rounds to 0.01', () => {
    expect(kmToMi(4.2)).toBe(2.61);
    expect(kmToMi(5.4)).toBe(3.36);
  });

  it('formatWeight honors units', () => {
    expect(formatWeight(72.4, 'metric')).toBe('72.4 kg');
    expect(formatWeight(72.4, 'imperial')).toBe('159.6 lb');
  });

  it('formatDistance honors units', () => {
    expect(formatDistance(4.2, 'metric')).toBe('4.2 km');
    expect(formatDistance(4.2, 'imperial')).toBe('2.61 mi');
  });
});
