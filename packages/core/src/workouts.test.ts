import { describe, expect, it } from 'vitest';
import { maxWeightKg } from './workouts';

describe('maxWeightKg', () => {
  it('parses the heaviest kg value from set labels', () => {
    expect(maxWeightKg(['60 kg × 8', '62.5 kg × 6', '55 kg × 10'])).toBe(62.5);
  });

  it('ignores labels without a weight', () => {
    expect(maxWeightKg(['12 reps', 'bodyweight × 15', '40 kg × 5'])).toBe(40);
  });

  it('returns null when nothing parses', () => {
    expect(maxWeightKg(['12 reps', ''])).toBeNull();
    expect(maxWeightKg([])).toBeNull();
  });
});
