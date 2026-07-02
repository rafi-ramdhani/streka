// Set labels are human strings like "62.5 kg × 6"; the bests card needs the
// heaviest weight actually lifted.
export function maxWeightKg(labels: string[]): number | null {
  let max: number | null = null;
  for (const label of labels) {
    const m = /([\d.]+)\s*kg/.exec(label);
    if (!m) continue;
    const kg = Number(m[1]);
    if (Number.isFinite(kg) && (max === null || kg > max)) max = kg;
  }
  return max;
}
