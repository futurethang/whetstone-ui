import { describe, expect, it } from "vitest";
import { adviceForError, classifyHealth } from "@/data/adapters/source-health";

const now = new Date("2026-11-21T12:00:00Z");
const base = { type: "rss", consecutiveFailures: 0, lastSuccessAt: "2026-11-21T06:00:00Z", lastItemAt: "2026-11-18T00:00:00Z", lastError: null };

describe("classifyHealth", () => {
  it("failing beats everything and carries advice for the error", () => {
    const r = classifyHealth({ ...base, consecutiveFailures: 8, lastSuccessAt: null, lastError: "no feed discovered at site" }, now);
    expect(r.health).toBe("broken");
    expect(r.advice).toContain("explicit feed");
  });
  it("a source that succeeded but never produced an article is quiet", () => {
    expect(classifyHealth({ ...base, lastItemAt: null }, now).health).toBe("quiet");
  });
  it("an old newest article is quiet; a recent one is healthy", () => {
    expect(classifyHealth({ ...base, lastItemAt: "2026-03-06T00:00:00Z" }, now)).toMatchObject({ health: "quiet" });
    expect(classifyHealth(base, now)).toEqual({ health: "ok", advice: null });
  });
  it("never fetched without failures is 'never'; web-features is exempt", () => {
    expect(classifyHealth({ ...base, lastSuccessAt: null, lastItemAt: null }, now).health).toBe("never");
    expect(classifyHealth({ ...base, type: "web-features", lastSuccessAt: null, lastItemAt: null }, now).health).toBe("ok");
  });
});

describe("adviceForError", () => {
  it("covers the failures seen in production", () => {
    expect(adviceForError("response too large")).toContain("size limit");
    expect(adviceForError("too many redirects")).toContain("final URL");
    expect(adviceForError("HTTP 404")).toContain("no longer exists");
    expect(adviceForError(null)).toContain("Actions log");
  });
});
