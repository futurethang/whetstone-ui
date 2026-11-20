/**
 * Raw response shapes from the data API (futurethang/whetstone, SPEC §12.3), validated at runtime in client.ts.
 * Objects strip unknown fields (the API may add fields within schema 1). Enum-like values are plain strings
 * so a new value from the API reaches the UI's `unknown` fallback instead of failing validation.
 */
import { z } from "zod";

const envelope = { schema: z.literal(1), generated_at: z.string() };
const str = z.string();
const strArr = z.array(z.string());
const nstr = z.string().nullable();
/** Optional in some responses; null and undefined both mean "absent". */
const ostr = z.string().nullish();

// ---------- topics ----------
export const TopicsResponse = z.object({
  ...envelope,
  topics: z.array(
    z.object({
      id: str,
      parent: nstr,
      review_interval: str,
      review_interval_days: z.number(),
      entries: z.number().int(),
      by_status: z.record(z.string(), z.number().int()),
      stale: z.number().int(),
    }),
  ),
});
export type TopicsResponse = z.infer<typeof TopicsResponse>;

// ---------- entries ----------
const SupportRow = z.object({ feature_id: str, baseline: str, low_date: ostr, high_date: ostr });

export const EntryResult = z.object({
  id: str,
  title: str,
  verdict: str,
  status: str,
  confidence: str,
  topics: strArr,
  applies_when: strArr,
  does_not_apply_when: strArr,
  support: z.array(SupportRow),
  last_reviewed: str,
  stale: z.boolean(),
  origin: str,
  score: z.number().optional(),
});
export type EntryResult = z.infer<typeof EntryResult>;

export const EntrySummaryRaw = EntryResult.extend({
  features: strArr,
  related: strArr,
  supersedes: strArr,
  superseded_by: nstr,
  first_seen: str,
  updated_at: str,
});
export type EntrySummaryRaw = z.infer<typeof EntrySummaryRaw>;

export const EntriesResponse = z.object({ ...envelope, entries: z.array(EntrySummaryRaw) });

const HistoryRow = z.object({ date: str, event: str, data: z.record(z.string(), z.unknown()).default({}), is_epoch: z.boolean().default(false) });
const SourceRow = z.object({ url: str, title: ostr, tier: ostr, retrieved: ostr }).passthrough();

export const EntryResponse = z.object({
  ...envelope,
  entry: EntryResult.extend({
    body_md: str,
    sources: z.array(z.unknown()).default([]),
    related: strArr,
    supersedes: strArr,
    superseded_by: nstr,
    first_seen: str,
    features: strArr.default([]),
    history: z.array(HistoryRow).default([]),
    epochs: z.array(z.object({ period: str, summary: str })).default([]),
  }),
});
export type EntryResponse = z.infer<typeof EntryResponse>;
export const EntrySource = SourceRow;

// ---------- search ----------
export const SearchResponse = z.object({ ...envelope, results: z.array(EntryResult) });

// ---------- changes ----------
export const ChangesResponse = z.object({
  ...envelope,
  since: str,
  until: ostr,
  has_more: z.boolean().default(false),
  changes: z.array(z.object({ entry_id: str, date: str, event: str, note: nstr.optional(), from: z.unknown().optional(), to: z.unknown().optional() })),
});

// ---------- features ----------
const FeatureRow = z.object({
  feature_id: str,
  name: str,
  description: nstr.optional(),
  baseline: str,
  baseline_low_date: nstr.optional(),
  baseline_high_date: nstr.optional(),
  spec_urls: strArr.default([]),
});
export type FeatureRow = z.infer<typeof FeatureRow>;
export const FeaturesResponse = z.object({ ...envelope, features: z.array(FeatureRow), missing: strArr.default([]) });
export const FeatureResponse = z.object({
  ...envelope,
  feature: FeatureRow.extend({ mdn_search: ostr }),
  entries: z.array(EntryResult),
});

// ---------- observations and items ----------
const ObservationRow = z.object({
  id: str,
  topic: str,
  entry_id: nstr,
  claim: str,
  stance: str,
  kind: str,
  feature_ids: strArr.default([]),
  strength: z.number(),
  first_seen: str,
  last_seen: str,
  status: str,
});
export type ObservationRow = z.infer<typeof ObservationRow>;
export const ObservationsResponse = z.object({ ...envelope, observations: z.array(ObservationRow) });
export const ObservationResponse = z.object({
  ...envelope,
  observation: ObservationRow.extend({
    consumed_by_delta: nstr.optional(),
    citations: z.array(
      z.object({ url: str, raw_item_id: nstr, source_id: nstr, source_name: nstr, author_id: nstr, author_name: nstr, tier: str, published_at: nstr }),
    ),
  }),
});

const ItemRow = z.object({
  id: str,
  source_id: str,
  author_id: nstr,
  title: nstr,
  url: str,
  published_at: nstr,
  fetched_at: str,
  relevance: z.number().nullable(),
  state: str,
});
export type ItemRow = z.infer<typeof ItemRow>;
export const ItemResponse = z.object({
  ...envelope,
  item: ItemRow.extend({ source_name: nstr, source_tier: nstr, author_name: nstr, observations: z.array(ObservationRow) }),
});

// ---------- digest ----------
export const DeltasResponse = z.object({
  ...envelope,
  deltas: z.array(
    z.object({
      id: str,
      kind: str,
      entry_id: nstr,
      path: str,
      proposed_status: nstr,
      rationale: str,
      score: z.number(),
      observation_ids: strArr,
      pr_number: z.number().nullable(),
      pr_url: nstr,
      outcome: str,
      decided_at: nstr,
      created_at: str,
    }),
  ),
});

// ---------- pipeline ----------
const SourceRegistryRow = z.object({
  id: str,
  name: str,
  type: str,
  tier: str,
  topics: strArr,
  status: str,
  cadence: str,
  url: nstr,
  last_run_at: nstr,
  last_success_at: nstr,
  last_item_at: nstr,
  consecutive_failures: z.number().int(),
  last_error: nstr,
  track_record: z.object({ accepted: z.number(), rejected: z.number(), acceptance_rate: z.number().nullable() }),
});
export type SourceRegistryRow = z.infer<typeof SourceRegistryRow>;
export const SourcesResponse = z.object({ ...envelope, sources: z.array(SourceRegistryRow) });
export const SourceResponse = z.object({ ...envelope, source: SourceRegistryRow.extend({ items: z.array(ItemRow) }) });

export const RunsResponse = z.object({
  ...envelope,
  runs: z.array(
    z.object({
      id: str,
      job: str,
      status: str,
      started_at: str,
      finished_at: nstr,
      est_cost_usd: z.number(),
      duration_ms: z.number().nullable(),
      stats: z.record(z.string(), z.unknown()).default({}),
      error: nstr,
    }),
  ),
});
export const BudgetResponse = z.object({
  ...envelope,
  budget: z.object({ currency: str, month_start: str, month_to_date: z.number(), cap: z.number(), remaining: z.number() }),
});
