/** Presentation formatting. Dates are shown in UTC, the owner's configured timezone. */
const TZ = "UTC";
const parse = (v: string) => new Date(v.length === 10 ? `${v}T00:00:00Z` : v);
const valid = (d: Date) => Number.isFinite(d.getTime());

/** "8 Nov 2026" */
export function formatDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = parse(v);
  return valid(d) ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(d) : v;
}

/** "Sun 8 Nov" */
export function formatDayShort(v: string): string {
  const d = parse(v);
  return valid(d) ? new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(d).replace(",", "") : v;
}

/** "Jun 2026" */
export function formatMonthYear(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = parse(v);
  return valid(d) ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: TZ }).format(d) : null;
}

/** "8 Nov 2026, 14:05 UTC" */
export function formatDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = parse(v);
  return valid(d) ? `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(d)} UTC` : v;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 months ago", "yesterday", "today" (day granularity). */
export function formatRelative(v: string | null | undefined, now = new Date()): string {
  if (!v) return "never";
  const d = parse(v);
  if (!valid(d)) return v;
  const days = Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86_400_000);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30.44), "month");
  return rtf.format(Math.round(days / 365), "year");
}

/** "8 months", "12 days" for a span of days. */
export function formatSpan(days: number): string {
  if (days < 1) return "today";
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 730) {
    const m = Math.round(days / 30.44);
    return `${m} months`;
  }
  return `${Math.round(days / 365)} years`;
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
