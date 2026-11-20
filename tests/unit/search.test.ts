import { describe, expect, it } from "vitest";
import { facetCounts, filterEntries, parseSearchParams, sortEntries } from "@/data/adapters/facets";
import type { EntrySummary, Topic } from "@/data/models";
import { activeChips, clearFiltersHref, searchHref } from "@/lib/search-url";

const entry = (id: string, over: Partial<EntrySummary> = {}): EntrySummary => ({
  id, slug: id, title: id, verdict: "", verdictLead: "", status: "established", confidence: "high", origin: "radar", topics: ["css/layout"], primaryTopic: "css/layout",
  appliesWhen: [], doesNotApplyWhen: [], features: [], support: [], supportRollup: null, staleness: { stale: false, dueDate: "2027-01-01", overdueDays: 0 },
  lastReviewed: "2026-01-01", firstSeen: "2026-01-01", updatedAt: "2026-01-01", related: [], supersedes: [], supersededBy: null, curation: "default", update: null, ...over,
});
const topic = (id: string): Topic => ({ id, label: id.split("/").pop()!, parentId: id.includes("/") ? id.split("/")[0]! : null, depth: id.split("/").length - 1, entryCount: 0, staleCount: 0, countsByStatus: {}, reviewIntervalDays: 365, implied: false });

const entries = [
  entry("a", { status: "established", confidence: "high", updatedAt: "2026-11-10" }),
  entry("b", { status: "emerging", confidence: "low", topics: ["html"], staleness: { stale: true, dueDate: "2026-01-01", overdueDays: 300 } }),
  entry("c", { status: "emerging", confidence: "high", staleness: { stale: true, dueDate: "2026-06-01", overdueDays: 100 } }),
  entry("d", { status: "speculative", confidence: "medium", origin: "personal" }),
];
const ctx = { lastVisitDay: "2026-11-01", today: "2026-11-15", scores: null };

describe("search params", () => {
  it("parses repeated and comma values, drops unknown ones, picks the default sort", () => {
    const p = parseSearchParams({ status: ["emerging", "bogus"], confidence: "low,high", topic: "css/layout", stale: "1", changed: "7d", page: "2" });
    expect(p).toMatchObject({ q: "", status: ["emerging"], confidence: ["low", "high"], topic: ["css/layout"], stale: true, changed: "7d", sort: "changed", page: 2 });
    expect(parseSearchParams({ q: "has", sort: "nope" }).sort).toBe("relevance");
    expect(parseSearchParams({ sort: "relevance" }).sort).toBe("changed");
    expect(parseSearchParams({ topic: "../etc", page: "-3" })).toMatchObject({ topic: [], page: 1 });
  });

  it("round-trips: parsing a built URL reproduces the same params", () => {
    const p = parseSearchParams({ q: "container queries", status: ["emerging", "established"], support: "low", stale: "1", changed: "30d", sort: "title", page: "3" });
    const url = new URL(searchHref(p), "https://x.test");
    const raw: Record<string, string[]> = {};
    url.searchParams.forEach((v, k) => (raw[k] ??= []).push(v));
    expect(parseSearchParams(raw)).toEqual(p);
    expect(searchHref(parseSearchParams({}))).toBe("/search");
  });
});

describe("filtering and facets", () => {
  it("filters by every group, with topic including descendants", () => {
    const p = parseSearchParams({ status: "emerging", topic: "css" });
    expect(filterEntries(entries, p, ctx).map((e) => e.id)).toEqual(["c"]);
    expect(filterEntries(entries, parseSearchParams({ changed: "last" }), ctx).map((e) => e.id)).toEqual(["a"]);
    expect(filterEntries(entries, parseSearchParams({ stale: "1" }), ctx).map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("counts each group as if its own selection were cleared", () => {
    const p = parseSearchParams({ status: "emerging", confidence: "high" });
    const f = facetCounts(entries, p, ctx, [topic("css"), topic("css/layout"), topic("html")]);
    // status counts ignore the status selection but respect confidence=high: a (established), c (emerging)
    expect(Object.fromEntries(f.status.map((o) => [o.value, o.count]))).toEqual({ established: 1, emerging: 1, contested: 0, deprecated: 0 });
    // confidence counts ignore confidence but respect status=emerging: b (low), c (high)
    expect(Object.fromEntries(f.confidence.map((o) => [o.value, o.count]))).toEqual({ high: 1, medium: 0, low: 1 });
    expect(f.status.find((o) => o.value === "emerging")!.selected).toBe(true);
    expect(f.topic.map((o) => [o.value, o.count])).toEqual([["css", 1], ["css/layout", 1]]);
  });

  it("sorts by overdue, title and relevance", () => {
    expect(sortEntries(entries, "overdue", null).map((e) => e.id).slice(0, 2)).toEqual(["b", "c"]);
    expect(sortEntries(entries, "title", null).map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
    expect(sortEntries(entries, "relevance", new Map([["d", 0.9], ["a", 0.1]])).map((e) => e.id).slice(0, 2)).toEqual(["d", "a"]);
  });
});

describe("chips", () => {
  it("removes one value per chip and resets the page", () => {
    const p = parseSearchParams({ q: "x", status: ["emerging", "established"], stale: "1", page: "4" });
    const chips = activeChips(p, (_g, v) => v);
    expect(chips.map((c) => c.label)).toEqual(["Status: emerging", "Status: established", "Stale only"]);
    expect(chips[0]!.href).toBe("/search?q=x&status=established&stale=1");
    expect(clearFiltersHref(p)).toBe("/search?q=x");
  });
});
