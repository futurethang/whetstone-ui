// Stand-in for the data API (futurethang/whetstone /api/v1), used by the Playwright tests.
import { createServer } from "node:http";
import * as F from "./fixtures.mjs";

const TOKEN = process.env.MOCK_API_TOKEN ?? "test-api-token";
const PORT = Number(process.env.MOCK_API_PORT ?? 4010);
// Optional latency (ms) per call, to model the deployed data API; /search adds the embedding call on top.
const LATENCY = Number(process.env.MOCK_API_LATENCY_MS ?? 0);
const SEARCH_LATENCY = Number(process.env.MOCK_API_SEARCH_LATENCY_MS ?? 0);
// Optional copies of every entry in /entries (ids suffixed -c1, -c2…), to measure rendering at a realistic size.
const SCALE = Number(process.env.MOCK_API_ENTRY_COPIES ?? 0);
const calls = new Map();
const now = () => new Date().toISOString();
const env = (body, knowledge = false) => ({ schema: 1, ...body, ...(knowledge ? { precedence_notice: F.precedence } : {}), generated_at: now() });

function supportOf(e) {
  return e.features.map((f) => {
    const x = F.features[f];
    return x ? { feature_id: f, baseline: x.baseline, ...(x.baseline_low_date ? { low_date: x.baseline_low_date } : {}), ...(x.baseline_high_date ? { high_date: x.baseline_high_date } : {}) } : { feature_id: f, baseline: "false" };
  });
}
function stale(e) {
  return (Date.now() - Date.parse(e.last_reviewed)) / 864e5 > F.intervalDays(e.topics[0]);
}
function result(e) {
  return { id: e.id, title: e.title, verdict: e.verdict, status: e.status, confidence: e.confidence, topics: e.topics, applies_when: e.applies_when, does_not_apply_when: e.does_not_apply_when, support: supportOf(e), last_reviewed: e.last_reviewed, stale: stale(e), origin: e.origin, trust: "vetted", url: "", git_url: "" };
}
function summary(e) {
  const dates = e.history.map((h) => h.date).sort();
  return { ...result(e), features: e.features, related: e.related, supersedes: e.supersedes, superseded_by: e.superseded_by, first_seen: e.first_seen, updated_at: dates.at(-1) ?? e.first_seen };
}
const featureRow = (id) => ({ feature_id: id, description: null, dataset_version: "3", ...F.features[id] });

const routes = [
  [/^\/api\/v1\/topics$/, () => env({ topics: F.topics.map((t) => {
    const mine = F.entries.filter((e) => e.topics.includes(t.id));
    const by = (s) => mine.filter((e) => e.status === s).length;
    return { id: t.id, parent: t.id.includes("/") ? t.id.slice(0, t.id.lastIndexOf("/")) : null, review_interval: t.iv, review_interval_days: F.intervalDays(t.id), entries: mine.length, by_status: { emerging: by("emerging"), contested: by("contested"), established: by("established"), deprecated: by("deprecated") }, stale: mine.filter((e) => e.topics[0] === t.id && stale(e)).length };
  }) }, true)],
  [/^\/api\/v1\/entries$/, () => env({ entries: [...F.entries.map(summary), ...Array.from({ length: SCALE }, (_, i) => F.entries.map((e) => ({ ...summary(e), id: `${e.id}-c${i + 1}` }))).flat()] }, true)],
  [/^\/api\/v1\/entries\/([a-z0-9-]+)$/, (m) => {
    const e = F.entries.find((x) => x.id === m[1]);
    if (!e) return [404, { error: "not found" }];
    return env({ entry: { ...result(e), body_md: e.body, sources: e.sources, related: e.related, supersedes: e.supersedes, superseded_by: e.superseded_by, first_seen: e.first_seen, features: e.features, history: e.history.map((h) => ({ ...h, is_epoch: false })), epochs: e.epochs ?? [] } }, true);
  }],
  [/^\/api\/v1\/search$/, (_m, q) => {
    const terms = (q.get("q") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const hits = F.entries.map((e) => ({ e, s: terms.filter((t) => `${e.title} ${e.verdict}`.toLowerCase().includes(t)).length })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    return env({ results: hits.slice(0, Number(q.get("limit") ?? 5)).map((x, i) => ({ ...result(x.e), score: 1 / (60 + i + 1) })) }, true);
  }],
  [/^\/api\/v1\/changes$/, (_m, q) => {
    const since = q.get("since") ?? "1970-01-01";
    const until = q.get("until");
    const changes = F.entries.flatMap((e) => e.history.map((h) => ({ entry_id: e.id, date: h.date, event: h.event, note: h.data.note ?? null, from: h.data.from ?? null, to: h.data.to ?? null })))
      .filter((c) => c.date >= since && (!until || c.date < until)).sort((a, b) => b.date.localeCompare(a.date));
    return env({ since, ...(until ? { until } : {}), has_more: false, changes, results: [] }, true);
  }],
  [/^\/api\/v1\/features$/, (_m, q) => {
    const ids = (q.get("ids") ?? "").split(",").filter(Boolean);
    return env({ features: ids.filter((id) => F.features[id]).map(featureRow), missing: ids.filter((id) => !F.features[id]) });
  }],
  [/^\/api\/v1\/features\/([^/]+)$/, (m) => {
    const id = decodeURIComponent(m[1]);
    if (!F.features[id]) return [404, { error: "not found" }];
    return env({ feature: { ...featureRow(id), mdn_search: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(F.features[id].name)}` }, other_matches: [], entries: F.entries.filter((e) => e.features.includes(id)).map(result) }, true);
  }],
  [/^\/api\/v1\/observations$/, (_m, q) => {
    const t = q.get("topic");
    const list = F.observations.filter((o) => !t || o.topic === t || o.topic.startsWith(`${t}/`));
    return env({ trust: "unreviewed", observations: list.slice(0, Number(q.get("limit") ?? 20)) });
  }],
  [/^\/api\/v1\/observations\/(\d+)$/, (m) => {
    const o = F.observations.find((x) => x.id === m[1]);
    if (!o) return [404, { error: "not found" }];
    return env({ trust: "unreviewed", observation: { ...o, consumed_by_delta: null, citations: [{ url: "https://smashingmagazine.com/cq", raw_item_id: "9001", source_id: "smashing", source_name: "Smashing Magazine", author_id: "jane", author_name: "Jane Doe", tier: "expert", published_at: o.first_seen }] } });
  }],
  [/^\/api\/v1\/items\/(\d+)$/, (m) => {
    const i = F.items.find((x) => x.id === m[1]);
    if (!i) return [404, { error: "not found" }];
    return env({ trust: "unreviewed", item: { ...i, source_name: "Smashing Magazine", source_tier: "expert", author_name: "Jane Doe", observations: [F.observations[0]] } });
  }],
  [/^\/api\/v1\/deltas$/, (_m, q) => env({ trust: "unreviewed", deltas: F.deltas.filter((d) => !q.get("outcome") || q.get("outcome").split(",").includes(d.outcome)) })],
  [/^\/api\/v1\/sources$/, () => env({ sources: F.sources })],
  [/^\/api\/v1\/sources\/([a-z0-9-]+)$/, (m) => {
    const s = F.sources.find((x) => x.id === m[1]);
    if (!s) return [404, { error: "not found" }];
    return env({ source: { ...s, items: F.items.filter((i) => i.source_id === s.id) } });
  }],
  [/^\/api\/v1\/pipeline$/, () => env({
    trust: "unreviewed",
    funnel: { items: { total: 3, by_state: { extracted: 1, discarded: 1, fetched: 1 }, fetched_24h: 2, fetched_7d: 3 }, discard_reasons: { "prefilter: job post": 1 }, observations: { total: 2, by_status: { open: 2 }, open_linked_to_entry: 1, open_unlinked: 1, open_by_stance: { supports: 2 }, open_by_topic: { css: 2 } }, proposals: { pending: 1, accepted: 3 } },
    sources: { active: 2, failing: 1, never_succeeded: 0, total: 2 },
    last_runs: [{ id: "r1", job: "collect", status: "succeeded", started_at: new Date(Date.now() - 3600e3).toISOString(), finished_at: null, est_cost_usd: 0, duration_ms: 1000, stats: { sources: 2, items_new: 3, sources_failed: 1 }, error: null }],
    recent_items: F.items.slice(0, 2).map((i) => ({ ...i, source_name: "Smashing Magazine", reason: null })),
  })],
  [/^\/api\/v1\/runs$/, () => env({ runs: F.runs })],
  [/^\/api\/v1\/budget$/, () => env({ budget: { ...F.budget, month_start: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString() } })],
];

createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (url.pathname === "/health") return send(200, { ok: true });
  // Call counts per path since the last /stats?reset=1, for measuring each page's fan-out.
  if (url.pathname === "/stats") {
    const out = Object.fromEntries(calls);
    if (url.searchParams.get("reset")) calls.clear();
    return send(200, out);
  }
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { error: "unauthorized" });
  calls.set(url.pathname, (calls.get(url.pathname) ?? 0) + 1);
  // A source whose id starts with "slow-e2e-" answers 404 after 4 s: a slow navigation for the loading-UI tests.
  if (/^\/api\/v1\/sources\/slow-e2e-/.test(url.pathname)) return void setTimeout(() => send(404, { error: "not found" }), 4000);
  const delay = LATENCY + (url.pathname === "/api/v1/search" ? SEARCH_LATENCY : 0);
  if (delay > 0) return void setTimeout(() => route(url, send), delay);
  route(url, send);
}).listen(PORT, "127.0.0.1", () => console.log(`mock data API on http://127.0.0.1:${PORT}`));

function route(url, send) {
  for (const [re, fn] of routes) {
    const m = re.exec(url.pathname);
    if (!m) continue;
    const out = fn(m, url.searchParams);
    return Array.isArray(out) ? send(out[0], out[1]) : send(200, out);
  }
  return send(404, { error: "not found" });
}
