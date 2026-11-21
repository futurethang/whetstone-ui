import type { Digest, Proposal } from "../models";

/** ISO week label, "2026-W47", matching the pipeline's digest PR titles. */
export function isoWeekLabel(iso: string): string {
  const d = new Date(iso);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const start = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - start) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Groups proposals by the digest pull request they were sent in. Open digests first, then newest. */
export function groupDigests(proposals: Proposal[]): Digest[] {
  const byPr = new Map<string, Proposal[]>();
  for (const p of proposals) {
    const k = p.prNumber === null ? "unsent" : String(p.prNumber);
    byPr.set(k, [...(byPr.get(k) ?? []), p]);
  }
  const digests: Digest[] = [...byPr.entries()].map(([k, list]) => {
    const created = list.map((p) => p.createdAt).sort()[0]!;
    const pending = list.some((p) => p.outcome === "pending");
    const decided = list.map((p) => p.decidedAt).filter((x): x is string => !!x).sort().at(-1) ?? null;
    const counts: Record<string, number> = {};
    for (const p of list) counts[p.outcome] = (counts[p.outcome] ?? 0) + 1;
    return {
      prNumber: k === "unsent" ? null : Number(k),
      prUrl: list.find((p) => p.prUrl)?.prUrl ?? null,
      week: isoWeekLabel(created),
      state: k === "unsent" ? "unsent" : pending ? "open" : "decided",
      createdAt: created,
      decidedAt: pending ? null : decided,
      proposals: [...list].sort((a, b) => b.score - a.score),
      counts,
    };
  });
  const rank = { open: 0, unsent: 1, decided: 2 } as const;
  return digests.sort((a, b) => rank[a.state] - rank[b.state] || b.createdAt.localeCompare(a.createdAt));
}
