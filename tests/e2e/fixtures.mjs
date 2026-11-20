// Fixture data for the mock data API, modelled on the real knowledge base (futurethang/whetstone knowledge/).
const PN = "Team standards in the consuming repository take precedence over Whetstone entries.";
export const precedence = PN;

const today = new Date();
const day = (offset) => new Date(today.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

export const topics = [
  ["accessibility", "1 year"], ["ai-tooling/agents", "3 mons"], ["architecture", "1 year"], ["browsers-and-baseline", "6 mons"],
  ["css", "1 year"], ["css/animation", "1 year"], ["css/cascade", "1 year"], ["css/color-and-typography", "1 year"], ["css/layout", "1 year"],
  ["html", "2 years"], ["html/forms", "1 year 6 mons"], ["web-apis", "1 year"],
].map(([id, iv]) => ({ id, iv }));

const DAYS = { "1 year": 365, "3 mons": 91, "6 mons": 183, "2 years": 730, "1 year 6 mons": 548 };

const body = (summary, evidence, extra = "") => `
<!-- whetstone:generated:start -->
## Summary
${summary}

## Arguments
### For
- Removes JavaScript that only syncs state to classes
- Works with existing state pseudo-classes
### Against and caveats
- Loose selectors can cost style recalculation

## Evidence
${evidence}
<!-- whetstone:generated:end -->
${extra}
## Owner notes
<!-- Whetstone never edits below this line. -->
`;

export const entries = [
  {
    id: "container-queries-for-component-layout",
    title: "Prefer container queries over viewport media queries for component-level layout",
    verdict: "For components whose layout depends on available space rather than the viewport, use size container queries (container-type: inline-size + @container). Keep viewport media queries for page-level layout and user-preference queries.",
    status: "established", confidence: "high", origin: "radar", topics: ["css/layout", "design-systems"],
    applies_when: ["A component is reused in containers of different widths", "Building design-system components that must adapt to their slot"],
    does_not_apply_when: ["Layout genuinely depends on the viewport (page shell, global nav)"],
    features: ["container-queries"], related: ["has-selector-relational-styling"], supersedes: [], superseded_by: null,
    first_seen: day(-6), last_reviewed: day(-6),
    history: [{ date: day(-6), event: "created", data: { note: "Hand-written seed example." } }, { date: day(-2), event: "updated", data: { note: "Added supporting evidence." } }],
    sources: [
      { url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries", title: "CSS container queries - MDN", tier: "normative", retrieved: day(-6) },
      { url: "https://css-tricks.com/taming-typography-modern-css-reset", title: "CSS-Tricks", tier: "expert", retrieved: day(-2) },
    ],
    body: body(
      "Size container queries let a component respond to the size of its container instead of the viewport.\n\n![diagram](https://example.com/diagram.png) <script>alert(1)</script>",
      "- 2026-11-05 · expert · CSS-Tricks · Container-type inline-size with cqi units in clamp() scales type to its container · rather than the viewport. · [link](https://css-tricks.com/taming-typography-modern-css-reset)\n- 2026-11-14 · normative · MDN · Reference documentation for the feature · [link](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment)\n- Owner aside: saw this break in Safari 17, no link.",
    ),
  },
  {
    id: "has-selector-relational-styling",
    title: "Use :has() for relational styling instead of JavaScript-toggled parent classes",
    verdict: "Use the :has() relational pseudo-class to style an element based on its descendants or following siblings. Prefer it over JavaScript that toggles parent classes.",
    status: "emerging", confidence: "medium", origin: "radar", topics: ["css", "css/cascade"],
    applies_when: ["Styling a parent based on the state of a child"], does_not_apply_when: ["Very large, frequently mutating DOM subtrees"],
    features: ["has", "container-queries"], related: [], supersedes: [], superseded_by: null,
    first_seen: day(-400), last_reviewed: day(-400),
    history: [{ date: day(-400), event: "created", data: {} }, { date: day(-1), event: "status_change", data: { from: "contested", to: "emerging", note: "Opposition faded." } }, { date: day(-1), event: "owner_note", data: { note: "Checked in Safari." } }],
    epochs: [{ period: "2025-Q3", summary: "Three expert articles added; verdict unchanged." }],
    sources: [{ url: "https://developer.mozilla.org/en-US/docs/Web/CSS/:has", title: ":has() - MDN", tier: "normative", retrieved: day(-400) }],
    body: body("The :has() pseudo-class matches an element when any relative selector passed to it matches.", "Evidence written by hand, not in the pipeline format.\n\n- Something the owner noticed"),
  },
  {
    id: "cascade-layers-for-design-systems",
    title: "Use cascade layers to order design-system styles",
    verdict: "Wrap reset, base, components and utilities in @layer so specificity wars end.",
    status: "contested", confidence: "low", origin: "personal", topics: ["css/cascade"],
    applies_when: [], does_not_apply_when: [], features: ["cascade-layers"], related: [], supersedes: ["old-specificity-hacks"], superseded_by: null,
    first_seen: day(-30), last_reviewed: day(-30), history: [{ date: day(-30), event: "created", data: {} }], sources: [],
    body: "## Summary\nLayers order the cascade.\n\n## Your notes\nWorks well with Tailwind.\n\n## Migration\nStart with the reset.",
  },
  {
    id: "old-specificity-hacks",
    title: "Doubling class selectors to win specificity",
    verdict: "Avoid. Use cascade layers instead.",
    status: "deprecated", confidence: "high", origin: "radar", topics: ["css/cascade"],
    applies_when: [], does_not_apply_when: [], features: [], related: [], supersedes: [], superseded_by: "cascade-layers-for-design-systems",
    first_seen: day(-800), last_reviewed: day(-800), history: [{ date: day(-800), event: "created", data: {} }], sources: [], body: "## Summary\nDo not.",
  },
  {
    id: "prefers-reduced-motion-defaults",
    title: "Respect prefers-reduced-motion by default",
    verdict: "Gate non-essential motion behind prefers-reduced-motion: no-preference.",
    status: "established", confidence: "high", origin: "radar", topics: ["accessibility"],
    applies_when: ["Any animation that is not essential"], does_not_apply_when: [], features: ["prefers-reduced-motion"], related: [], supersedes: [], superseded_by: null,
    first_seen: day(-200), last_reviewed: day(-200), history: [{ date: day(-200), event: "created", data: {} }, { date: day(-3), event: "revet_proposed", data: { note: "Re-vetted." } }],
    sources: [{ url: "https://smashingmagazine.com/x", title: "Smashing", tier: "expert" }, { url: "https://example.com/forum", title: "Forum thread", tier: "community" }], body: "## Summary\nReduce motion.",
  },
  {
    id: "future-status-entry",
    title: "An entry with values this UI has never seen",
    verdict: "Unknown values must render as text.",
    status: "speculative", confidence: "very-high", origin: "import", topics: ["ai-tooling/agents"],
    applies_when: [], does_not_apply_when: [], features: ["mystery-feature"], related: [], supersedes: [], superseded_by: null,
    first_seen: day(-10), last_reviewed: day(-10), history: [{ date: day(-10), event: "imported", data: {} }], sources: [], body: "## Summary\nFrom the future.",
  },
];

export const features = {
  "container-queries": { name: "Container queries", baseline: "high", baseline_low_date: "2023-02-14", baseline_high_date: "2025-08-14", spec_urls: ["https://drafts.csswg.org/css-contain-3/"] },
  has: { name: ":has()", baseline: "low", baseline_low_date: "2023-12-19", baseline_high_date: null, spec_urls: ["https://drafts.csswg.org/selectors-4/#relational"] },
  "cascade-layers": { name: "Cascade layers", baseline: "high", baseline_low_date: "2022-03-14", baseline_high_date: "2024-09-14", spec_urls: [] },
  "prefers-reduced-motion": { name: "prefers-reduced-motion", baseline: "high", baseline_low_date: "2020-01-15", baseline_high_date: "2022-07-15", spec_urls: [] },
  "mystery-feature": { name: "Mystery feature", baseline: "maybe", baseline_low_date: null, baseline_high_date: null, spec_urls: [] },
};

export function intervalDays(topic) {
  return DAYS[topics.find((t) => t.id === topic)?.iv ?? "1 year"] ?? 365;
}
export function intervalText(topic) {
  return topics.find((t) => t.id === topic)?.iv ?? "1 year";
}

export const observations = [
  { id: "101", topic: "css/layout", entry_id: "container-queries-for-component-layout", claim: "Container query units scale type to the container.", stance: "supports", kind: "claim", feature_ids: ["container-queries"], strength: 3, first_seen: `${day(-3)}T10:00:00Z`, last_seen: `${day(-1)}T10:00:00Z`, status: "open" },
  { id: "102", topic: "css", entry_id: null, claim: "Anchor positioning ships in all engines.", stance: "informational", kind: "release", feature_ids: [], strength: 1, first_seen: `${day(-2)}T10:00:00Z`, last_seen: `${day(-2)}T10:00:00Z`, status: "open" },
];

export const items = [
  { id: "9001", source_id: "smashing", author_id: "jane", title: "Container queries in practice", url: "https://smashingmagazine.com/cq", published_at: `${day(-4)}T00:00:00Z`, fetched_at: `${day(-3)}T00:00:00Z`, relevance: 0.82, state: "extracted" },
];

export const sources = [
  { id: "smashing", name: "Smashing Magazine", type: "rss", tier: "expert", topics: ["css"], status: "active", cadence: "1 day", url: "https://www.smashingmagazine.com", last_run_at: `${day(0)}T06:00:00Z`, last_success_at: `${day(0)}T06:00:00Z`, last_item_at: `${day(-1)}T00:00:00Z`, consecutive_failures: 0, last_error: null, track_record: { accepted: 3, rejected: 1, acceptance_rate: 0.75 } },
  { id: "broken-feed", name: "Broken feed", type: "rss", tier: "community", topics: [], status: "probation", cadence: "7 days", url: null, last_run_at: `${day(0)}T06:00:00Z`, last_success_at: null, last_item_at: null, consecutive_failures: 4, last_error: "HTTP 404", track_record: { accepted: 0, rejected: 0, acceptance_rate: null } },
  { id: "mdn-blog", name: "MDN Blog", type: "rss", tier: "normative", topics: ["css", "html"], status: "active", cadence: "1 day", url: "https://developer.mozilla.org/en-US/blog/", last_run_at: `${day(0)}T06:00:00Z`, last_success_at: `${day(0)}T06:00:00Z`, last_item_at: null, consecutive_failures: 0, last_error: null, track_record: { accepted: 5, rejected: 0, acceptance_rate: 1 } },
];

export const runs = [
  { id: "r3", job: "collect", status: "succeeded", started_at: `${day(0)}T06:00:00.000Z`, finished_at: `${day(0)}T06:02:10.000Z`, est_cost_usd: 0.0412, duration_ms: 130000, stats: {}, error: null },
  { id: "r2", job: "distill", status: "failed", started_at: `${day(-1)}T06:00:00.000Z`, finished_at: `${day(-1)}T06:00:30.000Z`, est_cost_usd: 1.25, duration_ms: 30000, stats: {}, error: "Anthropic API returned 529" },
];

export const deltas = [
  { id: "d1", kind: "update", entry_id: "has-selector-relational-styling", path: "knowledge/entries/css/has.md", proposed_status: "established", rationale: "Two normative sources and no opposition in 90 days.", score: 4.2, observation_ids: ["101"], pr_number: 31, pr_url: "https://github.com/futurethang/whetstone/pull/31", outcome: "pending", decided_at: null, created_at: `${day(-1)}T00:00:00Z` },
  { id: "d2", kind: "new_entry", entry_id: null, path: "knowledge/entries/css/anchor.md", proposed_status: "emerging", rationale: "Anchor positioning reached Baseline.", score: 2.1, observation_ids: ["102"], pr_number: null, pr_url: null, outcome: "pending", decided_at: null, created_at: `${day(-1)}T00:00:00Z` },
];

export const budget = { currency: "USD", month_to_date: 1.2912, cap: 15, remaining: 13.7088 };
