/** Date-only helpers. All dates are ISO "YYYY-MM-DD" strings in UTC; history in the data layer is day-granular. */

export const DAY_MS = 86_400_000;

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIso(now = new Date()): string {
  return isoDay(now);
}

/** Accepts "YYYY-MM-DD" or a full ISO timestamp; returns the UTC day. Invalid input → null. */
export function toDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isFinite(t) ? isoDay(new Date(t)) : null;
}

export function addDays(day: string, days: number): string {
  return isoDay(new Date(Date.parse(`${day}T00:00:00Z`) + Math.round(days) * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}
