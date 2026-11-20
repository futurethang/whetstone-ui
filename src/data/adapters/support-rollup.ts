/**
 * V1: an entry's support level is the weakest Baseline status across its features.
 * V2 replacement: `support_level` from the API, plus per-browser rows.
 */
import { SUPPORT_ORDER, type FeatureSupport, type SupportRollup } from "../models";

/** Lower is weaker. Unknown values sort as weakest so they are never hidden behind a better badge. */
function rank(level: string): number {
  const i = (SUPPORT_ORDER as readonly string[]).indexOf(level);
  return i === -1 ? SUPPORT_ORDER.length : i;
}

export function supportRollup(support: FeatureSupport[]): SupportRollup | null {
  if (!support.length) return null;
  const weakest = support.reduce((w, s) => (rank(s.level) > rank(w.level) ? s : w));
  const atWeakest = support.filter((s) => s.level === weakest.level);
  const since = weakest.level === "high" ? weakest.highDate : weakest.level === "low" ? weakest.lowDate : null;
  return { level: weakest.level, since, weakestCount: atWeakest.length, total: support.length, mixed: atWeakest.length !== support.length };
}
