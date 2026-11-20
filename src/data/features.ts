import "server-only";
import { FeatureResponse, FeaturesResponse, type FeatureRow } from "./api-types";
import { apiGet, apiGetOrNull } from "./client";
import { entryContext, toSummary } from "./entries";
import type { EntrySummary, Feature } from "./models";

const toFeature = (f: FeatureRow & { mdn_search?: string | null }): Feature => ({
  id: f.feature_id,
  name: f.name,
  description: f.description ?? null,
  level: f.baseline,
  lowDate: f.baseline_low_date ?? null,
  highDate: f.baseline_high_date ?? null,
  specUrls: f.spec_urls.filter((u) => /^https?:\/\//.test(u)),
  mdnSearch: f.mdn_search ?? null,
});

const FEATURE_ID = /^[a-z0-9][a-z0-9-]*$/;

/** Baseline rows for the given ids, in the given order. Unknown ids are skipped. */
export async function getFeatures(ids: string[]): Promise<Feature[]> {
  const unique = [...new Set(ids)].filter((id) => FEATURE_ID.test(id)).slice(0, 200);
  if (!unique.length) return [];
  const res = await apiGet({ source: "features", path: "features", query: { ids: unique }, schema: FeaturesResponse, tags: ["features"] });
  const byId = new Map(res.features.map((f) => [f.feature_id, toFeature(f)]));
  return unique.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

export async function getFeature(id: string, opts: { lastVisitDay?: string | null } = {}): Promise<{ feature: Feature; entries: EntrySummary[] } | null> {
  if (!FEATURE_ID.test(id) || id.length > 100) return null;
  const [res, ctx] = await Promise.all([
    apiGetOrNull({ source: `feature ${id}`, path: `features/${encodeURIComponent(id)}`, schema: FeatureResponse, tags: ["features", "entries"] }),
    entryContext(opts.lastVisitDay),
  ]);
  // The API also matches names; only an exact id match is this feature's page.
  if (!res || res.feature.feature_id !== id) return null;
  return { feature: toFeature(res.feature), entries: res.entries.map((e) => toSummary(e, ctx)) };
}
