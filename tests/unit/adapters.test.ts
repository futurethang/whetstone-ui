import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bodySections } from "@/data/adapters/body-sections";
import { evidenceLines, parseEvidenceLine } from "@/data/adapters/evidence-lines";
import { eventLabel } from "@/data/adapters/history";
import { staleness } from "@/data/adapters/staleness";
import { supportRollup } from "@/data/adapters/support-rollup";
import { topicTree, withImpliedParents } from "@/data/adapters/topic-tree";
import { verdictLead } from "@/data/adapters/verdict";
import { isoWeekStart, latestPerEntry } from "@/data/changes";
import type { ChangeEvent, Topic } from "@/data/models";

describe("evidence lines", () => {
  const fixture = readFileSync(join(__dirname, "../fixtures/evidence-lines.md"), "utf8").replace(/^## Evidence\n/, "");

  it("parses the three real pipeline lines", () => {
    const items = evidenceLines(fixture);
    const parsed = items.filter((i) => i.kind === "parsed");
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({
      kind: "parsed",
      date: "2026-11-05",
      tier: "expert",
      source: "CSS-Tricks",
      claim: "Container-type inline-size with cqi units in clamp() scales type to its container rather than the viewport, avoiding component-specific media queries.",
      url: "https://css-tricks.com/taming-typography-modern-css-reset",
    });
    expect(parsed[2]).toMatchObject({ tier: "normative", source: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@layer" });
  });

  it("returns malformed lines as raw, so they render as markdown", () => {
    const raw = evidenceLines(fixture).filter((i) => i.kind === "raw");
    expect(raw.map((r) => (r as { raw: string }).raw)).toEqual(["- Owner aside: saw this break in Safari 17 on a client project, no link.", "- 2026-11 · expert · Missing day and link"]);
  });

  it("keeps ' · ' inside a claim", () => {
    const p = parseEvidenceLine("- 2026-01-02 · community · Blog · A claim · with a separator · [link](https://a.test/x)");
    expect(p).toMatchObject({ kind: "parsed", source: "Blog", claim: "A claim · with a separator" });
  });

  it("rejects non-http links", () => {
    expect(parseEvidenceLine("- 2026-01-02 · expert · X · Claim · [link](javascript:alert(1))").kind).toBe("raw");
  });
});

describe("body sections", () => {
  it("orders known sections, drops comments and empty sections, keeps others after", () => {
    const body = "<!-- start -->\n## Evidence\n- a\n## Migration\nStep\n## Summary\nS\n\n## Owner notes\n<!-- never edits -->\n## Arguments\n### For\n- x\n```\n## not a heading\n```";
    const s = bodySections(body);
    expect(s.map((x) => x.key)).toEqual(["summary", "arguments", "evidence", "other"]);
    expect(s[3]).toMatchObject({ title: "Migration", anchor: "section-migration" });
    expect(s[1]!.markdown).toContain("## not a heading");
  });

  it("maps Owner notes and Your notes to the notes section", () => {
    expect(bodySections("## Your notes\nhi")[0]).toMatchObject({ key: "notes", title: "Your notes", anchor: "notes" });
    expect(bodySections("## Owner notes\nhi")[0]!.key).toBe("notes");
  });
});

describe("support rollup", () => {
  const f = (featureId: string, level: string, lowDate: string | null = null, highDate: string | null = null) => ({ featureId, level, lowDate, highDate });
  it("takes the weakest level and reports mixed support", () => {
    expect(supportRollup([f("a", "high", "2020-01-01", "2022-07-01"), f("b", "low", "2025-03-01"), f("c", "high")])).toEqual({ level: "low", since: "2025-03-01", weakestCount: 1, total: 3, mixed: true });
    expect(supportRollup([f("a", "high", "2020-01-01", "2022-07-01")])).toMatchObject({ level: "high", since: "2022-07-01", mixed: false });
    expect(supportRollup([])).toBeNull();
  });
  it("treats an unknown level as weakest so it is never hidden", () => {
    expect(supportRollup([f("a", "false"), f("b", "maybe")])!.level).toBe("maybe");
  });
});

describe("staleness", () => {
  it("computes the due date and days overdue", () => {
    expect(staleness({ stale: true, lastReviewed: "2025-01-01", intervalDays: 365, today: "2026-01-11" })).toEqual({ stale: true, dueDate: "2026-01-01", overdueDays: 10 });
    expect(staleness({ stale: false, lastReviewed: "2026-01-01", intervalDays: undefined, today: "2026-02-01" })).toEqual({ stale: false, dueDate: "2027-01-01", overdueDays: 0 });
  });
});

describe("topic tree", () => {
  const t = (id: string): Topic => ({ id, label: id, parentId: id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : null, depth: id.split("/").length - 1, entryCount: 0, staleCount: 0, countsByStatus: {}, reviewIntervalDays: 90, implied: false });
  it("adds implied parents for orphan subtopics", () => {
    const all = withImpliedParents([t("css"), t("css/layout"), t("ai-tooling/agents")]);
    expect(all.map((x) => [x.id, x.implied])).toEqual([["ai-tooling", true], ["ai-tooling/agents", false], ["css", false], ["css/layout", false]]);
    const tree = topicTree(all);
    expect(tree.map((n) => [n.id, n.children.map((c) => c.id)])).toEqual([["ai-tooling", ["ai-tooling/agents"]], ["css", ["css/layout"]]]);
  });
});

describe("changes", () => {
  const ev = (entryId: string, date: string): ChangeEvent => ({ entryId, entryTitle: entryId, entryTopic: null, date, kind: "updated", label: "Updated", from: null, to: null, note: null });
  it("keeps the latest event per entry and counts the rest", () => {
    expect(latestPerEntry([ev("a", "2026-11-10"), ev("b", "2026-11-09"), ev("a", "2026-11-08"), ev("a", "2026-11-01")]).map((c) => [c.entryId, c.date, c.more])).toEqual([["a", "2026-11-10", 2], ["b", "2026-11-09", 0]]);
  });
  it("finds the Monday of the ISO week", () => {
    expect(isoWeekStart("2026-11-15")).toBe("2026-11-09"); // Sunday
    expect(isoWeekStart("2026-11-09")).toBe("2026-11-09"); // Monday
  });
});

describe("labels", () => {
  it("labels known and unknown history events", () => {
    expect(eventLabel("status_change")).toBe("Status change");
    expect(eventLabel("revet_proposed")).toBe("Re-vetted");
    expect(eventLabel("verdict_reworded")).toBe("Verdict reworded");
  });
  it("takes the verdict's first sentence", () => {
    expect(verdictLead("Use :has(). Prefer it over JavaScript.")).toBe("Use :has().");
    expect(verdictLead("Use e.g. cqi units in clamp() for type.")).toBe("Use e.g. cqi units in clamp() for type.");
  });
});
