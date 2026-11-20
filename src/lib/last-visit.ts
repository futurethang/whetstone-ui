import "server-only";
import { cookies } from "next/headers";

/**
 * V1 last-visit state: a per-device cookie holding an ISO timestamp. History is day-granular, so comparisons use
 * the UTC day: an event dated on or before the last-visit day counts as seen.
 * V2 replacement: a read-state API synced across devices, behind the same get() / markSeen() pair.
 */
export const LAST_VISIT_COOKIE = "ws_last_visit";

export async function getLastVisit(): Promise<{ at: string; day: string } | null> {
  const v = (await cookies()).get(LAST_VISIT_COOKIE)?.value;
  const t = v ? Date.parse(v) : NaN;
  if (!Number.isFinite(t)) return null;
  const at = new Date(t).toISOString();
  return { at, day: at.slice(0, 10) };
}

export function lastVisitCookie(now = new Date(), secure = process.env.NODE_ENV === "production"): string {
  return `${LAST_VISIT_COOKIE}=${now.toISOString()}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secure ? "; Secure" : ""}`;
}
