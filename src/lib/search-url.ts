import type { SearchParams } from "@/data/models";

type Multi = "topic" | "status" | "confidence" | "origin" | "support";
const MULTI: Multi[] = ["topic", "status", "confidence", "origin", "support"];

/** Serialise search params to a /search URL. Defaults are omitted so URLs stay short and stable. */
export function searchHref(p: SearchParams, change: Partial<SearchParams> = {}): string {
  const n = { ...p, ...change };
  const u = new URLSearchParams();
  if (n.q) u.set("q", n.q);
  for (const k of MULTI) for (const v of n[k]) u.append(k, v);
  if (n.stale) u.set("stale", "1");
  if (n.changed) u.set("changed", n.changed);
  const defaultSort = n.q ? "relevance" : "changed";
  if (n.sort !== defaultSort) u.set("sort", n.sort);
  if (n.page > 1) u.set("page", String(n.page));
  const qs = u.toString();
  return qs ? `/search?${qs}` : "/search";
}

export type Chip = { key: string; label: string; href: string };

/** One removable chip per active filter value, in URL order. Removing a filter returns to page 1. */
export function activeChips(p: SearchParams, labels: (group: string, value: string) => string): Chip[] {
  const chips: Chip[] = [];
  const names: Record<Multi, string> = { topic: "Topic", status: "Status", confidence: "Confidence", origin: "Origin", support: "Support" };
  for (const k of MULTI) {
    for (const v of p[k]) chips.push({ key: `${k}:${v}`, label: `${names[k]}: ${labels(k, v)}`, href: searchHref(p, { [k]: p[k].filter((x) => x !== v), page: 1 }) });
  }
  if (p.stale) chips.push({ key: "stale", label: "Stale only", href: searchHref(p, { stale: false, page: 1 }) });
  if (p.changed) chips.push({ key: "changed", label: `Changed: ${labels("changed", p.changed)}`, href: searchHref(p, { changed: null, page: 1 }) });
  return chips;
}

export function clearFiltersHref(p: SearchParams): string {
  return searchHref({ ...p, topic: [], status: [], confidence: [], origin: [], support: [], stale: false, changed: null, page: 1 });
}
