import "server-only";
import { BudgetResponse, PipelineOverviewResponse, ItemResponse, ObservationResponse, ObservationsResponse, RunsResponse, SourceResponse, SourcesResponse, type ItemRow, type ObservationRow, type SourceRegistryRow } from "./api-types";
import { JOBS, summarizeRun } from "./adapters/run-summary";
import { REVALIDATE_FAST, apiGet, apiGetOrNull } from "./client";
import type { Budget, Citation, Item, Observation, PipelineOverview, Run, Source } from "./models";

const toSource = (s: SourceRegistryRow): Source => ({
  id: s.id,
  name: s.name,
  type: s.type,
  tier: s.tier,
  topics: s.topics,
  status: s.status,
  cadence: s.cadence,
  url: s.url && /^https?:\/\//.test(s.url) ? s.url : null,
  lastSuccessAt: s.last_success_at,
  lastItemAt: s.last_item_at,
  consecutiveFailures: s.consecutive_failures,
  lastError: s.last_error,
  failing: s.consecutive_failures > 0,
  accepted: s.track_record.accepted,
  rejected: s.track_record.rejected,
  contributed: s.track_record.accepted + s.track_record.rejected,
});

export const toObservation = (o: ObservationRow): Observation => ({
  id: o.id,
  topic: o.topic,
  entryId: o.entry_id,
  claim: o.claim,
  stance: o.stance,
  kind: o.kind,
  strength: o.strength,
  firstSeen: o.first_seen,
  lastSeen: o.last_seen,
  status: o.status,
  featureIds: o.feature_ids,
});

const toItem = (i: ItemRow & { source_name?: string | null; source_tier?: string | null; author_name?: string | null }): Item => ({
  id: i.id,
  title: i.title,
  url: i.url,
  sourceId: i.source_id,
  sourceName: i.source_name ?? null,
  sourceTier: i.source_tier ?? null,
  authorName: i.author_name ?? null,
  publishedAt: i.published_at,
  fetchedAt: i.fetched_at,
  relevance: i.relevance,
  state: i.state,
});

export async function getSources(): Promise<Source[]> {
  const res = await apiGet({ source: "sources", path: "sources", schema: SourcesResponse, tags: ["pipeline"], revalidate: REVALIDATE_FAST });
  return res.sources.map(toSource);
}

const SOURCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function getSource(id: string): Promise<(Source & { items: Item[] }) | null> {
  if (!SOURCE_ID.test(id) || id.length > 80) return null;
  const res = await apiGetOrNull({ source: `source ${id}`, path: `sources/${id}`, query: { items: 25 }, schema: SourceResponse, tags: ["pipeline"], revalidate: REVALIDATE_FAST });
  return res ? { ...toSource(res.source), items: res.source.items.map((i) => toItem({ ...i, source_name: res.source.name, source_tier: res.source.tier })) } : null;
}

export async function getRuns(limit = 50): Promise<Run[]> {
  const res = await apiGet({ source: "runs", path: "runs", query: { limit }, schema: RunsResponse, tags: ["pipeline"], revalidate: REVALIDATE_FAST });
  return res.runs.map((r) => ({ id: r.id, job: r.job, status: r.status, startedAt: r.started_at, finishedAt: r.finished_at, durationMs: r.duration_ms, costUsd: r.est_cost_usd, error: r.error }));
}

export async function getBudget(): Promise<Budget> {
  const { budget: b } = await apiGet({ source: "budget", path: "budget", schema: BudgetResponse, tags: ["pipeline"], revalidate: REVALIDATE_FAST });
  return { monthStart: b.month_start, spentUsd: b.month_to_date, capUsd: b.cap, remainingUsd: b.remaining };
}

const TOPIC = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Recent observations; `topic` includes its descendants. Unreviewed pipeline output. */
export async function getObservations(args: { topic?: string; limit?: number } = {}): Promise<Observation[]> {
  if (args.topic && !TOPIC.test(args.topic)) return [];
  const res = await apiGet({ source: "observations", path: "observations", query: { topic: args.topic, limit: args.limit ?? 5 }, schema: ObservationsResponse, tags: ["digest"], revalidate: REVALIDATE_FAST });
  return res.observations.map(toObservation);
}

const BIGINT = /^[1-9]\d{0,17}$/;

export async function getObservation(id: string): Promise<(Observation & { citations: Citation[] }) | null> {
  if (!BIGINT.test(id)) return null;
  const res = await apiGetOrNull({ source: `observation ${id}`, path: `observations/${id}`, schema: ObservationResponse, tags: ["digest"], revalidate: REVALIDATE_FAST });
  if (!res) return null;
  const o = res.observation;
  return {
    ...toObservation(o),
    citations: o.citations.map((c) => ({ url: c.url, itemId: c.raw_item_id, sourceId: c.source_id, sourceName: c.source_name, authorName: c.author_name, tier: c.tier, publishedAt: c.published_at })),
  };
}

export async function getItem(id: string): Promise<(Item & { observations: Observation[] }) | null> {
  if (!BIGINT.test(id)) return null;
  const res = await apiGetOrNull({ source: `article ${id}`, path: `items/${id}`, schema: ItemResponse, tags: ["digest"], revalidate: REVALIDATE_FAST });
  return res ? { ...toItem(res.item), observations: res.item.observations.map(toObservation) } : null;
}

const byCount = (m: Record<string, number>): Array<[string, number]> => Object.entries(m).sort((a, b) => b[1] - a[1]);

/** Funnel, latest run per job, source health and recently fetched items in one call. */
export async function getOverview(): Promise<PipelineOverview> {
  const { funnel: f, sources, last_runs, recent_items } = await apiGet({ source: "pipeline overview", path: "pipeline", schema: PipelineOverviewResponse, tags: ["pipeline"], revalidate: REVALIDATE_FAST });
  return {
    items: { total: f.items.total, byState: f.items.by_state, fetched24h: f.items.fetched_24h, fetched7d: f.items.fetched_7d },
    discardReasons: byCount(f.discard_reasons),
    observations: { total: f.observations.total, byStatus: f.observations.by_status, openLinked: f.observations.open_linked_to_entry, openUnlinked: f.observations.open_unlinked, openByTopic: byCount(f.observations.open_by_topic) },
    proposals: f.proposals,
    sources: { active: sources.active, failing: sources.failing, neverSucceeded: sources.never_succeeded, total: sources.total },
    lastRuns: last_runs.map((r) => ({ id: r.id, job: r.job, status: r.status, startedAt: r.started_at, finishedAt: r.finished_at, durationMs: r.duration_ms, costUsd: r.est_cost_usd, error: r.error, summary: summarizeRun(r.job, r.status, r.stats, r.error) })),
    recentItems: recent_items.map((i) => ({ ...toItem(i), reason: i.reason })),
  };
}

export { JOBS };
