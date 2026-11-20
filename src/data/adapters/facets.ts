/**
 * V1 search runs in memory: all entry summaries are filtered, counted and sorted here.
 * V2 replacement: API facets. searchEntries() keeps its signature either way.
 */
import { CONFIDENCE_ORDER, STATUS_ORDER, SUPPORT_ORDER, type ChangedWindow, type EntrySummary, type FacetOption, type Facets, type SearchParams, type SearchSort, type Topic } from "../models";
import { addDays, todayIso } from "./dates";
import { inTopic } from "./topic-tree";

export const PAGE_SIZE = 25;
const ORIGINS = ["radar", "personal"] as const;
const CHANGED: ChangedWindow[] = ["last", "7d", "30d"];
const SORTS: SearchSort[] = ["relevance", "changed", "overdue", "title"];
const TOPIC = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

type Raw = Record<string, string | string[] | undefined>;

/** Repeated (?status=a&status=b) and comma-separated (?status=a,b) values both work. Unknown values are dropped. */
function list(raw: Raw, key: string, allowed?: readonly string[], pattern?: RegExp): string[] {
  const v = raw[key];
  const values = (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(",")).map((x) => x.trim().toLowerCase()).filter(Boolean);
  return [...new Set(values.filter((x) => (!allowed || allowed.includes(x)) && (!pattern || pattern.test(x))))].slice(0, 50);
}

function one(raw: Raw, key: string): string {
  const v = raw[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function parseSearchParams(raw: Raw): SearchParams {
  const q = one(raw, "q").slice(0, 300);
  const sortRaw = one(raw, "sort") as SearchSort;
  let sort: SearchSort = SORTS.includes(sortRaw) ? sortRaw : q ? "relevance" : "changed";
  if (sort === "relevance" && !q) sort = "changed";
  const changedRaw = one(raw, "changed") as ChangedWindow;
  const page = Number.parseInt(one(raw, "page"), 10);
  return {
    q,
    topic: list(raw, "topic", undefined, TOPIC),
    status: list(raw, "status", STATUS_ORDER),
    confidence: list(raw, "confidence", CONFIDENCE_ORDER),
    origin: list(raw, "origin", ORIGINS),
    support: list(raw, "support", SUPPORT_ORDER),
    stale: one(raw, "stale") === "1",
    changed: CHANGED.includes(changedRaw) ? changedRaw : null,
    sort,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

export type FilterContext = { lastVisitDay: string | null; today?: string; scores: Map<string, number> | null };

type Group = "q" | "topic" | "status" | "confidence" | "origin" | "support" | "stale" | "changed";

function changedSince(window: ChangedWindow, ctx: FilterContext): string {
  const today = ctx.today ?? todayIso();
  if (window === "7d") return addDays(today, -7);
  if (window === "30d") return addDays(today, -30);
  return ctx.lastVisitDay ? addDays(ctx.lastVisitDay, 1) : addDays(today, -7);
}

function matches(e: EntrySummary, p: SearchParams, ctx: FilterContext, skip: Group | null): boolean {
  if (skip !== "q" && p.q && ctx.scores && !ctx.scores.has(e.id)) return false;
  if (skip !== "topic" && p.topic.length && !p.topic.some((t) => e.topics.some((et) => inTopic(et, t)))) return false;
  if (skip !== "status" && p.status.length && !p.status.includes(e.status)) return false;
  if (skip !== "confidence" && p.confidence.length && !p.confidence.includes(e.confidence)) return false;
  if (skip !== "origin" && p.origin.length && !p.origin.includes(e.origin)) return false;
  if (skip !== "support" && p.support.length && !(e.supportRollup && p.support.includes(e.supportRollup.level))) return false;
  if (skip !== "stale" && p.stale && !e.staleness.stale) return false;
  if (skip !== "changed" && p.changed && e.updatedAt < changedSince(p.changed, ctx)) return false;
  return true;
}

export function filterEntries(entries: EntrySummary[], p: SearchParams, ctx: FilterContext): EntrySummary[] {
  return entries.filter((e) => matches(e, p, ctx, null));
}

export function sortEntries(entries: EntrySummary[], sort: SearchSort, scores: Map<string, number> | null): EntrySummary[] {
  const pinned = (e: EntrySummary) => (e.curation === "pinned" ? 0 : e.curation === "muted" ? 2 : 1);
  const by: Record<SearchSort, (a: EntrySummary, b: EntrySummary) => number> = {
    relevance: (a, b) => (scores?.get(b.id) ?? 0) - (scores?.get(a.id) ?? 0),
    changed: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    overdue: (a, b) => b.staleness.overdueDays - a.staleness.overdueDays || a.staleness.dueDate.localeCompare(b.staleness.dueDate),
    title: () => 0,
  };
  return [...entries].sort((a, b) => pinned(a) - pinned(b) || by[sort](a, b) || a.title.localeCompare(b.title));
}

const LABELS: Record<string, string> = {
  established: "Established", emerging: "Emerging", contested: "Contested", deprecated: "Deprecated",
  high: "High", medium: "Medium", low: "Low", radar: "Radar", personal: "Personal",
  last: "Since last visit", "7d": "Last 7 days", "30d": "Last 30 days",
};
const SUPPORT_LABELS: Record<string, string> = { high: "Widely available", low: "Newly available", false: "Limited" };

/**
 * Counts per option, each group computed as if its own selection were cleared, so an option's count is what
 * you would get by also selecting it.
 */
export function facetCounts(entries: EntrySummary[], p: SearchParams, ctx: FilterContext, topics: Topic[]): Facets {
  const pool = (g: Group) => entries.filter((e) => matches(e, p, ctx, g));
  const count = (g: Group, values: readonly string[], key: (e: EntrySummary) => string | null, selected: string[], labels = LABELS): FacetOption[] => {
    const es = pool(g);
    return values.map((v) => ({ value: v, label: labels[v] ?? v, count: es.filter((e) => key(e) === v).length, selected: selected.includes(v) }));
  };

  const topicPool = pool("topic");
  const topicLabel = new Map(topics.map((t) => [t.id, t]));
  const pathLabel = (id: string) =>
    id.split("/").map((_, i, segs) => topicLabel.get(segs.slice(0, i + 1).join("/"))?.label ?? segs[i]).join(" › ");
  const topicOptions = topics
    .map((t) => ({ value: t.id, label: pathLabel(t.id), count: topicPool.filter((e) => e.topics.some((et) => inTopic(et, t.id))).length, selected: p.topic.includes(t.id) }))
    .filter((o) => o.count > 0 || o.selected);

  const stalePool = pool("stale");
  const changedPool = pool("changed");
  return {
    topic: topicOptions,
    status: count("status", STATUS_ORDER, (e) => e.status, p.status),
    confidence: count("confidence", CONFIDENCE_ORDER, (e) => e.confidence, p.confidence),
    origin: count("origin", ORIGINS, (e) => e.origin, p.origin),
    support: count("support", SUPPORT_ORDER, (e) => e.supportRollup?.level ?? null, p.support, SUPPORT_LABELS),
    stale: [{ value: "1", label: "Stale", count: stalePool.filter((e) => e.staleness.stale).length, selected: p.stale }],
    changed: CHANGED.map((w) => ({ value: w, label: LABELS[w]!, count: changedPool.filter((e) => e.updatedAt >= changedSince(w, ctx)).length, selected: p.changed === w })),
  };
}
