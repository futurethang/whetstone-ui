import { describe, expect, it } from "vitest";
import { JOBS, summarizeRun } from "@/data/adapters/run-summary";

describe("summarizeRun", () => {
  it("explains a collect run that found nothing due", () => {
    expect(summarizeRun("collect", "succeeded", { sources: 0, items_new: 0 }, null)).toBe("No sources were due, so nothing was fetched.");
  });
  it("counts fetched and failed sources", () => {
    expect(summarizeRun("collect", "succeeded", { sources: 50, items_new: 194, sources_failed: 8 }, null)).toBe("Checked 50 sources, found 194 new articles; 8 failed.");
  });
  it("reports extract outcomes", () => {
    expect(summarizeRun("extract", "succeeded", { items: 194, extracted: 64, discarded: 130, failed: 0 }, null)).toBe("Read 194 articles: 64 relevant, 130 discarded.");
  });
  it("names the digest PR, or says none was opened", () => {
    expect(summarizeRun("distill", "succeeded", { candidates: 5, clusters: 14, proposed: 0, none: 5, pr: null }, null)).toContain("no PR opened");
    expect(summarizeRun("distill", "succeeded", { candidates: 2, clusters: 1, proposed: 2, none: 0, pr: 31 }, null)).toContain("digest PR #31");
  });
  it("shows the error of a failed run and tolerates missing stats", () => {
    expect(summarizeRun("extract", "failed", {}, "401 unauthorized")).toBe("Failed: 401 unauthorized");
    expect(summarizeRun("sync", "succeeded", {}, null)).toBe("Mirrored 0 entries and 0 sources.");
  });
  it("every job is tied to a workflow file name", () => {
    for (const j of Object.values(JOBS)) expect(j.workflow).toMatch(/^[a-z-]+$/);
  });
});
