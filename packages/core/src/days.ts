// Calendar-day arithmetic on local YYYY-MM-DD strings. Internally pinned to
// UTC noon so DST shifts can never move a date across midnight.

function toUtcNoon(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
}

function fromDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function addDays(day: string, n: number): string {
  const d = toUtcNoon(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromDate(d);
}

export function prevDay(day: string): string {
  return addDays(day, -1);
}

// Monday-based weeks, matching the M T W T F S S bars in the designs.
export function weekStartOf(day: string): string {
  const d = toUtcNoon(day);
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = (dow + 6) % 7;
  return addDays(day, -back);
}

// Local calendar day for a wall-clock timestamp.
export function dayOf(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
