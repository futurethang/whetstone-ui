import { describe, expect, it } from "vitest";
import { groupDigests, isoWeekLabel } from "@/data/adapters/digests";
import type { Proposal } from "@/data/models";

const prop = (o: Partial<Proposal>): Proposal => ({
  id: Math.random().toString(36), kind: "update", entryId: "x", entryTitle: null, path: "knowledge/entries/css/x.md", proposedStatus: null,
  rationale: "r", score: 1, observationIds: [], prUrl: null, prNumber: null, createdAt: "2026-11-21T21:27:00Z", outcome: "accepted", decidedAt: null, ...o,
});

describe("isoWeekLabel", () => {
  it("matches the pipeline's PR titles", () => {
    expect(isoWeekLabel("2026-11-21T21:27:00Z")).toBe("2026-W47");
    expect(isoWeekLabel("2026-11-15T17:31:00Z")).toBe("2026-W46");
  });
});

describe("groupDigests", () => {
  it("groups by pull request, open digests first, with outcome counts", () => {
    const out = groupDigests([
      prop({ prNumber: 3, createdAt: "2026-11-15T17:31:00Z", decidedAt: "2026-11-15T18:00:00Z" }),
      prop({ prNumber: 31, decidedAt: "2026-11-21T21:33:00Z" }),
      prop({ prNumber: 31, outcome: "rejected", decidedAt: "2026-11-21T21:33:00Z" }),
      prop({ prNumber: 40, outcome: "pending", createdAt: "2026-11-23T07:00:00Z" }),
    ]);
    expect(out.map((g) => [g.prNumber, g.state])).toEqual([[40, "open"], [31, "decided"], [3, "decided"]]);
    expect(out[1]!.counts).toEqual({ accepted: 1, rejected: 1 });
    expect(out[1]!.decidedAt).toBe("2026-11-21T21:33:00Z");
  });
});
