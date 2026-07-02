// Display-only unit conversion (Settings row: kg · km / lb · mi). Log entries
// always store metric values; conversion happens at render time.

const KG_PER_LB = 0.453_592_37;
const MI_PER_KM = 0.621_371;

export type Units = 'metric' | 'imperial';

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function kgToLb(kg: number): number {
  return round1(kg / KG_PER_LB);
}

export function lbToKg(lb: number): number {
  return round1(lb * KG_PER_LB);
}

export function kmToMi(km: number): number {
  return round2(km * MI_PER_KM);
}

export function formatWeight(kg: number, units: Units): string {
  return units === 'imperial' ? `${kgToLb(kg).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
}

export function formatDistance(km: number, units: Units): string {
  return units === 'imperial' ? `${kmToMi(km)} mi` : `${km} km`;
}
