// "Thu, Jul 2" style date line used in the board header and sheets.
export function formatDateLine(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Short weekday name for "last: Tue" style tile hints.
export function shortWeekday(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}
