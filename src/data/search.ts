import "server-only";
import { SearchResponse } from "./api-types";
import { apiGet } from "./client";
import { PAGE_SIZE, facetCounts, filterEntries, parseSearchParams, sortEntries } from "./adapters/facets";
import { listEntries } from "./entries";
import type { SearchOutcome, SearchParams } from "./models";
import { getTopics } from "./topics";

export { parseSearchParams, PAGE_SIZE };

/**
 * Filtering, sorting and facet counts run on the server over all entry summaries (adapters/facets.ts).
 * With a query, the API's hybrid search supplies ranked ids, intersected with the filtered set.
 * Moving any of this into the API later changes only this module.
 */
export async function searchEntries(params: SearchParams, opts: { lastVisitDay?: string | null } = {}): Promise<SearchOutcome> {
  const topicsP = getTopics();
  const [entries, topics, hits] = await Promise.all([
    listEntries({ lastVisitDay: opts.lastVisitDay, topics: topicsP }),
    topicsP,
    params.q ? apiGet({ source: "search", path: "search", query: { q: params.q, limit: 50 }, schema: SearchResponse, tags: ["entries"] }) : null,
  ]);
  const scores = hits ? new Map(hits.results.map((r, i) => [r.id, r.score ?? 1 / (i + 1)])) : null;
  const ctx = { lastVisitDay: opts.lastVisitDay ?? null, scores };
  const filtered = sortEntries(filterEntries(entries, params, ctx), params.sort, scores);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  return {
    params: { ...params, page },
    results: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => ({ entry, score: scores?.get(entry.id) ?? null })),
    total: filtered.length,
    page,
    pageCount,
    facets: facetCounts(entries, params, ctx, topics),
  };
}
