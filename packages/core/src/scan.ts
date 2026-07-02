// Food-scan portion math from the prototype. Calories are always presented as
// a range, never a single fake-precise number (handoff, food scan section).

export interface Ingredient {
  name: string;
  kcal: number;
}

export type Portion = 's' | 'm' | 'l';

export const PORTION_MULT: Record<Portion, number> = { s: 0.7, m: 1, l: 1.3 };

const round10 = (n: number) => Math.round(n / 10) * 10;

export function scanTotal(
  ingredients: Ingredient[],
  removed: boolean[],
  portion: Portion,
): number {
  const sum = ingredients.reduce((acc, ing, i) => acc + (removed[i] ? 0 : ing.kcal), 0);
  return round10(sum * PORTION_MULT[portion]);
}

// En-dash range, e.g. 560–680 (10% around the total, ends rounded to 10).
export function scanRange(total: number): string {
  return `${round10(total * 0.9)}–${round10(total * 1.1)}`;
}
