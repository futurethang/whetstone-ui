/**
 * View models the UI uses. Owned by this repo; pages never see raw API shapes.
 * Kept free of React and Next.js so the data module can be reused by another presentation.
 *
 * Enum-like values are typed as the known union plus `string`: components handle the known values and
 * render anything else as plain text (the `unknown` fallback), so a new value from the API never breaks a page.
 */

/** Who the data is for. Always "owner" in V1; a public presentation would drop owner-only fields here. */
export type Audience = "owner" | "public";

type Open<T extends string> = T | (string & {});

export type Status = Open<"established" | "emerging" | "contested" | "deprecated">;
export type Confidence = Open<"low" | "medium" | "high">;
export type Origin = Open<"radar" | "personal">;
/** Baseline: high = widely available, low = newly available, false = limited. */
export type SupportLevel = Open<"high" | "low" | "false">;
export type Tier = Open<"normative" | "expert" | "community">;

export const STATUS_ORDER = ["established", "emerging", "contested", "deprecated"] as const;
export const CONFIDENCE_ORDER = ["high", "medium", "low"] as const;
export const SUPPORT_ORDER = ["high", "low", "false"] as const;
export const TIER_ORDER = ["normative", "expert", "community"] as const;

/** V2 seam: pin and mute. Always "default" in V1; sorting and filters already read it. */
export type CurationState = "pinned" | "default" | "muted";

/** V2 seam: every action button declares how it takes effect. Defined, unused in V1. */
export type ActionKind = "instant" | "commit" | "review";

export type FeatureSupport = {
  featureId: string;
  level: SupportLevel;
  lowDate: string | null;
  highDate: string | null;
};

/** Weakest Baseline status across an entry's features (adapters/support-rollup.ts). */
export type SupportRollup = {
  level: SupportLevel;
  /** Date the weakest level was reached: high date for Widely, low date for Newly. */
  since: string | null;
  /** Features at the weakest level, out of all features. Mixed when they differ. */
  weakestCount: number;
  total: number;
  mixed: boolean;
};

export type Staleness = {
  stale: boolean;
  /** When the next review is due (last reviewed + the primary topic's review interval). */
  dueDate: string;
  /** Days past due; 0 when not stale. */
  overdueDays: number;
};

export type EntrySummary = {
  id: string;
  /** Entries have no separate slug; the id is slug-shaped and used in /e/[slug]. */
  slug: string;
  title: string;
  verdict: string;
  verdictLead: string;
  status: Status;
  confidence: Confidence;
  origin: Origin;
  topics: string[];
  primaryTopic: string | null;
  appliesWhen: string[];
  doesNotApplyWhen: string[];
  features: string[];
  support: FeatureSupport[];
  supportRollup: SupportRollup | null;
  staleness: Staleness;
  lastReviewed: string;
  firstSeen: string;
  /** Latest non-epoch history date. */
  updatedAt: string;
  related: string[];
  supersedes: string[];
  supersededBy: string | null;
  curation: CurationState;
  /** Set when the caller passes the last-visit day: "new" (first seen after it) or "updated" (changed after it). */
  update: "new" | "updated" | null;
};

export type Evidence =
  | { kind: "parsed"; date: string; tier: Tier; source: string; claim: string; url: string }
  | { kind: "raw"; raw: string; html: SafeHtml };

/** Sanitised HTML produced only by src/data/markdown.ts. The brand stops raw strings reaching the DOM. */
export type SafeHtml = { readonly __html: string; readonly __brand: "SafeHtml" };

export type BodySectionKey = "summary" | "arguments" | "evidence" | "notes" | "other";

export type BodySection = {
  key: BodySectionKey;
  title: string;
  /** Anchor id, unique within the page. */
  anchor: string;
  html: SafeHtml;
};

export type EntrySource = { url: string; title: string; tier: Tier | null; retrieved: string | null };

export type HistoryEvent = {
  date: string;
  kind: string;
  label: string;
  note: string | null;
  from: Status | null;
  to: Status | null;
};

export type Epoch = { period: string; summary: string };

export type Feature = {
  id: string;
  name: string;
  description: string | null;
  level: SupportLevel;
  lowDate: string | null;
  highDate: string | null;
  specUrls: string[];
  mdnSearch: string | null;
};

export type EntryDetail = EntrySummary & {
  sections: BodySection[];
  evidence: { items: Evidence[]; parsed: boolean; html: SafeHtml | null };
  sources: EntrySource[];
  tierCounts: Record<string, number>;
  history: HistoryEvent[];
  epochs: Epoch[];
  featureDetails: Feature[];
};

export type Topic = {
  id: string;
  label: string;
  parentId: string | null;
  depth: number;
  entryCount: number;
  staleCount: number;
  countsByStatus: Record<string, number>;
  reviewIntervalDays: number;
  /** True for a parent the taxonomy does not list but a subtopic implies (e.g. "ai-tooling" for "ai-tooling/agents"). */
  implied: boolean;
};

export type TopicNode = Topic & { children: TopicNode[] };

/** One row per change event; ChangeRow renders { kind, label, detail? }. */
export type ChangeEvent = {
  entryId: string;
  entryTitle: string;
  entryTopic: string | null;
  date: string;
  kind: string;
  label: string;
  /** Status change: from → to. V2 typed events ("Verdict reworded") fill this too. */
  from: Status | null;
  to: Status | null;
  note: string | null;
};

/** Latest event per entry, with the number of other events folded into it. */
export type ChangeSummary = ChangeEvent & { more: number };

export type Observation = {
  id: string;
  topic: string;
  entryId: string | null;
  claim: string;
  stance: string;
  kind: string;
  strength: number;
  firstSeen: string;
  lastSeen: string;
  status: string;
  featureIds: string[];
};

export type Citation = {
  url: string;
  itemId: string | null;
  sourceId: string | null;
  sourceName: string | null;
  authorName: string | null;
  tier: Tier;
  publishedAt: string | null;
};

export type Item = {
  id: string;
  title: string | null;
  url: string;
  sourceId: string;
  sourceName: string | null;
  sourceTier: Tier | null;
  authorName: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  relevance: number | null;
  state: string;
};

export type Proposal = {
  id: string;
  kind: string;
  entryId: string | null;
  entryTitle: string | null;
  path: string;
  proposedStatus: Status | null;
  rationale: string;
  score: number;
  observationIds: string[];
  prUrl: string | null;
  prNumber: number | null;
  createdAt: string;
  outcome: string;
  decidedAt: string | null;
};

/** One weekly digest: the pull request the pipeline opened and the proposals in it. */
export type Digest = {
  prNumber: number | null;
  prUrl: string | null;
  week: string;
  state: "open" | "decided" | "unsent";
  createdAt: string;
  decidedAt: string | null;
  proposals: Proposal[];
  counts: Record<string, number>;
};

export type Source = {
  id: string;
  name: string;
  type: string;
  tier: Tier;
  topics: string[];
  status: string;
  cadence: string;
  url: string | null;
  lastSuccessAt: string | null;
  lastItemAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  failing: boolean;
  health: "broken" | "never" | "quiet" | "ok";
  advice: string | null;
  accepted: number;
  rejected: number;
  contributed: number;
};

export type Run = {
  id: string;
  job: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  costUsd: number;
  error: string | null;
};

export type JobRun = Run & { summary: string };

export type PipelineOverview = {
  items: { total: number; byState: Record<string, number>; fetched24h: number; fetched7d: number };
  discardReasons: Array<[string, number]>;
  observations: { total: number; byStatus: Record<string, number>; openLinked: number; openUnlinked: number; openByTopic: Array<[string, number]> };
  proposals: Record<string, number>;
  sources: { active: number; failing: number; neverSucceeded: number; total: number };
  lastRuns: JobRun[];
  recentItems: Array<Item & { reason: string | null }>;
};

export type Budget = { monthStart: string; spentUsd: number; capUsd: number; remainingUsd: number };

// ---------- search ----------
export type SearchSort = "relevance" | "changed" | "overdue" | "title";
export type ChangedWindow = "last" | "7d" | "30d";

export type SearchParams = {
  q: string;
  topic: string[];
  status: string[];
  confidence: string[];
  origin: string[];
  support: string[];
  stale: boolean;
  changed: ChangedWindow | null;
  sort: SearchSort;
  page: number;
};

export type FacetOption = { value: string; label: string; count: number; selected: boolean };
export type Facets = {
  topic: FacetOption[];
  status: FacetOption[];
  confidence: FacetOption[];
  origin: FacetOption[];
  support: FacetOption[];
  stale: FacetOption[];
  changed: FacetOption[];
};

export type SearchResult = { entry: EntrySummary; score: number | null };

export type SearchOutcome = {
  params: SearchParams;
  results: SearchResult[];
  total: number;
  page: number;
  pageCount: number;
  facets: Facets;
};
