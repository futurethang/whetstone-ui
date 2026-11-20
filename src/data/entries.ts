import "server-only";
import { z } from "zod";
import { EntriesResponse, EntryResponse, EntrySource as EntrySourceSchema, type EntryResult } from "./api-types";
import { apiGet, apiGetOrNull } from "./client";
import { evidenceLines } from "./adapters/evidence-lines";
import { bodySections } from "./adapters/body-sections";
import { eventLabel } from "./adapters/history";
import { staleness } from "./adapters/staleness";
import { supportRollup } from "./adapters/support-rollup";
import { verdictLead } from "./adapters/verdict";
import { getFeatures } from "./features";
import { renderInline, renderMarkdown } from "./markdown";
import type { Audience, EntryDetail, EntrySource, EntrySummary, Evidence, Feature, HistoryEvent, Topic } from "./models";
import { getTopics } from "./topics";

type Raw = EntryResult & Partial<{ features: string[]; related: string[]; supersedes: string[]; superseded_by: string | null; first_seen: string; updated_at: string }>;

export type EntryContext = { intervals: Map<string, number>; lastVisitDay?: string | null; today?: string };

/** `topics` lets a caller that already started the topic request share it instead of parsing it again. */
export async function entryContext(lastVisitDay?: string | null, topics?: Promise<Topic[]>): Promise<EntryContext> {
  const all = await (topics ?? getTopics());
  return { intervals: new Map(all.map((t) => [t.id, t.reviewIntervalDays])), lastVisitDay };
}

/** Raw API entry → view model. Shared by every endpoint that returns entries. */
export function toSummary(r: Raw, ctx: EntryContext): EntrySummary {
  const support = r.support.map((s) => ({ featureId: s.feature_id, level: s.baseline, lowDate: s.low_date ?? null, highDate: s.high_date ?? null }));
  const primary = r.topics[0] ?? null;
  const firstSeen = r.first_seen ?? r.last_reviewed;
  const updatedAt = r.updated_at ?? firstSeen;
  const day = ctx.lastVisitDay ?? null;
  return {
    id: r.id,
    slug: r.id,
    title: r.title,
    verdict: r.verdict,
    verdictLead: verdictLead(r.verdict),
    status: r.status,
    confidence: r.confidence,
    origin: r.origin,
    topics: r.topics,
    primaryTopic: primary,
    appliesWhen: r.applies_when,
    doesNotApplyWhen: r.does_not_apply_when,
    features: r.features ?? support.map((s) => s.featureId),
    support,
    supportRollup: supportRollup(support),
    staleness: staleness({ stale: r.stale, lastReviewed: r.last_reviewed, intervalDays: primary ? ctx.intervals.get(primary) : undefined, today: ctx.today }),
    lastReviewed: r.last_reviewed,
    firstSeen,
    updatedAt,
    related: r.related ?? [],
    supersedes: r.supersedes ?? [],
    supersededBy: r.superseded_by ?? null,
    curation: "default",
    update: day ? (firstSeen > day ? "new" : updatedAt > day ? "updated" : null) : null,
  };
}

/** Every entry summary (hundreds at most: one call, filtered and counted on the server). */
export async function listEntries(opts: { audience?: Audience; lastVisitDay?: string | null; topics?: Promise<Topic[]> } = {}): Promise<EntrySummary[]> {
  const [res, ctx] = await Promise.all([
    apiGet({ source: "entries", path: "entries", schema: EntriesResponse, tags: ["entries"] }),
    entryContext(opts.lastVisitDay, opts.topics),
  ]);
  return res.entries.map((e) => toSummary(e, ctx));
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toHistory(rows: Array<{ date: string; event: string; data: Record<string, unknown>; is_epoch: boolean }>): HistoryEvent[] {
  const s = (v: unknown) => (typeof v === "string" && v ? v : null);
  return rows
    .filter((h) => !h.is_epoch)
    .map((h) => ({ date: h.date, kind: h.event, label: eventLabel(h.event), note: s(h.data.note), from: s(h.data.from), to: s(h.data.to) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** The early lookup's result when it was for the same ids (in the same order); otherwise fetch them now. */
async function featureDetails(ids: string[], early: Promise<{ ids: string[]; features: Feature[] } | null>): Promise<Feature[]> {
  if (!ids.length) return [];
  const e = await early;
  return e && e.ids.length === ids.length && e.ids.every((x, i) => x === ids[i]) ? e.features : getFeatures(ids);
}

/**
 * `entries` and `topics` let a page that also needs the entry list or topics share one request and one parse.
 */
export async function getEntry(
  id: string,
  opts: { audience?: Audience; lastVisitDay?: string | null; entries?: Promise<EntrySummary[]>; topics?: Promise<Topic[]> } = {},
): Promise<EntryDetail | null> {
  if (!ID.test(id) || id.length > 80) return null;
  const entries = opts.entries ?? listEntries({ topics: opts.topics });
  // Start the Baseline lookup alongside the entry request, using the feature ids from the (usually cached) entry
  // list, instead of waiting for the entry first: one round trip to the data API on a cold cache instead of two.
  // A failure here falls back to the sequential lookup below, which reports its own error.
  const early: Promise<{ ids: string[]; features: Feature[] } | null> = entries
    .then(async (list) => {
      const ids = list.find((x) => x.id === id)?.features;
      return ids?.length ? { ids, features: await getFeatures(ids) } : null;
    })
    .catch(() => null);
  const [res, ctx] = await Promise.all([
    apiGetOrNull({ source: `entry ${id}`, path: `entries/${id}`, query: { include_history: "true" }, schema: EntryResponse, tags: ["entries", `entry:${id}`] }),
    entryContext(opts.lastVisitDay, opts.topics),
  ]);
  if (!res) return null;
  const e = res.entry;
  const history = toHistory(e.history);
  const updatedAt = history[0]?.date ?? e.first_seen;
  const summary = toSummary({ ...e, updated_at: updatedAt }, ctx);

  const sections = bodySections(e.body_md);
  const evidenceSection = sections.find((s) => s.key === "evidence");
  const lines = evidenceSection ? evidenceLines(evidenceSection.markdown) : [];
  const parsed = lines.some((l) => l.kind === "parsed");
  const evidence: Evidence[] = parsed ? lines.map((l) => (l.kind === "parsed" ? l : { kind: "raw", raw: l.raw, html: renderInline(l.raw.replace(/^[-*]\s+/, "")) })) : [];

  const sources: EntrySource[] = e.sources.flatMap((x) => {
    const p = EntrySourceSchema.safeParse(x);
    if (!p.success || !/^https?:\/\//.test(p.data.url)) return [];
    return [{ url: p.data.url, title: p.data.title || new URL(p.data.url).hostname, tier: p.data.tier ?? null, retrieved: p.data.retrieved ?? null }];
  });
  const tierCounts: Record<string, number> = {};
  for (const s of sources) if (s.tier) tierCounts[s.tier] = (tierCounts[s.tier] ?? 0) + 1;

  const epochs = e.epochs.length
    ? e.epochs
    : e.history.filter((h) => h.is_epoch).flatMap((h) => {
        const p = z.object({ period: z.string(), summary: z.string() }).safeParse(h.data);
        return p.success ? [p.data] : [];
      });

  return {
    ...summary,
    // The page renders parsed evidence as rows in the Evidence section's place; otherwise the section's markdown.
    sections: sections.map((s) => ({ key: s.key, title: s.title, anchor: s.anchor, html: renderMarkdown(s.markdown) })),
    evidence: { items: evidence, parsed, html: null },
    sources,
    tierCounts,
    history,
    epochs: [...epochs].reverse(),
    featureDetails: await featureDetails(summary.features, early),
  };
}
