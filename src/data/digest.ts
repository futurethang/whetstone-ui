import "server-only";
import { DeltasResponse } from "./api-types";
import { REVALIDATE_FAST, apiGet } from "./client";
import { listEntries } from "./entries";
import type { EntrySummary, Proposal } from "./models";

/** Pending digest proposals, highest score first. Read-only in V1. `entries` shares a list another call requested. */
export async function getPendingProposals(entries?: Promise<EntrySummary[]>): Promise<Proposal[]> {
  const [res, list] = await Promise.all([
    apiGet({ source: "digest", path: "deltas", query: { outcome: "pending", limit: 200 }, schema: DeltasResponse, tags: ["digest"], revalidate: REVALIDATE_FAST }),
    entries ?? listEntries(),
  ]);
  const titles = new Map(list.map((e) => [e.id, e.title]));
  return res.deltas
    .map((d) => ({
      id: d.id,
      kind: d.kind,
      entryId: d.entry_id,
      entryTitle: d.entry_id ? (titles.get(d.entry_id) ?? null) : null,
      path: d.path,
      proposedStatus: d.proposed_status,
      rationale: d.rationale,
      score: d.score,
      observationIds: d.observation_ids,
      prUrl: d.pr_url && /^https:\/\/github\.com\//.test(d.pr_url) ? d.pr_url : null,
      prNumber: d.pr_number,
      createdAt: d.created_at,
    }))
    .sort((a, b) => b.score - a.score);
}
