import { describe, expect, it } from 'vitest';
import { PORTION_MULT, scanRange, scanTotal } from './scan';

// Prototype ingredient set: rice 280, chicken 180, egg 70, oil 90 (sum 620).
const INGS = [
  { name: 'Rice, fried', kcal: 280 },
  { name: 'Chicken thigh', kcal: 180 },
  { name: 'Egg', kcal: 70 },
  { name: 'Spring onion oil', kcal: 90 },
];
const NONE = [false, false, false, false];

describe('scanTotal', () => {
  it('medium keeps the raw sum rounded to 10', () => {
    expect(scanTotal(INGS, NONE, 'm')).toBe(620);
  });

  it('removing an ingredient re-totals', () => {
    expect(scanTotal(INGS, [false, false, true, false], 'm')).toBe(550);
  });

  it('large multiplies by 1.3', () => {
    expect(scanTotal(INGS, NONE, 'l')).toBe(810);
  });

  it('small multiplies by 0.7', () => {
    expect(scanTotal(INGS, NONE, 's')).toBe(430);
  });

  it('exposes the portion multipliers', () => {
    expect(PORTION_MULT).toEqual({ s: 0.7, m: 1, l: 1.3 });
  });
});

describe('scanRange', () => {
  it('renders plus or minus 10 percent, each end rounded to 10', () => {
    expect(scanRange(620)).toBe('560–680');
    expect(scanRange(550)).toBe('500–610');
  });
});
